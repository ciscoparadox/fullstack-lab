// client/src/components/TrendsSection.jsx

function TrendsSection({ trends, hasEntries, styles }) {
  if (!hasEntries) {
    return null;
  }

  return (
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
  );
}

export default TrendsSection;
