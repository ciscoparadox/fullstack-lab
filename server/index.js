// server/index.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Pool } = require("pg");
require("dotenv").config();

// Import agent routes AFTER dotenv config
const agentRoutes = require("./routes/agentRoutes");

const app = express();
const PORT = 4000;

// middleware
app.use(cors());
app.use(express.json());

const filePath = path.join(__dirname, "moods.json");
const clusteredFilePath = path.join(__dirname, "mood_clusters.json");
const clusterMetaPath = path.join(__dirname, "cluster_meta.json");

/**
 * Ensure moods table exists (safe no-op if already created)
 */
async function ensureMoodsTable() {
  if (!pool) return;

  const createSql = `
    CREATE TABLE IF NOT EXISTS moods (
      id SERIAL PRIMARY KEY,
      mood TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  try {
    await pool.query(createSql);
    console.log("[DB] Ensured moods table exists");
  } catch (err) {
    console.warn("[DB] Failed to ensure moods table:", err.message);
  }
}

// Optional Postgres pool (used as a secondary sink)
let pool = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    pool
      .connect()
      .then((client) => {
        client.release();
        console.log("[DB] Connected to Postgres");
        // Ensure the moods table after a confirmed connection
        ensureMoodsTable();
      })
      .catch((err) => {
        console.warn(
          `[DB] Failed to connect to Postgres at startup: ${err.message}`
        );
        pool = null;
      });
  } catch (err) {
    console.warn(`[DB] Error setting up Postgres pool: ${err.message}`);
    pool = null;
  }
} else {
  console.log("[DB] DATABASE_URL not set. Skipping Postgres setup.");
}

/**
 * Load moods from file with robust error handling
 * @returns {Array} Array of mood objects, empty array if file missing/invalid
 */
function loadMoods() {
  if (!fs.existsSync(filePath)) {
    console.log("[loadMoods] moods.json not found, returning empty array");
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) {
      console.log("[loadMoods] moods.json is empty, returning empty array");
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(
        "[loadMoods] moods.json did not contain an array, returning empty array"
      );
      return [];
    }
    return parsed;
  } catch (err) {
    console.warn(`[loadMoods] Failed to parse moods.json: ${err.message}`);
    return [];
  }
}

/**
 * Save moods to file
 * @param {Array} moods - Array of mood objects to save
 */
function saveMoods(moods) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(moods, null, 2));
  } catch (err) {
    console.error(`[saveMoods] Failed to write moods.json: ${err.message}`);
    throw err;
  }
}

/**
 * Load clustered moods from file with robust error handling
 * @returns {Array} Array of clustered mood objects, empty array if file missing/invalid
 */
function loadClusteredMoods() {
  if (!fs.existsSync(clusteredFilePath)) {
    console.log(
      "[loadClusteredMoods] mood_clusters.json not found, returning empty array"
    );
    return [];
  }

  try {
    const raw = fs.readFileSync(clusteredFilePath, "utf8");
    if (!raw.trim()) {
      console.log(
        "[loadClusteredMoods] mood_clusters.json is empty, returning empty array"
      );
      return [];
    }
    const clustered = JSON.parse(raw);
    if (!Array.isArray(clustered)) {
      console.warn(
        "[loadClusteredMoods] mood_clusters.json did not contain an array, returning empty array"
      );
      return [];
    }
    console.log(
      `[loadClusteredMoods] Loaded ${clustered.length} clustered entries`
    );
    return clustered;
  } catch (err) {
    console.warn(
      `[loadClusteredMoods] Failed to parse mood_clusters.json: ${err.message}`
    );
    return [];
  }
}

/**
 * Load cluster metadata from file with robust error handling
 * @returns {Object} Object with clusters array, quality_score, and quality_rating
 */
function loadClusterMeta() {
  const defaultMeta = {
    clusters: [],
    quality_score: 0,
    quality_rating: "poor",
  };

  if (!fs.existsSync(clusterMetaPath)) {
    console.log("[loadClusterMeta] cluster_meta.json not found, returning default");
    return defaultMeta;
  }

  try {
    const raw = fs.readFileSync(clusterMetaPath, "utf8");
    if (!raw.trim()) {
      console.log("[loadClusterMeta] cluster_meta.json is empty, returning default");
      return defaultMeta;
    }
    const meta = JSON.parse(raw);

    // Validate structure
    if (!meta.clusters || !Array.isArray(meta.clusters)) {
      console.warn("[loadClusterMeta] Invalid clusters format in cluster_meta.json");
      return defaultMeta;
    }

    // Normalize optional fields to safe defaults
    if (typeof meta.quality_score !== "number") {
      meta.quality_score = defaultMeta.quality_score;
    }
    if (typeof meta.quality_rating !== "string") {
      meta.quality_rating = defaultMeta.quality_rating;
    }

    console.log(
      `[loadClusterMeta] Loaded metadata for ${meta.clusters.length} clusters`
    );
    return meta;
  } catch (err) {
    console.warn(
      `[loadClusterMeta] Failed to parse cluster_meta.json: ${err.message}`
    );
    return defaultMeta;
  }
}

/**
 * Run the Python clustering script as a child process
 * @returns {Promise<{success: boolean, message: string, output?: string}>}
 */
function runClusteringScript() {
  return new Promise((resolve) => {
    console.log("[runClusteringScript] Starting Python clustering process...");

    const scriptPath = path.join(__dirname, "..", "ml", "cluster_moods.py");

    // Check if script exists before attempting to run
    if (!fs.existsSync(scriptPath)) {
      const errorMsg = `Clustering script not found at ${scriptPath}`;
      console.error(`[runClusteringScript] ${errorMsg}`);
      resolve({ success: false, message: errorMsg });
      return;
    }

    // Spawn Python process with the script
    const pythonProcess = spawn("python3", [scriptPath], {
      cwd: path.join(__dirname, "..", "ml"),
    });

    let stdoutData = "";
    let stderrData = "";

    // Capture stdout
    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log(`[Python stdout] ${output.trim()}`);
    });

    // Capture stderr
    pythonProcess.stderr.on("data", (data) => {
      const output = data.toString();
      stderrData += output;
      console.error(`[Python stderr] ${output.trim()}`);
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        console.log("[runClusteringScript] Clustering completed successfully");
        resolve({
          success: true,
          message: "Clustering completed successfully",
          output: stdoutData,
        });
      } else {
        const errorMsg = `Clustering script exited with code ${code}`;
        console.error(`[runClusteringScript] ${errorMsg}`);
        console.error(`[runClusteringScript] stderr: ${stderrData}`);
        resolve({
          success: false,
          message: `${errorMsg}. Check server logs for details.`,
          output: stderrData,
        });
      }
    });

    // Handle spawn errors (e.g., Python not found)
    pythonProcess.on("error", (err) => {
      const errorMsg = `Failed to spawn Python process: ${err.message}`;
      console.error(`[runClusteringScript] ${errorMsg}`);
      resolve({
        success: false,
        message:
          "Python not found or clustering script failed to start. Ensure Python 3 is installed.",
      });
    });
  });
}

/**
 * Insert a mood into Postgres as a secondary sink.
 * File-based storage remains the primary source of truth.
 */
function insertMoodIntoDb(entry) {
  if (!pool) return; // DB not configured
  if (!entry || !entry.mood || !entry.timestamp) return;

  const text = "INSERT INTO moods (mood, created_at) VALUES ($1, $2)";
  const values = [entry.mood, entry.timestamp];

  pool
    .query(text, values)
    .then(() => {
      console.log("[DB] Inserted mood into Postgres");
    })
    .catch((err) => {
      console.warn(
        `[DB] Failed to insert mood into Postgres: ${err.message}`
      );
    });
}

/**
 * Get moods enriched with cluster + metadata (used by /moods and /moods/search)
 */
function getEnrichedMoods() {
  const moods = loadMoods();

  if (!moods.length) {
    return [];
  }

  const clustered = loadClusteredMoods();
  const clusterMeta = loadClusterMeta();

  // Build lookup for cluster assignments by timestamp
  const clusterByTs = new Map(
    clustered
      .filter((entry) => entry && entry.timestamp)
      .map((entry) => [entry.timestamp, entry.cluster])
  );

  // Build lookup for cluster metadata by cluster ID
  const clusterMetaById = new Map(
    clusterMeta.clusters.map((c) => [c.id, c])
  );

  return moods.map((entry) => {
    const clusterId = clusterByTs.get(entry.timestamp);
    const hasValidCluster = typeof clusterId === "number";

    return {
      ...entry,
      cluster: hasValidCluster ? clusterId : null,
      cluster_label:
        hasValidCluster && clusterMetaById.has(clusterId)
          ? clusterMetaById.get(clusterId).label
          : null,
      quality_rating: hasValidCluster ? clusterMeta.quality_rating : null,
    };
  });
}

// GET /moods -> moods enriched with cluster and metadata if available
app.get("/moods", (req, res, next) => {
  try {
    const enriched = getEnrichedMoods();
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// GET /moods/search -> text search on mood (V1 semantic search)
app.get("/moods/search", (req, res, next) => {
  try {
    const { query, limit } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "query is required" });
    }

    let max = parseInt(limit, 10);
    if (Number.isNaN(max)) max = 20;
    if (max < 1) max = 1;
    if (max > 100) max = 100;

    const q = query.trim().toLowerCase();

    const enriched = getEnrichedMoods();
    if (!enriched.length) {
      return res.json([]);
    }

    // Filter by case-insensitive substring match on mood text
    const filtered = enriched.filter(
      (entry) =>
        typeof entry.mood === "string" &&
        entry.mood.toLowerCase().includes(q)
    );

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });

    // Apply limit
    const limited = filtered.slice(0, max);

    res.json(limited);
  } catch (err) {
    next(err);
  }
});

// POST /moods -> add new mood
app.post("/moods", (req, res, next) => {
  try {
    const { mood } = req.body || {};
    if (!mood || !mood.trim()) {
      return res.status(400).json({ error: "mood is required" });
    }

    const moods = loadMoods();
    const entry = {
      mood: mood.trim(),
      timestamp: new Date().toISOString(),
    };
    moods.push(entry);
    saveMoods(moods);

    console.log(
      `[POST /moods] Created mood: "${entry.mood}" at ${entry.timestamp}`
    );

    // Fire-and-forget DB insert; if it fails, file storage still succeeded
    insertMoodIntoDb(entry);

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// POST /moods/cluster -> trigger clustering script
app.post("/moods/cluster", async (req, res, next) => {
  try {
    console.log("[POST /moods/cluster] Clustering request received");

    // Check if there are moods to cluster
    const moods = loadMoods();
    if (moods.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No moods to cluster. Log some moods first.",
      });
    }

    // Run the clustering script
    const result = await runClusteringScript();

    if (result.success) {
      res.json(result);
    } else {
      // Return 500 for clustering failures
      res.status(500).json(result);
    }
  } catch (err) {
    next(err);
  }
});

// GET /moods/db-preview -> preview moods stored in Postgres (if configured)
app.get("/moods/db-preview", async (req, res, next) => {
  if (!pool) {
    return res
      .status(503)
      .json({ error: "Postgres not configured (DATABASE_URL not set)" });
  }

  try {
    const result = await pool.query(
      "SELECT mood, created_at FROM moods ORDER BY created_at ASC LIMIT 20"
    );

    const rows = result.rows.map((row) => ({
      mood: row.mood,
      timestamp:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
    }));

    res.json(rows);
  } catch (err) {
    console.error("[GET /moods/db-preview] Error reading from Postgres:", err);

    // If table somehow still doesn't exist, degrade gracefully
    if (err.code === "42P01") {
      // relation "moods" does not exist
      return res.json([]);
    }

    next(err);
  }
});

// GET /moods/stats -> return total count and mood frequency counts
app.get("/moods/stats", (req, res, next) => {
  try {
    const moods = loadMoods();

    const total = moods.length;
    const counts = {};

    moods.forEach((entry) => {
      if (entry && entry.mood) {
        const moodText = entry.mood.trim();
        counts[moodText] = (counts[moodText] || 0) + 1;
      }
    });

    res.json({ total, counts });
  } catch (err) {
    next(err);
  }
});

// Mount agent routes
app.use("/agent", agentRoutes);

// Error handling middleware - must be defined after all routes
app.use((err, req, res, next) => {
  console.error("[Error Middleware] Unhandled error:");
  console.error(err.stack);

  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
