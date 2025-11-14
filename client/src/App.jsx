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
import { parseMoodMetadata, getClusterColor, getClusterStyle } from "./utils/moodUtils";
import { stylesDark, stylesLight } from "./styles/appStyles";
import StatsSection from "./components/StatsSection";
import TrendsSection from "./components/TrendsSection";
import MoodForm from "./components/MoodForm";
import FiltersSection from "./components/FiltersSection";
import MoodList from "./components/MoodList";
import "./App.css";

const API_URL = "http://localhost:4000";

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
          `${API_URL}/moods/search?query=${encodeURIComponent(searchQuery.trim())}&limit=20`
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
          <StatsSection stats={stats} mostFrequent={mostFrequent} styles={styles} />

          {/* Trends Section */}
          <TrendsSection trends={trends} hasEntries={entries.length > 0} styles={styles} />

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

          <MoodForm
            mood={mood}
            setMood={setMood}
            title={title}
            setTitle={setTitle}
            tags={tags}
            setTags={setTags}
            energy={energy}
            setEnergy={setEnergy}
            isClustering={isClustering}
            styles={styles}
            onSubmit={handleSubmit}
          />

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
          <FiltersSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            dateRange={dateRange}
            setDateRange={setDateRange}
            energyFilter={energyFilter}
            setEnergyFilter={setEnergyFilter}
            tagsFilter={tagsFilter}
            setTagsFilter={setTagsFilter}
            selectedCluster={selectedCluster}
            setSelectedCluster={setSelectedCluster}
            isSearching={isSearching}
            styles={styles}
          />

          {/* MoodList Component - replaces the inline list section */}
          <MoodList
            entries={filteredEntries}
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
            similarMoods={similarMoods}
            isLoading={isLoading}
            hasTextOrDateFilters={hasTextOrDateFilters}
            selectedCluster={selectedCluster}
            styles={styles}
            onClearList={handleClearList}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
