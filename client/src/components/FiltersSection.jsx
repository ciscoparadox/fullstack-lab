// client/src/components/FiltersSection.jsx
import { getClusterColor } from "../utils/moodUtils";

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

function FiltersSection({
  searchQuery,
  setSearchQuery,
  dateRange,
  setDateRange,
  energyFilter,
  setEnergyFilter,
  tagsFilter,
  setTagsFilter,
  selectedCluster,
  setSelectedCluster,
  isSearching,
  styles,
}) {
  return (
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
  );
}

export default FiltersSection;
