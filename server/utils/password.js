const runtime = process.env.PASSWORD_RUNTIME;
const isBun = typeof Bun !== "undefined";

async function hashPassword(password) {
  if (runtime === "node") {
    const bcrypt = require("bcrypt");
    return bcrypt.hash(password, 10);
  }

  if (isBun) {
    const bcryptjs = require("bcryptjs");
    return bcryptjs.hash(password, 10);
  }

  const bcrypt = require("bcrypt");
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  if (runtime === "node") {
    const bcrypt = require("bcrypt");
    return bcrypt.compare(password, hash);
  }

  if (isBun) {
    const bcryptjs = require("bcryptjs");
    return bcryptjs.compare(password, hash);
  }

  const bcrypt = require("bcrypt");
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, verifyPassword };
