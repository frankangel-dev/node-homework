const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");
const { StatusCodes } = require("http-status-codes");
const { OAuth2Client } = require("google-auth-library");
const scrypt = util.promisify(crypto.scrypt);
const GOOGLE_SIGN_IN = "google-oauth-account-no-password";

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  const payload = {
    id: user.id,
    roles: user.roles,
    csrfToken: crypto.randomUUID(),
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 });
  return payload.csrfToken;
};

function parseRoles(roles) {
  return (roles || "").split(",").map((role) => role.trim()).filter(Boolean);
};

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

async function createUserWithWelcomeTasks(value) {
  return await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: value,
      select: { name: true, email: true, roles: true, id: true },
    });

    const welcomeTaskData = [
      {
        title: "Complete your profile",
        userId: newUser.id,
        priority: "medium",
      },
      {
        title: "Add your first task",
        userId: newUser.id,
        priority: "high",
      },
      {
        title: "Explore the app",
        userId: newUser.id,
        priority: "low",
      },
    ];

    await tx.task.createMany({ data: welcomeTaskData });

    const welcomeTasks = await tx.task.findMany({
      where: {
        userId: newUser.id,
        title: { in: welcomeTaskData.map((t) => t.title) },
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        userId: true,
        priority: true,
      },
    });

    return { user: newUser, welcomeTasks };
  });
}

async function register(req, res, next) {
  if (!req.body) req.body = {};

  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    try {
      const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          body: params.toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        isPerson = true;
      }
    } catch (e) {
      return next(e);
    }
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    // might be a test environment
    isPerson = true;
  }
  if (!isPerson) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Bot verification failed. Please complete the reCAPTCHA.",
    });
  }

  delete req.body.recaptchaToken;

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  value.hashedPassword = await hashPassword(value.password);
  delete value.password;

  try {
    const newUser = await createUserWithWelcomeTasks(value);

    const csrfToken = setJwtCookie(req, res, newUser.user);

    res.status(201).json({
      user: newUser.user,
      welcomeTasks: newUser.welcomeTasks,
      transactionStatus: "success",
      csrfToken,
    });
  } catch (e) {
    if (e.name === "PrismaClientKnownRequestError" && e.code === "P2002") {
      return res.status(400).json({
        error: "Email already registered",
      });
    }
    return next(e);
  }
}

async function googleLogon(req, res, next) {
  let { authorizationCode } = req.body;

  if (!authorizationCode) {
    return res.status(400).json({
      message: "Validation failed",
    });
  }

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "postmessage",
  );

  try {
    const { tokens } = await client.getToken(authorizationCode);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();

    let user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
    

    if (!user) {
      const value = {
        name,
        email: email.toLowerCase(),
        hashedPassword: GOOGLE_SIGN_IN,
      };

      const createUser = await createUserWithWelcomeTasks(value);
      user = createUser.user;
    }

    const csrfToken = setJwtCookie(req, res, user);

    res.status(200).json({
      name: user.name,
      roles: parseRoles(user.roles),
      csrfToken,
    });
  } catch (e) {
    if (e?.message?.includes("invalid_grant")) {
      return res.status(401).json({
        message: "Google sign-in failed.",
      });
    }
    return next(e);
  }
}

async function logon(req, res) {
  let { email, password } = req.body;
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return res.status(401).json({
      message: "Authentication failed",
    });
  }

  if (user.hashedPassword === GOOGLE_SIGN_IN) {
    return res.status(401).json({
      message: "This account uses Google sign-in. Please continue with Google."
    });
  }
  const goodCredentials = await comparePassword(password, user.hashedPassword);

  if (!goodCredentials) {
    return res.status(401).json({
      message: "Invalid password",
    });
  }

  const csrfToken = setJwtCookie(req, res, user);

  res.status(200).json({
    name: user.name,
    email: user.email,
    roles: parseRoles(user.roles),
    csrfToken,
  });
}

function logoff(req, res) {
  res.clearCookie("jwt", cookieFlags(req));
  res.sendStatus(200);
}

module.exports = {
  register,
  googleLogon,
  logon,
  logoff,
};
