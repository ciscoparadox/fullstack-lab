// server/db.js
const { Pool } = require("pg");
require("dotenv").config();

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool
    .connect()
    .then((client) => {
      client.release();
      console.log("[DB] Connected to Postgres");
    })
    .catch((err) => {
      console.warn("[DB] Failed to connect to Postgres:", err.message);
      pool = null;
    });
} else {
  console.warn("[DB] DATABASE_URL not set; Postgres is disabled");
}

/**
 * Simple query helper
 * @param {string} text - SQL text
 * @param {Array} params - parameter values
 */
async function query(text, params) {
  if (!pool) {
    throw new Error("Postgres pool is not initialized");
  }
  return pool.query(text, params);
}

module.exports = { query };




