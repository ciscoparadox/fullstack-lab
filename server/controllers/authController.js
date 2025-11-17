// server/controllers/authController.js
const userService = require("../services/userService");
const authService = require("../services/authService");
const logger = require("../utils/logger");

/**
 * Register a new user
 * POST /auth/register
 * Body: { email, password }
 */
async function register(req, res, next) {
  try {
    const { email, password } = req.body || {};

    // Register user
    const user = await userService.registerUser({ email, password });

    // Generate token
    const token = authService.generateToken(user);

    logger.info("[Auth] User registered", { userId: user.id, email: user.email });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    // Handle validation/business logic errors
    if (
      err.message.includes("Email") ||
      err.message.includes("Password") ||
      err.message.includes("already registered")
    ) {
      return res.status(400).json({ error: err.message });
    }

    // Pass other errors to error middleware
    next(err);
  }
}

/**
 * Login user
 * POST /auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    // Verify credentials
    const user = await userService.verifyCredentials({ email, password });

    // Generate token
    const token = authService.generateToken(user);

    logger.info("[Auth] User logged in", { userId: user.id, email: user.email });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    // Handle credential validation errors
    if (
      err.message.includes("Email") ||
      err.message.includes("password") ||
      err.message.includes("Invalid")
    ) {
      return res.status(401).json({ error: err.message });
    }

    // Pass other errors to error middleware
    next(err);
  }
}

module.exports = {
  register,
  login,
};
