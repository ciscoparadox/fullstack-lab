// client/src/utils/moodUtils.js

// Helper to parse mood string for title, tags, energy
export function parseMoodMetadata(moodString) {
  const result = { text: moodString.trim(), title: null, tags: [], energy: null };

  // Extract content in brackets if present
  const bracketMatch = moodString.match(/\[(.+?)\]$/);
  if (!bracketMatch) return result;

  // Strip the [ ... ] metadata from the text
  result.text = moodString.replace(/\s*\[.+?\]$/, "").trim();

  const metadata = bracketMatch[1];
  const parts = metadata.split(";").map((p) => p.trim());

  parts.forEach((part) => {
    if (part.startsWith("title=")) {
      result.title = part.substring(6).trim();
    } else if (part.startsWith("tags=")) {
      result.tags = part
        .substring(5)
        .split(",")
        .map((t) => t.trim().toLowerCase());
    } else if (part.startsWith("energy=")) {
      const energyVal = parseInt(part.substring(7).trim(), 10);
      if (!isNaN(energyVal)) result.energy = energyVal;
    }
  });

  return result;
}

// Helper to get cluster color based on ID
export function getClusterColor(cluster) {
  if (cluster === 0) return "#a855f7"; // purple
  if (cluster === 1) return "#22c55e"; // green
  if (cluster === 2) return "#f97316"; // orange
  return "#4b5563"; // gray default
}

// Helper to get border style for list items
export function getClusterStyle(cluster) {
  if (cluster === 0) return { borderLeft: "4px solid #a855f7" }; // purple
  if (cluster === 1) return { borderLeft: "4px solid #22c55e" }; // green
  if (cluster === 2) return { borderLeft: "4px solid #f97316" }; // orange
  return { borderLeft: "4px solid #4b5563" }; // gray default
}

