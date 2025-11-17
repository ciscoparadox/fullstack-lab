// server/services/userService.js
const bcrypt = require("bcrypt");
const userRepo = require("../db/userRepo");

const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} params - { email, password }
 * @returns {Promise<Object>} Created user { id, email, created_at }
 * @throws {Error} Descriptive error if validation fails or email exists
 */
async function registerUser({ email, password }) {
  // Validate input
  if (!email || !email.trim()) {
    throw new Error("Email is required");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const emailLower = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    throw new Error("Invalid email format");
  }

  // Check if user already exists
  const existing = await userRepo.findByEmail(emailLower);
  if (existing) {
    throw new Error("Email already registered");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await userRepo.createUser({
    email: emailLower,
    passwordHash,
  });

  return user;
}

/**
 * Verify user credentials
 * @param {Object} params - { email, password }
 * @returns {Promise<Object>} User object { id, email, created_at }
 * @throws {Error} If credentials are invalid
 */
async function verifyCredentials({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const emailLower = email.trim().toLowerCase();

  // Find user by email
  const user = await userRepo.findByEmail(emailLower);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // Return user without password hash
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  registerUser,
  verifyCredentials,
};
