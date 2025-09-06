const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: "Access Denied. No Token Provided." });
  }

  try {
    const jwtToken = token.split(" ")[1];
    const decoded = jwt.verify(jwtToken, "rahulKaPalhaBackend"); // secret key same jo login me use ki thi
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = verifyToken;
