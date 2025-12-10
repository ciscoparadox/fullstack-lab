const { hashPassword, verifyPassword } = require('./utils/password');

async function testAbstraction() {
  console.log("🔍 Testing Auth Abstraction...");
  console.log(`   Runtime Env Var: ${process.env.PASSWORD_RUNTIME || 'undefined'}`);

  const password = "mySuperSecretPassword";

  // 1. Create a FRESH hash
  try {
    const newHash = await hashPassword(password);
    console.log(`✅ Hashing worked. Hash start: ${newHash.substring(0, 10)}...`);

    // 2. Verify that FRESH hash immediately
    const matchFresh = await verifyPassword(password, newHash);
    console.log(`❓ Verify fresh hash: ${matchFresh}`);
    
    if (!matchFresh) {
       console.error("❌ CRITICAL: Could not verify a hash we just created!");
       process.exit(1);
    }
  } catch (err) {
    console.error("❌ Hashing failed:", err);
    process.exit(1);
  }

  console.log("🎉 SUCCESS: Auth abstraction is working.");
}

testAbstraction();
