function register(req, res) {
  const {name, email, password} = req.body;
  const newUser = {
    name,
    email,
    password,
  };

  global.users.push(newUser);
  global.user_id = newUser;

  res.status(201).json({
    name: newUser.name,
    email: newUser.email
  });
}

function logon(req, res) {
  const {email, password} = req.body;
  const userMatched = global.users.find(user => user.email === email && user.password === password);

  if (userMatched) {
    global.user_id = userMatched;

    res.status(200).json({
      name: userMatched.name,
      email: userMatched.email
    });
  } else {
    res.sendStatus(401);
  }
}

function logoff(req, res) {
  global.user_id = null;
  res.sendStatus(200);
}

module.exports = {
  register,
  logon,
  logoff,
}