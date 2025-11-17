// server/middleware/auth.js
const authService = require("../services/authService");
const logger = require("../utils/logger");

/**
 * Middleware to verify JWT token and attach user to request
 * Expects Authorization header: "Bearer <token>"
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract token from "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded; // Attach user payload to request
    next();
  } catch (err) {
    logger.warn("[Auth Middleware] Token verification failed", {
      error: err.message,
    });
    return res.status(403).json({ error: err.message });
  }
}

module.exports = { authenticateToken };
