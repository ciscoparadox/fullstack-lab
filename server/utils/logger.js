// server/utils/logger.js

/**
 * Simple structured console logger
 * Logs include: timestamp, level, message, and optional metadata
 */

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };
  return JSON.stringify(logEntry);
}

const logger = {
  info(message, meta = {}) {
    console.log(formatLog("INFO", message, meta));
  },

  warn(message, meta = {}) {
    console.warn(formatLog("WARN", message, meta));
  },

  error(message, meta = {}) {
    console.error(formatLog("ERROR", message, meta));
  },
};

module.exports = logger;
