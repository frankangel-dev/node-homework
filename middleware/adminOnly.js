module.exports = (req, res, next) => {
  const granted = (req.user?.roles || "").split(",").map((role) => role.trim());

  if (!granted.includes("admin")) {
    return res.status(401).json({
      message: "You are not authorized to access this",
    });
  }
  
  next();
};
