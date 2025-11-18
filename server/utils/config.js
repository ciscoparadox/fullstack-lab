// server/utils/config.js

// If dotenv is already handled globally (you saw dotenvx log), we can just read env.
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const DATABASE_URL = process.env.DATABASE_URL || "";
const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

module.exports = {
  PORT,
  NODE_ENV,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};

