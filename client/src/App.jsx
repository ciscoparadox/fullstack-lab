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

function ClusterLegend({ clusters }) {
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
    </div>
  );
}

function App() {
  const [mood, setMood] = useState("");
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClustering, setIsClustering] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [theme, setTheme] = useState("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("all");

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

    try {
      const saved = await postMood(mood);
      setEntries((prev) => [...prev, saved]);
      setMood("");

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

  // Filter entries based on selected cluster, search query, and date range
  const filteredEntries = useMemo(() => {
    let result = entries;
    
    // Apply cluster filter
    if (selectedCluster !== "all") {
      const clusterNum = Number(selectedCluster);
      result = result.filter(entry =>
        entry.cluster !== null &&
        entry.cluster !== undefined &&
        entry.cluster === clusterNum
      );
    }
    
    // Apply text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(entry => 
        entry.mood.toLowerCase().includes(query)
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
    
    return result;
  }, [entries, selectedCluster, searchQuery, dateRange]);

  const mostFrequent = getMostFrequentMood();

  const styles = theme === "dark" ? stylesDark : stylesLight;

  return (
    <div className="app-root">
      <div className="app-container" style={styles.container}>
        <div className="app-card" style={styles.card}>
          <div className="app-header" style={styles.header}>
            <h1 style={styles.title}>✨ Fullstack Lab</h1>
            <p style={styles.subtitle}>Fullstack mood tracker (React + Express)</p>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="theme-toggle"
              style={styles.themeToggle}
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
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

          <ClusterLegend clusters={uniqueClusters} />

          <form onSubmit={handleSubmit} className="app-form" style={styles.form}>
            <input
              style={styles.input}
              placeholder="How are you feeling? (e.g., tired but wired...)"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              disabled={isClustering}
            />
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

          <div className="list-section" style={styles.listSection}>
            {/* Search and Date Filters */}
            <div className="filters-wrapper" style={styles.filtersWrapper}>
              <input
                type="text"
                placeholder="Search moods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
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
                {filteredEntries.map((entry) => (
                  <li
                    key={entry.timestamp}
                    style={{
                      ...styles.listItem,
                      ...getClusterStyle(entry.cluster),
                    }}
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
                      <span style={styles.moodText}>{entry.mood}</span>
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
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const stylesDark = {
  container: {
    background: "linear-gradient(135deg, #050816 0%, #0a1128 100%)",
    color: "#f5f5f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  header: {
    color: "#cbd5e0",
  },
  themeToggle: {
    background: "rgba(255, 255, 255, 0.05)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  title: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    color: "#a0aec0",
  },
  clusteringIndicator: {
    background: "rgba(102, 126, 234, 0.15)",
    border: "1px solid rgba(102, 126, 234, 0.3)",
  },
  clusteringText: {
    color: "#a5b4fc",
  },
  qualityWarning: {
    background: "rgba(234, 179, 8, 0.15)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
  },
  qualityWarningText: {
    color: "#facc15",
  },
  emptyStatsContainer: {
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.15)",
  },
  emptyStatsText: {
    color: "#a0aec0",
  },
  statsSection: {},
  statCard: {
    background: "rgba(102, 126, 234, 0.1)",
    border: "1px solid rgba(102, 126, 234, 0.2)",
  },
  statLabel: {
    color: "#a0aec0",
  },
  statValue: {
    color: "#e2e8f0",
  },
  statCount: {
    color: "#a0aec0",
  },
  form: {},
  input: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
  },
  button: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    background: "rgba(255, 255, 255, 0.1)",
  },
  filterSection: {},
  filterButton: {
    background: "rgba(255, 255, 255, 0.05)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  filterButtonActive: {
    background: "rgba(102, 126, 234, 0.2)",
    borderColor: "rgba(102, 126, 234, 0.4)",
    color: "#a5b4fc",
  },
  listSection: {},
  listHeader: {},
  listTitle: {
    color: "#e2e8f0",
  },
  clearButton: {
    background: "rgba(239, 68, 68, 0.1)",
    color: "#fca5a5",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  loadingContainer: {},
  loading: {
    color: "#a0aec0",
  },
  emptyState: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "2px dashed rgba(255, 255, 255, 0.1)",
  },
  emptyText: {
    color: "#cbd5e0",
  },
  emptySubtext: {
    color: "#718096",
  },
  list: {},
  listItem: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  hoverBg: "rgba(255, 255, 255, 0.05)",
  hoverBorder: "rgba(255, 255, 255, 0.12)",
  moodContent: {},
  moodText: {
    color: "#e2e8f0",
  },
  timestamp: {
    color: "#718096",
  },
  chartCard: {
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  chartTitle: {
    color: "#e2e8f0",
  },
  chartContainer: {},
  gridStroke: "rgba(255, 255, 255, 0.05)",
  tickColor: "#a0aec0",
  axisStroke: "rgba(255, 255, 255, 0.1)",
  tooltipBg: "rgba(0, 0, 0, 0.8)",
  tooltipBorder: "rgba(255, 255, 255, 0.1)",
  tooltipColor: "#f5f5f5",
  cursorFill: "rgba(255, 255, 255, 0.05)",
  pillFilterSection: {},
  pillFilterLabel: {
    color: "#a0aec0",
  },
  pillButton: {
    background: "rgba(255, 255, 255, 0.05)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  pillButtonActive: {
    background: "rgba(102, 126, 234, 0.2)",
    borderColor: "rgba(102, 126, 234, 0.4)",
    color: "#a5b4fc",
    boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.2)",
  },
  filtersWrapper: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "200px",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
    transition: "border-color 0.2s ease",
  },
  dateSelect: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#f5f5f5",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  }
};

const stylesLight = {
  container: {
    background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
    color: "#1a202c",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
  header: {
    color: "#2d3748",
  },
  themeToggle: {
    background: "rgba(0, 0, 0, 0.05)",
    color: "#4a5568",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
  title: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    color: "#4a5568",
  },
  clusteringIndicator: {
    background: "rgba(102, 126, 234, 0.1)",
    border: "1px solid rgba(102, 126, 234, 0.2)",
  },
  clusteringText: {
    color: "#667eea",
  },
  qualityWarning: {
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.2)",
  },
  qualityWarningText: {
    color: "#b7791f",
  },
  emptyStatsContainer: {
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.1)",
  },
  emptyStatsText: {
    color: "#718096",
  },
  statsSection: {},
  statCard: {
    background: "rgba(102, 126, 234, 0.05)",
    border: "1px solid rgba(102, 126, 234, 0.15)",
  },
  statLabel: {
    color: "#4a5568",
  },
  statValue: {
    color: "#2d3748",
  },
  statCount: {
    color: "#718096",
  },
  form: {},
  input: {
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
  },
  button: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    background: "rgba(0, 0, 0, 0.05)",
  },
  filterSection: {},
  filterButton: {
    background: "rgba(0, 0, 0, 0.03)",
    color: "#4a5568",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
  filterButtonActive: {
    background: "rgba(102, 126, 234, 0.1)",
    borderColor: "rgba(102, 126, 234, 0.3)",
    color: "#667eea",
  },
  listSection: {},
  listHeader: {},
  listTitle: {
    color: "#2d3748",
  },
  clearButton: {
    background: "rgba(239, 68, 68, 0.1)",
    color: "#e53e3e",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  loadingContainer: {},
  loading: {
    color: "#718096",
  },
  emptyState: {
    background: "rgba(255, 255, 255, 0.5)",
    border: "2px dashed rgba(0, 0, 0, 0.1)",
  },
  emptyText: {
    color: "#4a5568",
  },
  emptySubtext: {
    color: "#718096",
  },
  list: {},
  listItem: {
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  hoverBg: "rgba(255, 255, 255, 0.9)",
  hoverBorder: "rgba(0, 0, 0, 0.1)",
  moodContent: {},
  moodText: {
    color: "#2d3748",
  },
  timestamp: {
    color: "#718096",
  },
  chartCard: {
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  chartTitle: {
    color: "#2d3748",
  },
  chartContainer: {},
  gridStroke: "rgba(0, 0, 0, 0.05)",
  tickColor: "#718096",
  axisStroke: "rgba(0, 0, 0, 0.1)",
  tooltipBg: "rgba(255, 255, 255, 0.95)",
  tooltipBorder: "rgba(0, 0, 0, 0.1)",
  tooltipColor: "#2d3748",
  cursorFill: "rgba(0, 0, 0, 0.05)",
  pillFilterSection: {},
  pillFilterLabel: {
    color: "#4a5568",
  },
  pillButton: {
    background: "rgba(0, 0, 0, 0.03)",
    color: "#4a5568",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
  pillButtonActive: {
    background: "rgba(102, 126, 234, 0.1)",
    borderColor: "rgba(102, 126, 234, 0.3)",
    color: "#667eea",
    boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.1)",
  },
  filtersWrapper: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "200px",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
    transition: "border-color 0.2s ease",
  },
  dateSelect: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
    color: "#2d3748",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  }
};

export default App;
