// client/src/components/MoodForm.jsx

function MoodForm({
  mood,
  setMood,
  title,
  setTitle,
  tags,
  setTags,
  energy,
  setEnergy,
  isClustering,
  styles,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="app-form" style={styles.form}>
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
  );
}

export default MoodForm;
