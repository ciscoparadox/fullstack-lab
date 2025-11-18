// server/test-kimi.js
require("dotenv").config();
const axios = require("axios");

(async () => {
  try {
    if (!process.env.KIMI_API_KEY && !process.env.MOONSHOT_API_KEY) {
      console.error("No KIMI_API_KEY or MOONSHOT_API_KEY in env");
      process.exit(1);
    }

    const apiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
    console.log("Using API key that starts with:", apiKey.slice(0, 10));

    const res = await axios.post(
      "https://api.moonshot.ai/v1/chat/completions",
      {
        model: "kimi-k2-0711-preview", // or whatever exact K2 model id your dashboard shows
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hi to Jose in one short sentence." },
        ],
        max_tokens: 50,
        temperature: 0.7,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("Status:", res.status);
    console.log("First part of response:\n", res.data.choices[0].message.content);
  } catch (err) {
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
})();

