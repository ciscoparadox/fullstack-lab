// server/db/userRepo.js
const pool = require("./pool");

/**
 * Find a user by email (case-insensitive).
 * Returns: { id, email, password_hash, created_at } or null
 */
async function findByEmail(email) {
  const query = `
    SELECT id, email, password_hash, created_at
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}

/**
 * Create a new user.
 * Expects: { email, passwordHash }
 * Returns: { id, email, password_hash, created_at }
 */
async function createUser({ email, passwordHash }) {
  const query = `
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, password_hash, created_at
  `;
  const values = [email, passwordHash];
  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  findByEmail,
  createUser,
};
