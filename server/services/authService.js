// server/services/authService.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const config = require("../utils/config");

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt
 * @param {string} plainPassword - The plaintext password
 * @returns {Promise<string>} The hashed password
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash
 * @param {string} plainPassword - The plaintext password
 * @param {string} hash - The bcrypt hash to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Generate a JWT token for a user
 * @param {Object} payload - User object or custom payload { id, email, ... }
 * @param {Object} options - Optional JWT options { expiresIn, ... }
 * @returns {string} Signed JWT token
 * @throws {Error} If token generation fails
 */
function generateToken(payload, options = {}) {
  if (!config.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured in environment");
  }

  const signOptions = {
    expiresIn: options.expiresIn || config.JWT_EXPIRES_IN || "24h",
  };

  try {
    const token = jwt.sign(payload, config.JWT_SECRET, signOptions);
    return token;
  } catch (err) {
    throw new Error(`Token generation failed: ${err.message}`);
  }
}

/**
 * Verify a JWT token and return decoded payload
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  if (!config.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured in environment");
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded;
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (err.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};

