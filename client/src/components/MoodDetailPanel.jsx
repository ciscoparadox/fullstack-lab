// client/src/components/MoodDetailPanel.jsx
import { parseMoodMetadata } from "../utils/moodUtils";

function MoodDetailPanel({ mood, similarMoods, onClose, onSelectSimilar, styles }) {
  if (!mood) return null;

  const parsed = parseMoodMetadata(mood.mood);

  return (
    <div style={styles.detailPanel}>
      <div style={styles.detailPanelHeader}>
        <h3 style={styles.detailPanelTitle}>Mood Details</h3>
        <button onClick={onClose} style={styles.detailPanelClose}>
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
            {mood.cluster_label || `Cluster ${mood.cluster}`}
          </span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Time:</span>
          <span style={styles.detailValue}>
            {new Date(mood.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
      {/* Similar Moods Section */}
      {similarMoods.length > 0 && (
        <div style={styles.similarMoodsSection}>
          <h4 style={styles.similarMoodsTitle}>Similar moods</h4>
          <ul style={styles.similarMoodsList}>
            {similarMoods.map((similarEntry) => {
              const similarParsed = parseMoodMetadata(similarEntry.mood);
              return (
                <li
                  key={similarEntry.timestamp}
                  style={styles.similarMoodItem}
                  onClick={() => onSelectSimilar(similarEntry)}
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
  );
}

export default MoodDetailPanel;
