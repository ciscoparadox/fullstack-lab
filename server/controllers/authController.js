// server/controllers/authController.js
const userRepo = require("../db/userRepo");
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

    // Validate input
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const emailLower = email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user already exists
    const existing = await userRepo.findByEmail(emailLower);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password using authService
    const passwordHash = await authService.hashPassword(password);

    // Create user
    const user = await userRepo.createUser({
      email: emailLower,
      passwordHash,
    });

    // Generate token
    const token = authService.generateToken({
      id: user.id,
      email: user.email,
    });

    logger.info("[Auth] User registered", {
      userId: user.id,
      email: user.email,
    });

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
    logger.error("[Auth] Registration error", { error: err.message });
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

    // Validate input
    if (!email || !password) {
      return res.status(401).json({
        error: "Email and password are required",
      });
    }

    const emailLower = email.trim().toLowerCase();

    // Find user by email
    const user = await userRepo.findByEmail(emailLower);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password using authService
    const isValid = await authService.comparePassword(
      password,
      user.password_hash
    );
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate token
    const token = authService.generateToken({
      id: user.id,
      email: user.email,
    });

    logger.info("[Auth] User logged in", {
      userId: user.id,
      email: user.email,
    });

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
    logger.error("[Auth] Login error", { error: err.message });
    next(err);
  }
}

module.exports = {
  register,
  login,
};

