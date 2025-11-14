export const baseStyles = {
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

export const stylesDark = {
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

export const stylesLight = {
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
