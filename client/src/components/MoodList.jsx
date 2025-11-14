// client/src/components/MoodList.jsx
import { parseMoodMetadata, getClusterStyle } from "../utils/moodUtils";
import MoodDetailPanel from "./MoodDetailPanel";

function MoodList({
  entries,
  selectedMood,
  setSelectedMood,
  similarMoods,
  isLoading,
  hasTextOrDateFilters,
  selectedCluster,
  styles,
  onClearList,
}) {
  return (
    <div className="list-section" style={styles.listSection}>
      <div className="list-header" style={styles.listHeader}>
        <h2 style={styles.listTitle}>Your Moods</h2>
        {!isLoading && entries.length > 0 && (
          <button
            onClick={onClearList}
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
      ) : entries.length === 0 ? (
        <div className="empty-state" style={styles.emptyState}>
          <p style={styles.emptyText}>
            {hasTextOrDateFilters
              ? "No moods match these filters"
              : selectedCluster === "all"
              ? "No moods logged yet."
              : `No moods in Cluster ${selectedCluster}.`}
          </p>
          <p style={styles.emptySubtext}>
            {hasTextOrDateFilters
              ? "Try adjusting your search or filters 👆"
              : selectedCluster === "all"
              ? "Start by logging how you're feeling above! 👆"
              : "Try selecting a different cluster or log more moods! 👆"}
          </p>
        </div>
      ) : (
        <ul className="moods-list" style={styles.list}>
          {entries.map((entry) => {
            const parsed = parseMoodMetadata(entry.mood);
            const isSelected = selectedMood?.timestamp === entry.timestamp;

            return (
              <div key={entry.timestamp} style={{ marginBottom: "0.5rem" }}>
                {isSelected && (
                  <MoodDetailPanel
                    mood={selectedMood}
                    similarMoods={similarMoods}
                    onClose={() => setSelectedMood(null)}
                    onSelectSimilar={setSelectedMood}
                    styles={styles}
                  />
                )}
                <li
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
  );
}

export default MoodList;
