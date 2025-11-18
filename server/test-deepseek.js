// test-deepseek.js
require("dotenv").config();
const axios = require("axios");

(async () => {
  const key = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

  console.log("DeepSeek key present?", !!key);
  console.log("Key prefix:", key ? key.slice(0, 10) : "NONE");

  if (!key) {
    console.log("No DEEPSEEK_API_KEY / OPENAI_API_KEY found in env, aborting.");
    process.exit(1);
  }

  try {
    const resp = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          { role: "user", content: "Say hi in one short sentence." },
        ],
        max_tokens: 64,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        timeout: 30000,
      }
    );

    console.log("Status:", resp.status);
    console.log("Data:", JSON.stringify(resp.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.log("Status:", err.response.status);
      console.log("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.log("Error:", err.message);
    }
  }
})();

