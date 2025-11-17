// server/db/pool.js
const { Pool } = require("pg");
require("dotenv").config();

let pool = null;
let poolReady = Promise.resolve(null);

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    poolReady = pool
      .connect()
      .then((client) => {
        client.release();
        console.log("[DB] Connected to Postgres");
        return pool;
      })
      .catch((err) => {
        console.warn(
          `[DB] Failed to connect to Postgres at startup: ${err.message}`
        );
        pool = null;
        return null;
      });
  } catch (err) {
    console.warn(`[DB] Error setting up Postgres pool: ${err.message}`);
    pool = null;
    poolReady = Promise.resolve(null);
  }
} else {
  console.log("[DB] DATABASE_URL not set. Skipping Postgres setup.");
}

module.exports = { pool, poolReady };
