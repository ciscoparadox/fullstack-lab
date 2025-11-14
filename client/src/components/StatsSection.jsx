// client/src/components/StatsSection.jsx

function StatsSection({ stats, mostFrequent, styles }) {
  if (!stats || stats.total === 0) {
    return (
      <div className="empty-stats" style={styles.emptyStatsContainer}>
        <p style={styles.emptyStatsText}>
          📊 Stats will appear once you log some moods
        </p>
      </div>
    );
  }

  return (
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
  );
}

export default StatsSection;
