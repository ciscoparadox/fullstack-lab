const runtime = process.env.PASSWORD_RUNTIME;
const isBun = typeof Bun !== "undefined";

async function hashPassword(password) {
  // Force Node Native bcrypt
  if (runtime === "node") {
    const bcrypt = require("bcrypt");
    return bcrypt.hash(password, 10);
  }

  // Fallback for Bun (Pure JS)
  if (isBun) {
    console.log("⚠️  Using bcryptjs (Bun fallback)");
    const bcryptjs = require("bcryptjs");
    return bcryptjs.hash(password, 10);
  }

  // Default
  const bcrypt = require("bcrypt");
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  // Force Node Native bcrypt
  if (runtime === "node") {
    const bcrypt = require("bcrypt");
    return bcrypt.compare(password, hash);
  }

  // Fallback for Bun (Pure JS)
  if (isBun) {
    console.log("⚠️  Using bcryptjs (Bun fallback)");
    const bcryptjs = require("bcryptjs");
    return bcryptjs.compare(password, hash);
  }

  // Default
  const bcrypt = require("bcrypt");
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, verifyPassword };
