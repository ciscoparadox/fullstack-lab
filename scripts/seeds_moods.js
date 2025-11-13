// scripts/seeds_moods.js
/**
 * Mood Seeder Script
 * 
 * Seeds mood entries into server/moods.json (and optionally Postgres).
 * 
 * JSON shape: { mood: string, timestamp: ISO-8601 string }
 * 
 * Usage:
 *   node scripts/seeds_moods.js
 *   node scripts/seeds_moods.js --count 50 --reset
 *   node scripts/seeds_moods.js --deterministic --start 2025-01-01
 *   DATABASE_URL=... node scripts/seeds_moods.js --db --count 25
 * 
 * Flags:
 *   --count N         Number of entries to generate (default: 20)
 *   --reset           Overwrite file with fresh entries
 *   --deterministic   Use fixed timestamps (start + 1min increments)
 *   --db              Also seed Postgres if DATABASE_URL is set
 *   --start YYYY-MM-DD Base date for deterministic mode (default: 2025-01-01)
 * 
 * Note: This script never commits or touches git.
 */

const fs = require('fs');
const path = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {
  count: 20,
  reset: false,
  deterministic: false,
  db: false,
  start: '2025-01-01'
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--count' && args[i + 1]) {
    flags.count = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--reset') {
    flags.reset = true;
  } else if (args[i] === '--deterministic') {
    flags.deterministic = true;
  } else if (args[i] === '--db') {
    flags.db = true;
  } else if (args[i] === '--start' && args[i + 1]) {
    flags.start = args[i + 1];
    i++;
  }
}

// Curated demo moods
const DEMO_MOODS = [
  'tired but wired [title=grind; tags=work, caffeine; energy=7]',
  'low focus, itchy brain [tags=study, burnout; energy=3]',
  'feeling productive and sharp [tags=flow, work; energy=9]',
  'anxious about deadlines [title=crunch time; tags=stress, work; energy=5]',
  'calm and centered [tags=meditation, peace; energy=6]',
  'scattered thoughts everywhere [tags=adhd, distraction; energy=4]',
  'energized after gym session [title=post-workout high; tags=fitness, endorphins; energy=8]',
  'drained from meetings [tags=work, fatigue; energy=2]',
  'curious and exploratory [tags=learning, creativity; energy=7]',
  'frustrated with bugs [title=debugging hell; tags=coding, anger; energy=4]',
  'grateful for small wins [tags=gratitude, progress; energy=6]',
  'overwhelmed by options [tags=decision-fatigue, anxiety; energy=3]',
  'hyped for weekend plans [title=friday feeling; tags=excitement, social; energy=9]',
  'melancholy and reflective [tags=introspection, sadness; energy=4]',
  'restless and bored [tags=procrastination, ennui; energy=5]',
  'inspired by new ideas [title=eureka moment; tags=creativity, innovation; energy=8]',
  'sleepy after lunch [tags=food-coma, fatigue; energy=3]',
  'motivated to tackle goals [tags=ambition, determination; energy=8]',
  'socially drained [title=introvert recharge needed; tags=social-battery, exhaustion; energy=2]',
  'content and relaxed [tags=comfort, ease; energy=6]',
  'nervous about presentation [tags=anxiety, public-speaking; energy=4]',
  'excited by progress [title=momentum building; tags=achievement, motivation; energy=8]',
  'foggy brain from lack of sleep [tags=insomnia, cognitive-load; energy=3]',
  'playful and silly [tags=humor, lightness; energy=7]',
  'determined to push through [title=grit mode; tags=persistence, challenge; energy=6]',
  'overstimulated and jittery [tags=sensory-overload, anxiety; energy=6]',
  'peaceful morning clarity [title=fresh start; tags=mindfulness, calm; energy=7]',
  'impatient with slow progress [tags=frustration, ambition; energy=5]',
  'nostalgic about old memories [tags=reflection, sentiment; energy=5]',
  'recharged after nature walk [title=outdoor therapy; tags=nature, wellness; energy=8]'
];

// File path
const moodsFilePath = path.join(__dirname, '..', 'server', 'moods.json');

// Load existing moods
let existingMoods = [];
if (fs.existsSync(moodsFilePath)) {
  try {
    const raw = fs.readFileSync(moodsFilePath, 'utf-8');
    existingMoods = JSON.parse(raw);
    if (!Array.isArray(existingMoods)) {
      throw new Error('moods.json is not an array');
    }
  } catch (err) {
    if (flags.reset) {
      console.log('Malformed moods.json detected, using fresh array due to --reset');
      existingMoods = [];
    } else {
      console.error('Error reading moods.json:', err.message);
      process.exit(1);
    }
  }
} else {
  console.log('moods.json not found, will create new file');
}

// Generate new moods
const newMoods = [];
const baseDate = flags.deterministic ? new Date(flags.start + 'T00:00:00Z') : null;

for (let i = 0; i < flags.count; i++) {
  const mood = DEMO_MOODS[i % DEMO_MOODS.length];
  let timestamp;
  
  if (flags.deterministic && baseDate) {
    const offsetMinutes = i;
    const date = new Date(baseDate.getTime() + offsetMinutes * 60 * 1000);
    timestamp = date.toISOString();
  } else {
    timestamp = new Date().toISOString();
  }
  
  newMoods.push({ mood, timestamp });
}

// Merge or replace
let finalMoods;
if (flags.reset) {
  finalMoods = newMoods;
  console.log(`Reset mode: replacing with ${newMoods.length} new entries`);
} else {
  // Append, skipping duplicates
  const existingSet = new Set(existingMoods.map(m => `${m.mood}|${m.timestamp}`));
  const toAdd = newMoods.filter(m => !existingSet.has(`${m.mood}|${m.timestamp}`));
  finalMoods = [...existingMoods, ...toAdd];
  console.log(`Added ${toAdd.length} new entries (${newMoods.length - toAdd.length} duplicates skipped)`);
}

// Write to file
try {
  const dir = path.dirname(moodsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(moodsFilePath, JSON.stringify(finalMoods, null, 2), 'utf-8');
  console.log(`Wrote ${finalMoods.length} total entries to ${moodsFilePath}`);
} catch (err) {
  console.error('Error writing moods.json:', err.message);
  process.exit(1);
}

// Optional: seed Postgres
if (flags.db) {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.log('Skipping DB seed: DATABASE_URL not set');
  } else {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: DATABASE_URL });
      
      (async () => {
        try {
          // Create table if not exists
          await pool.query(`
            CREATE TABLE IF NOT EXISTS moods (
              id SERIAL PRIMARY KEY,
              mood TEXT NOT NULL,
              created_at TIMESTAMPTZ NOT NULL
            )
          `);
          console.log('Ensured moods table exists');
          
          // Insert new moods
          let inserted = 0;
          for (const entry of newMoods) {
            await pool.query(
              'INSERT INTO moods (mood, created_at) VALUES ($1, $2)',
              [entry.mood, entry.timestamp]
            );
            inserted++;
          }
          
          console.log(`Inserted ${inserted} entries into Postgres moods table`);
          await pool.end();
        } catch (dbErr) {
          console.error('Database error:', dbErr.message);
          await pool.end();
          process.exit(1);
        }
      })();
    } catch (importErr) {
      console.log('Skipping DB seed: pg module not available');
    }
  }
}
