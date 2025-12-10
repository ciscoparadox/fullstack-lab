require('dotenv').config();
const { Client } = require('pg');

// Initialize the client using your .env DATABASE_URL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log("🔌 Attempting to connect to Postgres with Bun...");
    await client.connect();
    console.log("✅ Connected successfully!");
    
    // Run a simple query to get the current time
    const res = await client.query('SELECT NOW() as now');
    console.log("⏰ Database Time:", res.rows[0].now);
    
    await client.end();
    console.log("👋 Connection closed.");
  } catch (err) {
    console.error("❌ Connection failed:", err);
    process.exit(1);
  }
}

testConnection();
