// server/db/userRepo.js
const { pool } = require("./pool");

/**
 * Create a new user in the database
 * @param {Object} userData - { email, passwordHash }
 * @returns {Promise<Object>} Created user object { id, email, created_at }
 */
async function createUser({ email, passwordHash }) {
  if (!pool) {
    throw new Error("Database not configured");
  }

  const query = `
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, created_at
  `;

  try {
    const result = await pool.query(query, [email, passwordHash]);
    return result.rows[0];
  } catch (err) {
    // Check for unique constraint violation (duplicate email)
    if (err.code === "23505") {
      throw new Error("Email already exists");
    }
    throw err;
  }
}

/**
 * Find a user by email
 * @param {string} email
 * @returns {Promise<Object|null>} User object with password_hash or null if not found
 */
async function findByEmail(email) {
  if (!pool) {
    throw new Error("Database not configured");
  }

  const query = `
    SELECT id, email, password_hash, created_at
    FROM users
    WHERE email = $1
  `;

  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

/**
 * Find a user by ID
 * @param {string} id - UUID
 * @returns {Promise<Object|null>} User object (without password_hash) or null if not found
 */
async function getById(id) {
  if (!pool) {
    throw new Error("Database not configured");
  }

  const query = `
    SELECT id, email, created_at
    FROM users
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  findByEmail,
  getById,
};
