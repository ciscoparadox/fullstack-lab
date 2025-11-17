// server/routes/authRoutes.js
const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// POST /auth/register - Register new user
router.post("/register", authController.register);

// POST /auth/login - Login user
router.post("/login", authController.login);

module.exports = router;
