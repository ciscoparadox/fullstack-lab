const fs = require("fs");
const path = require("path");

// 1. Get the mood from the command line
const mood = process.argv.slice(2).join(" ");

if (!mood) {
  console.log('Usage: node mood-log.js "your mood here"');
  process.exit(1);
}

// 2. Figure out where moods.json lives
const filePath = path.join(__dirname, "moods.json");

// 3. Load existing moods if the file exists
let moods = [];

if (fs.existsSync(filePath)) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (raw.trim().length > 0) {
    moods = JSON.parse(raw);
  }
}

// 4. Add the new entry
const entry = {
  mood,
  timestamp: new Date().toISOString(),
};

moods.push(entry);

// 5. Save back to moods.json
fs.writeFileSync(filePath, JSON.stringify(moods, null, 2));

console.log(`Logged mood: "${mood}". Total entries: ${moods.length}`);
