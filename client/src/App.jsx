// client/src/App.jsx
import { useState, useEffect, useMemo } from "react";
import { fetchMoods, postMood, triggerClustering } from "./api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./App.css";

const API_URL = "http://localhost:4000";

// Helper to parse mood string for title, tags, energy
function parseMoodMetadata(moodString) {
  const result = { text: moodString.trim(), title: null, tags: [], energy: null };

  // Extract content in brackets if present
  const bracketMatch = moodString.match(/\[(.+?)\]$/);
  if (!bracketMatch) return result;

  result.text = moodString.replace(/\s*\[.+?\]$/, '').trim();

  const metadata = bracketMatch[1];
  const parts = metadata.split(';').map(p => p.trim());

  parts.forEach(part => {
    if (part.startsWith('title=')) {
      result.title = part.substring(6).trim();
    } else if (part.startsWith('tags=')) {
      result.tags = part.substring(5).split(',').map(t => t.trim().toLowerCase());
    } else if (part.startsWith('energy=')) {
      const energyVal = parseInt(part.substring(7).trim(), 10);
      if (!isNaN(energyVal)) result.energy = energyVal;
    }
  });

  return result;
}

// Helper to get cluster color based on ID
function getClusterColor(cluster) {
  if (cluster === 0) return "#a855f7"; // purple
  if (cluster === 1) return "#22c55e"; // green
  if (cluster === 2) return "#f97316"; // orange
  return "#4b5563"; // gray default
}

// Helper to get border style for list items
function getClusterStyle(cluster) {
  if (cluster === 0) return { borderLeft: "4px solid #a855f7" }; // purple
  if (cluster === 1) return { borderLeft: "4px solid #22c55e" }; // green
  if (cluster === 2) return { borderLeft: "4px solid #f97316" }; // orange
  return { borderLeft: "4px solid #4b5563" }; // gray default
}

function ClusterDot({ color }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        marginRight: 6,
      }}
    />
  );
}

function ClusterLegend({ clusters, hasPoorQuality }) {
  if (clusters.length === 0) {
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.8rem", color: "#718096", fontStyle: "italic", opacity: 0.8 }}>
          Log more moods to see clusters appear here
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          marginBottom: "0.5rem",
          opacity: 0.9,
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 500, color: "#cbd5e0" }}>Clusters:</span>
        {clusters.map((cluster) => (
          <span key={cluster.id} style={{ display: "flex", alignItems: "center" }}>
            <ClusterDot color={getClusterColor(cluster.id)} />
            {cluster.label}
          </span>
        ))}
      </div>
      <div
        style={{
          fontSize: "0.8rem",
          color: "#718096",
          fontStyle: "italic",
          opacity: 0.8,
        }}
      >
        Clusters are generated through unsupervised learning and may not perfectly align with mood labels.
      </div>
      {hasPoorQuality && (
        <div style={{
          fontSize: "0.8rem",
          color: "#facc15",
          fontStyle: "italic",
          opacity: 0.9,
          marginTop: "0.5rem"
        }}>
          ⚠️ Experimental clusters - quality is low
        </div>
      )}
    </div>
  );
}

function App() {
  const [mood, setMood] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClustering, setIsClustering] = useState(false);
  const [isReclustering, setIsReclustering] = useState(false);
  const [reclusterError, setReclusterError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [theme, setTheme] = useState("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [dateRange, setDateRange] = useState("all");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [energy, setEnergy] = useState(5);
  const [energyFilter, setEnergyFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [selectedMood, setSelectedMood] = useState(null);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }
  }, []);

  // Toggle theme and save to localStorage
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Extract unique clusters from entries for dynamic rendering
  const uniqueClusters = useMemo(() => {
    const clusterMap = new Map();
    entries.forEach((entry) => {
      if (entry.cluster !== null && entry.cluster !== undefined) {
        if (!clusterMap.has(entry.cluster)) {
          clusterMap.set(entry.cluster, {
            id: entry.cluster,
            label: entry.cluster_label || `Cluster ${entry.cluster}`,
          });
        }
      }
    });
    return Array.from(clusterMap.values()).sort((a, b) => a.id - b.id);
  }, [entries]);

  // Compute cluster statistics
  const clusterStats = useMemo(() => {
    const clusters = {};
    let totalClustered = 0;
    entries.forEach(entry => {
      if (entry.cluster !== null && entry.cluster !== undefined) {
        clusters[entry.cluster] = (clusters[entry.cluster] || 0) + 1;
        totalClustered++;
      }
    });
    return { clusters, totalClustered };
  }, [entries]);

  // Derive mood frequency data from entries
  const moodFrequencyData = useMemo(() => {
    const frequency = {};
    entries.forEach((entry) => {
      frequency[entry.mood] = (frequency[entry.mood] || 0) + 1;
    });
    return Object.entries(frequency)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 moods for readability
  }, [entries]);

  // Check if clustering quality is poor
  const hasPoorQuality = useMemo(() => {
    return entries.some((entry) => entry.quality_rating === "poor");
  }, [entries]);

  const hasTextOrDateFilters = useMemo(() => {
    return searchQuery.trim().length > 0 || dateRange !== "all";
  }, [searchQuery, dateRange]);

  // Compute trends from entries
  const trends = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get unique dates as YYYY-MM-DD strings
    const dateSet = new Set(
      entries.map(e => new Date(e.timestamp).toISOString().split('T')[0])
    );

    // Count last 7 and 30 days
    const last7Days = entries.filter(e => new Date(e.timestamp) >= sevenDaysAgo).length;
    const last30Days = entries.filter(e => new Date(e.timestamp) >= thirtyDaysAgo).length;

    // Calculate current streak (consecutive days ending at most recent log)
    let currentStreak = 0;
    if (entries.length > 0) {
      // Find the most recent log date
      const mostRecentTimestamp = Math.max(...entries.map(e => new Date(e.timestamp).getTime()));
      let checkDate = new Date(mostRecentTimestamp);
      checkDate.setHours(0, 0, 0, 0);

      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dateSet.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1); // Go back one day
        } else {
          break; // Gap found
        }
      }
    }

    return { last7Days, last30Days, currentStreak };
  }, [entries]);

  // Load moods once on mount
  useEffect(() => {
    const loadMoods = async () => {
      try {
        const data = await fetchMoods();
        setEntries(data);
      } catch (err) {
        console.error("Failed to load moods", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMoods();
  }, []);

  // Load stats once on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(`${API_URL}/moods/stats`);
        if (!res.ok) {
          console.error("Failed to fetch stats", res.status);
          return;
        }
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };

    loadStats();
  }, []);

  // Server-side search with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce search requests
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/moods/search?query=${encodeURIComponent(searchQuery.trim())}`
        );

        if (!response.ok) {
          console.error("Search failed", response.status);
          setSearchResults([]);
          return;
        }

        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Search request failed", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Refresh stats after submitting a new mood
  async function refreshStats() {
    try {
      const res = await fetch(`${API_URL}/moods/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to refresh stats", err);
    }
  }

  // Reload moods from server
  async function reloadMoods() {
    try {
      const data = await fetchMoods();
      setEntries(data);
    } catch (err) {
      console.error("Failed to reload moods", err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!mood.trim()) return;

    // Build combined mood string
    const parts = [];
    if (title.trim()) parts.push(`title=${title.trim()}`);
    if (tags.trim()) parts.push(`tags=${tags.trim()}`);
    if (energy && energy !== 5) parts.push(`energy=${energy}`); // Only include if not default

    const combinedMood = parts.length > 0
      ? `${mood.trim()} [${parts.join("; ")}]`
      : mood.trim();

    try {
      const saved = await postMood(combinedMood);
      setEntries((prev) => [...prev, saved]);
      setMood("");
      setTitle("");
      setTags("");
      setEnergy(5);

      // Refresh stats after adding new mood
      await refreshStats();

      // Trigger clustering in the background
      setIsClustering(true);
      const clusterResult = await triggerClustering();

      if (clusterResult.success) {
        console.log("[handleSubmit] Clustering completed successfully");
        // Reload moods to get fresh cluster assignments
        await reloadMoods();
        // Refresh stats one more time after reloading moods
        await refreshStats();
      } else {
        console.warn("[handleSubmit] Clustering failed:", clusterResult.message);
      }
    } catch (err) {
      console.error("Request failed", err);
    } finally {
      setIsClustering(false);
    }
  }

  function handleClearList() {
    setEntries([]);
  }

  // Helper to find most frequent mood from stats
  function getMostFrequentMood() {
    if (!stats || !stats.counts || typeof stats.counts !== 'object') return null;

    try {
      const entries = Object.entries(stats.counts);
      if (entries.length === 0) return null;

      // Find the mood with highest count
      const [topMood, topCount] = entries.reduce((max, current) => {
        return current[1] > max[1] ? current : max;
      });

      return { mood: topMood, count: topCount };
    } catch (err) {
      console.error("Failed to calculate most frequent mood", err);
      return null;
    }
  }

  // Get similar moods for the selected mood
  const similarMoods = useMemo(() => {
    if (!selectedMood || selectedMood.cluster === null || selectedMood.cluster === undefined) return [];
    return entries
      .filter(e => e.cluster === selectedMood.cluster && e.timestamp !== selectedMood.timestamp)
      .slice(0, 5);
  }, [entries, selectedMood]);

  // Handle re-clustering button click
  const handleRecluster = async () => {
    setIsReclustering(true);
    setReclusterError(null);
    try {
      const res = await fetch(`${API_URL}/moods/cluster`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reloadMoods();
    } catch (err) {
      console.error("Re-clustering failed", err);
      setReclusterError("Re-clustering failed. Please try again.");
    } finally {
      setIsReclustering(false);
    }
  };

  // Filter entries based on selected cluster, search query, date range, energy, and tags
  const filteredEntries = useMemo(() => {
    // Use search results if there's an active search, otherwise use all entries
    let result = searchQuery.trim() && searchResults !== null ? searchResults : entries;

    // Apply cluster filter
    if (selectedCluster !== "all") {
      const clusterNum = Number(selectedCluster);
      result = result.filter(entry =>
        entry.cluster !== null &&
        entry.cluster !== undefined &&
        entry.cluster === clusterNum
      );
    }

    // Apply date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const cutoffDate = new Date();

      if (dateRange === "7days") {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (dateRange === "30days") {
        cutoffDate.setDate(now.getDate() - 30);
      }

      result = result.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= cutoffDate;
      });
    }

    // Apply energy filter
    if (energyFilter.trim()) {
      const energyMin = parseInt(energyFilter, 10);
      if (!isNaN(energyMin)) {
        result = result.filter(entry => {
          const parsed = parseMoodMetadata(entry.mood);
          return parsed.energy !== null && parsed.energy >= energyMin;
        });
      }
    }

    // Apply tags filter
    if (tagsFilter.trim()) {
      const tagQuery = tagsFilter.toLowerCase().trim();
      result = result.filter(entry => {
        const parsed = parseMoodMetadata(entry.mood);
        return parsed.tags.some(tag => tag.includes(tagQuery));
      });
    }

    return result;
  }, [entries, searchResults, searchQuery, selectedCluster, dateRange, energyFilter, tagsFilter]);

  const mostFrequent = getMostFrequentMood();

  const styles = theme === "dark" ? stylesDark : stylesLight;

  return (
    <div className="app-root">
      <div className="app-container" style={styles.container}>
        <div className="app-card" style={styles.card}>
          <div className="app-header" style={styles.header}>
            <div style={{ flex: 1 }}>
              <h1 style={styles.title}>✨ Fullstack Lab</h1>
              <p style={styles.subtitle}>Fullstack mood tracker (React + Express)</p>
            </div>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              style={styles.themeToggle}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            }
            </button>
          </div>

          {/* Clustering Indicator */}
          {isClustering && (
            <div className="clustering-indicator" style={styles.clusteringIndicator}>
              <span style={styles.clusteringText}>🔄 Updating clusters...</span>
            </div>
          )}

          {/* Quality Warning */}
          {hasPoorQuality && (
            <div className="quality-warning" style={styles.qualityWarning}>
              <span style={styles.qualityWarningText}>
                ⚠️ Clustering quality is low—log more moods for better groups.
              </span>
            </div>
          )}

          {/* Stats Section */}
          {!stats || stats.total === 0 ? (
            <div className="empty-stats" style={styles.emptyStatsContainer}>
              <p style={styles.emptyStatsText}>
                📊 Stats will appear once you log some moods
              </p>
            </div>
          ) : (
            <div className="stats-section" style={styles.statsSection}>
              <div className="stat-card" style={styles.statCard}>
                <div style={styles.statLabel}>Total Moods</div>
                <div style={styles.statValue}>{stats.total}</div>
              </div>
              {mostFrequent && (
                <div className="stat-card" style={styles.statCard}>
                  <div style={styles.statLabel}>Most Frequent</div>
                  <div style={styles.statValue}>
                    {mostFrequent.mood}
                    <span style={styles.statCount}>({mostFrequent.count}x)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trends Section */}
          {entries.length > 0 && (
            <div className="trends-section" style={styles.trendsSection}>
              <h3 style={styles.trendsTitle}>Trends</h3>
              <div className="trends-cards" style={styles.trendsCards}>
                <div className="trend-card" style={styles.trendCard}>
                  <div style={styles.trendLabel}>Last 7 Days</div>
                  <div style={styles.trendValue}>{trends.last7Days}</div>
                </div>
                <div className="trend-card" style={styles.trendCard}>
                  <div style={styles.trendLabel}>Last 30 Days</div>
                  <div style={styles.trendValue}>{trends.last30Days}</div>
                </div>
                <div className="trend-card" style={styles.trendCard}>
                  <div style={styles.trendLabel}>Current Streak</div>
                  <div style={styles.trendValue}>{trends.currentStreak} days</div>
                </div>
              </div>
            </div>
          )}

          {/* Mood Frequency Chart */}
          {moodFrequencyData.length > 0 && (
            <div className="chart-card" style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Mood Frequency</h3>
              <div className="chart-container" style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={moodFrequencyData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid stroke={styles.gridStroke} vertical={false} />
                    <XAxis
                      dataKey="mood"
                      tick={{ fill: styles.tickColor, fontSize: 12 }}
                      stroke={styles.axisStroke}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis
                      tick={{ fill: styles.tickColor, fontSize: 12 }}
                      stroke={styles.axisStroke}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: styles.tooltipBg,
                        border: `1px solid ${styles.tooltipBorder}`,
                        borderRadius: "8px",
                        color: styles.tooltipColor,
                      }}
                      cursor={{ fill: styles.cursorFill }}
                    />
                    <Bar
                      dataKey="count"
                      fill="url(#moodGradient)"
                      radius={[8, 8, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="app-form" style={styles.form}>
            <input
              style={styles.input}
              placeholder="How are you feeling? (e.g., tired but wired...)"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              disabled={isClustering}
            />
            <div style={styles.richFieldsGrid}>
              <input
                type="text"
                style={styles.richInput}
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isClustering}
              />
              <input
                type="text"
                style={styles.richInput}
                placeholder="Tags, comma separated (optional)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isClustering}
              />
              <div style={styles.energyField}>
                <label style={styles.energyLabel}>
                  Energy: <span style={styles.energyValue}>{energy}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  disabled={isClustering}
                  style={styles.energySlider}
                />
              </div>
            </div>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(isClustering ? styles.buttonDisabled : {}),
              }}
              disabled={isClustering}
              onMouseEnter={(e) => {
                if (!isClustering) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isClustering) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                }
              }}
              onMouseDown={(e) => {
                if (!isClustering) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
                }
              }}
              onMouseUp={(e) => {
                if (!isClustering) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
                }
              }}
            >
              📝 Log Mood
            </button>
          </form>

          <div className="divider" style={styles.divider}></div>

          {/* Cluster Stats Panel */}
          {clusterStats.totalClustered > 0 && (
            <div className="cluster-stats" style={styles.clusterStatsContainer}>
              <h3 style={styles.clusterStatsTitle}>Cluster Stats</h3>
              <div style={styles.clusterStatsList}>
                {Object.entries(clusterStats.clusters)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([clusterId, count]) => {
                    const percentage = Math.round((count / clusterStats.totalClustered) * 100);
                    const clusterNum = Number(clusterId);
                    return (
                      <div key={clusterId} style={styles.clusterStatsRow}>
                        <span style={styles.clusterStatsLabel}>
                          <ClusterDot color={getClusterColor(clusterNum)} />
                          Cluster {clusterNum}
                        </span>
                        <span style={styles.clusterStatsValue}>
                          {count} moods ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Cluster Legend and Re-run button */}
          <div style={styles.clusterLegendWrapper}>
            <ClusterLegend clusters={uniqueClusters} hasPoorQuality={hasPoorQuality} />
            <button
              onClick={handleRecluster}
              disabled={isReclustering}
              style={{
                ...styles.reclusterButton,
                ...(isReclustering ? styles.reclusterButtonDisabled : {}),
              }}
            >
              {isReclustering ? "🔄 Re-clustering..." : "🔄 Re-run clustering"}
            </button>
          </div>
          {reclusterError && (
            <div style={styles.reclusterError}>
              {reclusterError}
            </div>
          )}

          {/* Enhanced Filters Section */}
          <div className="filters-section" style={styles.filtersSection}>
            <div className="filters-wrapper" style={styles.filtersWrapper}>
              <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search moods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
                {isSearching && (
                  <span style={{
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "0.9rem",
                    opacity: 0.7
                  }}>
                    🔍
                  </span>
                )}
              </div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={styles.dateSelect}
              >
                <option value="all">All time</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
              </select>
            </div>

            <div className="rich-filters-wrapper" style={styles.richFiltersWrapper}>
              <input
                type="number"
                min="1"
                max="10"
                placeholder="Min energy level"
                value={energyFilter}
                onChange={(e) => setEnergyFilter(e.target.value)}
                style={styles.energyFilterInput}
              />
              <input
                type="text"
                placeholder="Filter by tags..."
                value={tagsFilter}
                onChange={(e) => setTagsFilter(e.target.value)}
                style={styles.tagsFilterInput}
              />
            </div>

            {/* Cluster Filter - Pill Style */}
            <div className="pill-filter-section" style={styles.pillFilterSection}>
              <span style={styles.pillFilterLabel}>Filter by cluster:</span>
              <button
                onClick={() => setSelectedCluster("all")}
                style={{
                  ...styles.pillButton,
                  ...(selectedCluster === "all" ? styles.pillButtonActive : {}),
                }}
              >
                All
              </button>
              {[0, 1, 2].map((clusterId) => (
                <button
                  key={clusterId}
                  onClick={() => setSelectedCluster(String(clusterId))}
                  style={{
                    ...styles.pillButton,
                    ...(selectedCluster === String(clusterId) ? styles.pillButtonActive : {}),
                    borderColor: getClusterColor(clusterId),
                  }}
                >
                  <ClusterDot color={getClusterColor(clusterId)} />
                  Cluster {clusterId}
                </button>
              ))}
            </div>
          </div>

          <div className="list-section" style={styles.listSection}>
            <div className="list-header" style={styles.listHeader}>
              <h2 style={styles.listTitle}>Your Moods</h2>
              {!isLoading && entries.length > 0 && (
                <button
                  onClick={handleClearList}
                  style={styles.clearButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                    e.currentTarget.style.transform = "scale(0.98)";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  🗑️ Clear List
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="loading-container" style={styles.loadingContainer}>
                <p style={styles.loading}>Loading your moods...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="empty-state" style={styles.emptyState}>
                <p style={styles.emptyText}>
                  {hasTextOrDateFilters
                    ? "No moods match these filters"
                    : selectedCluster === "all"
                    ? "No moods logged yet."
                    : `No moods in Cluster ${selectedCluster}.`
                  }
                </p>
                <p style={styles.emptySubtext}>
                  {hasTextOrDateFilters
                    ? "Try adjusting your search or filters 👆"
                    : selectedCluster === "all"
                    ? "Start by logging how you're feeling above! 👆"
                    : "Try selecting a different cluster or log more moods! 👆"
                  }
                </p>
              </div>
            ) : (
              <ul className="moods-list" style={styles.list}>
                {filteredEntries.map((entry) => {
                  const parsed = parseMoodMetadata(entry.mood);
                  const isSelected = selectedMood?.timestamp === entry.timestamp;

                  return (
                    <div key={entry.timestamp} style={{ marginBottom: "0.5rem" }}>
                      {isSelected && (
                        <div style={styles.detailPanel}>
                          <div style={styles.detailPanelHeader}>
                            <h3 style={styles.detailPanelTitle}>Mood Details</h3>
                            <button
                              onClick={() => setSelectedMood(null)}
                              style={styles.detailPanelClose}
                            >
                              ✕
                            </button>
                          </div>
                          <div style={styles.detailPanelContent}>
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Mood:</span>
                              <span style={styles.detailValue}>{parsed.text}</span>
                            </div>
                            {parsed.title && (
                              <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Title:</span>
                                <span style={styles.detailValue}>{parsed.title}</span>
                              </div>
                            )}
                            {parsed.tags.length > 0 && (
                              <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Tags:</span>
                                <span style={styles.detailValue}>{parsed.tags.join(", ")}</span>
                              </div>
                            )}
                            {parsed.energy !== null && (
                              <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Energy:</span>
                                <span style={styles.detailValue}>{parsed.energy}/10</span>
                              </div>
                            )}
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Cluster:</span>
                              <span style={styles.detailValue}>
                                {entry.cluster_label || `Cluster ${entry.cluster}`}
                              </span>
                            </div>
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Time:</span>
                              <span style={styles.detailValue}>
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {/* Similar Moods Section */}
                          {similarMoods.length > 0 && (
                            <div style={styles.similarMoodsSection}>
                              <h4 style={styles.similarMoodsTitle}>Similar moods</h4>
                              <ul style={styles.similarMoodsList}>
                                {similarMoods.map(similarEntry => {
                                  const similarParsed = parseMoodMetadata(similarEntry.mood);
                                  return (
                                    <li
                                      key={similarEntry.timestamp}
                                      style={styles.similarMoodItem}
                                      onClick={() => setSelectedMood(similarEntry)}
                                    >
                                      <span style={styles.similarMoodText}>{similarParsed.text}</span>
                                      <span style={styles.similarMoodTime}>
                                        {new Date(similarEntry.timestamp).toLocaleDateString()}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      <li
                        key={entry.timestamp}
                        style={{
                          ...styles.listItem,
                          ...getClusterStyle(entry.cluster),
                          ...(isSelected ? styles.listItemSelected : {}),
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedMood(isSelected ? null : entry)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = styles.hoverBg;
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.borderColor = styles.hoverBorder;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = styles.listItem.background;
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.borderColor = styles.listItem.borderColor;
                        }}
                      >
                        <div style={styles.moodContent}>
                          <span style={styles.moodText}>{parsed.text}</span>
                          <span style={styles.timestamp}>
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {entry.cluster !== null && entry.cluster !== undefined && (
                          <div style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "0.25rem" }}>
                            {entry.cluster_label || `Cluster ${entry.cluster}`}
                          </div>
                        )}
                      </li>
                    </div>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const baseStyles = {
  container: {
    padding: "2rem",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "2rem",
    borderRadius: "16px",
    backdropFilter: "blur(10px)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  themeToggle: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1.2rem",
    transition: "all 0.2s ease",
  },
  title: {
    fontSize: "2rem",
    margin: 0,
    fontWeight: 700,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    margin: "0.5rem 0 0 0",
  },
  clusteringIndicator: {
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    textAlign: "center",
  },
  clusteringText: {
    fontWeight: 500,
  },
  qualityWarning: {
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    textAlign: "center",
  },
  qualityWarningText: {
    fontWeight: 500,
  },
  emptyStatsContainer: {
    padding: "1.5rem",
    borderRadius: "8px",
    marginBottom: "2rem",
    textAlign: "center",
  },
  emptyStatsText: {
    margin: 0,
  },
  statsSection: {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: "150px",
    padding: "1rem",
    borderRadius: "8px",
  },
  statLabel: {
    fontSize: "0.85rem",
    marginBottom: "0.25rem",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: 600,
  },
  statCount: {
    fontSize: "0.9rem",
    marginLeft: "0.5rem",
  },
  trendsSection: {
    marginTop: "1.5rem",
    paddingTop: "1.5rem",
  },
  trendsTitle: {
    marginBottom: "1rem",
    fontSize: "1.1rem",
  },
  trendsCards: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  trendCard: {
    flex: 1,
    minWidth: "120px",
  },
  trendLabel: {
    fontSize: "0.85rem",
    marginBottom: "0.25rem",
  },
  trendValue: {
    fontSize: "1.5rem",
    fontWeight: 600,
  },
  form: {
    marginBottom: "2rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    transition: "border-color 0.2s ease",
  },
  richFieldsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginTop: "0.75rem",
    marginBottom: "1rem",
  },
  richInput: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    transition: "border-color 0.2s ease",
  },
  energyField: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  energyLabel: {
    fontSize: "0.9rem",
  },
  energyValue: {
    fontWeight: 600,
  },
  energySlider: {
    width: "100%",
    cursor: "pointer",
  },
  button: {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  divider: {
    height: "1px",
    margin: "2rem 0",
  },
  clusterStatsContainer: {
    padding: "1.25rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    border: "1px solid",
  },
  clusterStatsTitle: {
    margin: "0 0 0.75rem 0",
    fontSize: "1.1rem",
    fontWeight: 600,
  },
  clusterStatsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  clusterStatsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
    borderBottom: "1px solid",
  },
  clusterStatsLabel: {
    display: "flex",
    alignItems: "center",
    fontWeight: 500,
  },
  clusterStatsValue: {
    fontSize: "0.9rem",
    opacity: 0.9,
  },
  clusterLegendWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  reclusterButton: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  reclusterButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  reclusterError: {
    marginTop: "0.5rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "6px",
    fontSize: "0.85rem",
    border: "1px solid",
  },
  filtersSection: {
    marginBottom: "2rem",
  },
  filtersWrapper: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  richFiltersWrapper: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "200px",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    transition: "border-color 0.2s ease",
  },
  dateSelect: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  },
  energyFilterInput: {
    flex: 1,
    minWidth: "150px",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    transition: "border-color 0.2s ease",
  },
  tagsFilterInput: {
    flex: 2,
    minWidth: "200px",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    transition: "border-color 0.2s ease",
  },
  pillFilterSection: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
    marginTop: "1rem",
  },
  pillFilterLabel: {
    fontSize: "0.9rem",
    marginRight: "0.5rem",
  },
  pillButton: {
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
  },
  pillButtonActive: {
    fontWeight: 600,
  },
  listSection: {},
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  listTitle: {
    margin: 0,
    fontSize: "1.25rem",
  },
  clearButton: {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "all 0.2s ease",
  },
  loadingContainer: {
    textAlign: "center",
    padding: "2rem 0",
  },
  loading: {
    color: "#718096",
  },
  emptyState: {
    padding: "2rem",
    borderRadius: "8px",
    textAlign: "center",
    border: "2px dashed",
  },
  emptyText: {
    margin: "0 0 0.5rem 0",
    fontSize: "1.1rem",
  },
  emptySubtext: {
    margin: 0,
    fontSize: "0.9rem",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    padding: "1rem",
    borderRadius: "8px",
    marginBottom: "0.75rem",
    border: "1px solid",
    transition: "all 0.2s ease",
  },
  listItemSelected: {
    borderColor: "#667eea",
    boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.3)",
  },
  hoverBg: "rgba(255, 255, 255, 0.05)",
  hoverBorder: "rgba(255, 255, 255, 0.12)",
  moodContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  moodText: {
    fontSize: "1rem",
    lineHeight: 1.5,
  },
  timestamp: {
    fontSize: "0.85rem",
    opacity: 0.8,
  },
  detailPanel: {
    padding: "1.5rem",
    borderRadius: "8px",
    marginBottom: "0.75rem",
    border: "1px solid",
    background: "rgba(102, 126, 234, 0.1)",
  },
  detailPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  detailPanelTitle: {
    margin: 0,
    fontSize: "1.1rem",
  },
  detailPanelClose: {
    background: "none",
    border: "none",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "0.25rem",
    opacity: 0.7,
  },
  detailPanelContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  detailRow: {
    display: "flex",
    gap: "0.5rem",
  },
  detailLabel: {
    fontWeight: 600,
    minWidth: "80px",
    opacity: 0.8,
  },
  detailValue: {
    flex: 1,
  },
  similarMoodsSection: {
    marginTop: "1.5rem",
    paddingTop: "1rem",
    borderTop: "1px solid",
  },
  similarMoodsTitle: {
    margin: "0 0 0.75rem 0",
    fontSize: "1rem",
    fontWeight: 600,
  },
  similarMoodsList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  similarMoodItem: {
    padding: "0.5rem",
    borderRadius: "6px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  similarMoodText: {
    fontSize: "0.9rem",
    display: "block",
  },
  similarMoodTime: {
    fontSize: "0.8rem",
    opacity: 0.7,
  },
  chartCard: {
    padding: "1.5rem",
    borderRadius: "8px",
    marginBottom: "2rem",
    border: "1px solid",
  },
  chartTitle: {
    margin: "0 0 1rem 0",
    fontSize: "1.1rem",
  },
  chartContainer: {
    height: "300px",
    width: "100%",
  },
  gridStroke: "rgba(255, 255, 255, 0.05)",
  tickColor: "#a0aec0",
  axisStroke: "rgba(255, 255, 255, 0.1)",
  tooltipBg: "rgba(0, 0, 0, 0.8)",
  tooltipBorder: "rgba(255, 255, 255, 0.1)",
  tooltipColor: "#f5f5f5",
  cursorFill: "rgba(255, 255, 255, 0.05)",
};

const stylesDark = {
  ...baseStyles,
  container: {
    ...baseStyles.container,
    background: "linear-gradient(135deg, #050816 0%, #0a1128 100%)",
    color: "#f5f5f5",
  },
  card: {
    ...baseStyles.card,
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  header: {
    ...baseStyles.header,
    color: "#cbd5e0",
  },
  themeToggle: {
    ...baseStyles.themeToggle,
    background: "rgba(255, 255, 255, 0.05)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  title: {
    ...baseStyles.title,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    ...baseStyles.subtitle,
    color: "#a0aec0",
  },
  clusteringIndicator: {
    ...baseStyles.clusteringIndicator,
    background: "rgba(102, 126, 234, 0.15)",
    border: "1px solid rgba(102, 126, 234, 0.3)",
  },
  clusteringText: {
    ...baseStyles.clusteringText,
    color: "#a5b4fc",
  },
  qualityWarning: {
    ...baseStyles.qualityWarning,
    background: "rgba(234, 179, 8, 0.15)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
  },
  qualityWarningText: {
    ...baseStyles.qualityWarningText,
    color: "#facc15",
  },
  emptyStatsContainer: {
    ...baseStyles.emptyStatsContainer,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.15)",
  },
  emptyStatsText: {
    ...baseStyles.emptyStatsText,
    color: "#a0aec0",
  },
  statCard: {
    ...baseStyles.statCard,
    background: "rgba(102, 126, 234, 0.1)",
    border: "1px solid rgba(102, 126, 234, 0.2)",
  },
  statLabel: {
    ...baseStyles.statLabel,
    color: "#a0aec0",
  },
  statValue: {
    ...baseStyles.statValue,
    color: "#e2e8f0",
  },
  statCount: {
    ...baseStyles.statCount,
    color: "#a0aec0",
  },
  trendsSection: {
    ...baseStyles.trendsSection,
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  },
  trendsTitle: {
    ...baseStyles.trendsTitle,
    color: "#cbd5e0",
  },
  trendCard: {
    ...baseStyles.trendCard,
    background: "rgba(102, 126, 234, 0.08)",
    border: "1px solid rgba(102, 126, 234, 0.15)",
  },
  trendLabel: {
    ...baseStyles.trendLabel,
    color: "#a0aec0",
  },
  trendValue: {
    ...baseStyles.trendValue,
    color: "#e2e8f0",
  },
  input: {
    ...baseStyles.input,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
  },
  richInput: {
    ...baseStyles.richInput,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
  },
  energyLabel: {
    ...baseStyles.energyLabel,
    color: "#a0aec0",
  },
  energyValue: {
    ...baseStyles.energyValue,
    color: "#667eea",
  },
  button: {
    ...baseStyles.button,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  divider: {
    ...baseStyles.divider,
    background: "rgba(255, 255, 255, 0.1)",
  },
  clusterStatsContainer: {
    ...baseStyles.clusterStatsContainer,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  clusterStatsTitle: {
    ...baseStyles.clusterStatsTitle,
    color: "#e2e8f0",
  },
  clusterStatsRow: {
    ...baseStyles.clusterStatsRow,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  clusterStatsLabel: {
    ...baseStyles.clusterStatsLabel,
    color: "#cbd5e0",
  },
  clusterStatsValue: {
    ...baseStyles.clusterStatsValue,
    color: "#a0aec0",
  },
  clusterLegendWrapper: {
    ...baseStyles.clusterLegendWrapper,
  },
  reclusterButton: {
    ...baseStyles.reclusterButton,
    background: "rgba(255, 255, 255, 0.05)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  reclusterButtonDisabled: {
    ...baseStyles.reclusterButtonDisabled,
  },
  reclusterError: {
    ...baseStyles.reclusterError,
    background: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
  },
  searchInput: {
    ...baseStyles.searchInput,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
  },
  dateSelect: {
    ...baseStyles.dateSelect,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
  },
  energyFilterInput: {
    ...baseStyles.energyFilterInput,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
  },
  tagsFilterInput: {
    ...baseStyles.tagsFilterInput,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
  },
  pillFilterSection: {
    ...baseStyles.pillFilterSection,
  },
  pillFilterLabel: {
    ...baseStyles.pillFilterLabel,
    color: "#a0aec0",
  },
  pillButton: {
    ...baseStyles.pillButton,
    background: "rgba(255, 255, 255, 0.05)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  pillButtonActive: {
    ...baseStyles.pillButtonActive,
    background: "rgba(102, 126, 234, 0.2)",
    borderColor: "rgba(102, 126, 234, 0.4)",
    color: "#a5b4fc",
    boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.2)",
  },
  listTitle: {
    ...baseStyles.listTitle,
    color: "#e2e8f0",
  },
  clearButton: {
    ...baseStyles.clearButton,
    background: "rgba(239, 68, 68, 0.1)",
    color: "#fca5a5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  emptyState: {
    ...baseStyles.emptyState,
    background: "rgba(255, 255, 255, 0.02)",
    border: "2px dashed rgba(255, 255, 255, 0.1)",
  },
  emptyText: {
    ...baseStyles.emptyText,
    color: "#cbd5e0",
  },
  emptySubtext: {
    ...baseStyles.emptySubtext,
    color: "#718096",
  },
  listItem: {
    ...baseStyles.listItem,
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  hoverBg: "rgba(255, 255, 255, 0.05)",
  hoverBorder: "rgba(255, 255, 255, 0.12)",
  moodText: {
    ...baseStyles.moodText,
    color: "#e2e8f0",
  },
  timestamp: {
    ...baseStyles.timestamp,
    color: "#718096",
  },
  detailPanel: {
    ...baseStyles.detailPanel,
    background: "rgba(102, 126, 234, 0.1)",
    border: "1px solid rgba(102, 126, 234, 0.3)",
  },
  detailPanelTitle: {
    ...baseStyles.detailPanelTitle,
    color: "#e2e8f0",
  },
  detailPanelClose: {
    ...baseStyles.detailPanelClose,
    color: "#a0aec0",
  },
  detailLabel: {
    ...baseStyles.detailLabel,
    color: "#a0aec0",
  },
  detailValue: {
    ...baseStyles.detailValue,
    color: "#e2e8f0",
  },
  similarMoodsSection: {
    ...baseStyles.similarMoodsSection,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  similarMoodsTitle: {
    ...baseStyles.similarMoodsTitle,
    color: "#e2e8f0",
  },
  similarMoodItem: {
    ...baseStyles.similarMoodItem,
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  similarMoodText: {
    ...baseStyles.similarMoodText,
    color: "#e2e8f0",
  },
  similarMoodTime: {
    ...baseStyles.similarMoodTime,
    color: "#718096",
  },
  chartCard: {
    ...baseStyles.chartCard,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  chartTitle: {
    ...baseStyles.chartTitle,
    color: "#e2e8f0",
  },
  gridStroke: "rgba(255, 255, 255, 0.05)",
  tickColor: "#a0aec0",
  axisStroke: "rgba(255, 255, 255, 0.1)",
  tooltipBg: "rgba(0, 0, 0, 0.8)",
  tooltipBorder: "rgba(255, 255, 255, 0.1)",
  tooltipColor: "#f5f5f5",
  cursorFill: "rgba(255, 255, 255, 0.05)",
};

const stylesLight = {
  ...baseStyles,
  container: {
    ...baseStyles.container,
    background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
    color: "#1a202c",
  },
  card: {
    ...baseStyles.card,
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
  header: {
    ...baseStyles.header,
    color: "#2d3748",
  },
  themeToggle: {
    ...baseStyles.themeToggle,
    background: "rgba(0, 0, 0, 0.05)",
    color: "#4a5568",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
  title: {
    ...baseStyles.title,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    ...baseStyles.subtitle,
    color: "#4a5568",
  },
  clusteringIndicator: {
    ...baseStyles.clusteringIndicator,
    background: "rgba(102, 126, 234, 0.1)",
    border: "1px solid rgba(102, 126, 234, 0.2)",
  },
  clusteringText: {
    ...baseStyles.clusteringText,
    color: "#667eea",
  },
  qualityWarning: {
    ...baseStyles.qualityWarning,
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.2)",
  },
  qualityWarningText: {
    ...baseStyles.qualityWarningText,
    color: "#b7791f",
  },
  emptyStatsContainer: {
    ...baseStyles.emptyStatsContainer,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.1)",
  },
  emptyStatsText: {
    ...baseStyles.emptyStatsText,
    color: "#718096",
  },
  statCard: {
    ...baseStyles.statCard,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.15)",
  },
  statLabel: {
    ...baseStyles.statLabel,
    color: "#4a5568",
  },
  statValue: {
    ...baseStyles.statValue,
    color: "#2d3748",
  },
  statCount: {
    ...baseStyles.statCount,
    color: "#718096",
  },
  trendsSection: {
    ...baseStyles.trendsSection,
    borderTop: "1px solid rgba(0, 0, 0, 0.05)",
  },
  trendsTitle: {
    ...baseStyles.trendsTitle,
    color: "#2d3748",
  },
  trendCard: {
    ...baseStyles.trendCard,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.1)",
  },
  trendLabel: {
    ...baseStyles.trendLabel,
    color: "#4a5568",
  },
  trendValue: {
    ...baseStyles.trendValue,
    color: "#2d3748",
  },
  input: {
    ...baseStyles.input,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
  },
  richInput: {
    ...baseStyles.richInput,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
  },
  energyLabel: {
    ...baseStyles.energyLabel,
    color: "#4a5568",
  },
  energyValue: {
    ...baseStyles.energyValue,
    color: "#667eea",
  },
  button: {
    ...baseStyles.button,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  divider: {
    ...baseStyles.divider,
    background: "rgba(0, 0, 0, 0.05)",
  },
  clusterStatsContainer: {
    ...baseStyles.clusterStatsContainer,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  clusterStatsTitle: {
    ...baseStyles.clusterStatsTitle,
    color: "#2d3748",
  },
  clusterStatsRow: {
    ...baseStyles.clusterStatsRow,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  clusterStatsLabel: {
    ...baseStyles.clusterStatsLabel,
    color: "#2d3748",
  },
  clusterStatsValue: {
    ...baseStyles.clusterStatsValue,
    color: "#4a5568",
  },
  clusterLegendWrapper: {
    ...baseStyles.clusterLegendWrapper,
  },
  reclusterButton: {
    ...baseStyles.reclusterButton,
    background: "rgba(0, 0, 0, 0.05)",
    color: "#4a5568",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
  reclusterButtonDisabled: {
    ...baseStyles.reclusterButtonDisabled,
  },
  reclusterError: {
    ...baseStyles.reclusterError,
    background: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    color: "#e53e3e",
  },
  searchInput: {
    ...baseStyles.searchInput,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
  },
  dateSelect: {
    ...baseStyles.dateSelect,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
  },
  energyFilterInput: {
    ...baseStyles.energyFilterInput,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
  },
  tagsFilterInput: {
    ...baseStyles.tagsFilterInput,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
  },
  pillFilterSection: {
    ...baseStyles.pillFilterSection,
  },
  pillFilterLabel: {
    ...baseStyles.pillFilterLabel,
    color: "#4a5568",
  },
  pillButton: {
    ...baseStyles.pillButton,
    background: "rgba(0, 0, 0, 0.03)",
    color: "#4a5568",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
  pillButtonActive: {
    ...baseStyles.pillButtonActive,
    background: "rgba(102, 126, 234, 0.1)",
    borderColor: "rgba(102, 126, 234, 0.3)",
    color: "#667eea",
    boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.1)",
  },
  listTitle: {
    ...baseStyles.listTitle,
    color: "#2d3748",
  },
  clearButton: {
    ...baseStyles.clearButton,
    background: "rgba(239, 68, 68, 0.1)",
    color: "#e53e3e",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  emptyState: {
    ...baseStyles.emptyState,
    background: "rgba(255, 255, 255, 0.5)",
    border: "2px dashed rgba(0, 0, 0, 0.1)",
  },
  emptyText: {
    ...baseStyles.emptyText,
    color: "#4a5568",
  },
  emptySubtext: {
    ...baseStyles.emptySubtext,
    color: "#718096",
  },
  listItem: {
    ...baseStyles.listItem,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  hoverBg: "rgba(255, 255, 255, 0.9)",
  hoverBorder: "rgba(0, 0, 0, 0.1)",
  moodText: {
    ...baseStyles.moodText,
    color: "#2d3748",
  },
  timestamp: {
    ...baseStyles.timestamp,
    color: "#718096",
  },
  detailPanel: {
    ...baseStyles.detailPanel,
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.2)",
  },
  detailPanelTitle: {
    ...baseStyles.detailPanelTitle,
    color: "#2d3748",
  },
  detailPanelClose: {
    ...baseStyles.detailPanelClose,
    color: "#4a5568",
  },
  detailLabel: {
    ...baseStyles.detailLabel,
    color: "#4a5568",
  },
  detailValue: {
    ...baseStyles.detailValue,
    color: "#2d3748",
  },
  similarMoodsSection: {
    ...baseStyles.similarMoodsSection,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  similarMoodsTitle: {
    ...baseStyles.similarMoodsTitle,
    color: "#2d3748",
  },
  similarMoodItem: {
    ...baseStyles.similarMoodItem,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  similarMoodText: {
    ...baseStyles.similarMoodText,
    color: "#2d3748",
  },
  similarMoodTime: {
    ...baseStyles.similarMoodTime,
    color: "#718096",
  },
  chartCard: {
    ...baseStyles.chartCard,
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  chartTitle: {
    ...baseStyles.chartTitle,
    color: "#2d3748",
  },
  gridStroke: "rgba(0, 0, 0, 0.05)",
  tickColor: "#718096",
  axisStroke: "rgba(0, 0, 0, 0.1)",
  tooltipBg: "rgba(255, 255, 255, 0.95)",
  tooltipBorder: "rgba(0, 0, 0, 0.1)",
  tooltipColor: "#2d3748",
  cursorFill: "rgba(0, 0, 0, 0.05)",
};

export default App;
