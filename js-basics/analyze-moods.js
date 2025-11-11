const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "moods.json");

if (!fs.existsSync(filePath)) {
  console.error("No moods.json found. Log a mood first.");
  process.exit(1);
}

const raw = fs.readFileSync(filePath, "utf8");
const moods = JSON.parse(raw);

const total = moods.length;
const latest = moods[total - 1];

// count how many times each mood appears
const counts = {};
for (const entry of moods) {
  const m = entry.mood;
  counts[m] = (counts[m] || 0) + 1;
}

// find most frequent mood
let topMood = null;
let topCount = 0;
for (const [mood, count] of Object.entries(counts)) {
  if (count > topCount) {
    topMood = mood;
    topCount = count;
  }
}

console.log("Total entries:", total);
console.log("Most frequent mood:", topMood, `(${topCount})`);
console.log("Latest:", latest.mood, "at", latest.timestamp);
