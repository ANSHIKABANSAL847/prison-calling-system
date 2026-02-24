const { verifyAccessToken } = require("../utils/tokens");

/**
 * Middleware: Authenticate JWT from HTTP-only cookie
 */
function authenticate(req, res, next) {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token expired or invalid" });
  }
}

/**
 * Middleware: Role-based access control
 * Usage: authorize("Admin") or authorize("Admin", "Jailer")
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient role" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
