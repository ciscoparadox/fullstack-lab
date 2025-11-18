
// server/utils/config.js

// If dotenv is already handled globally (you saw dotenvx log), we can just read env.
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL || '';

module.exports = {
  PORT,
  NODE_ENV,
  DATABASE_URL,
};

