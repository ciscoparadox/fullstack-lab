import { useState } from "react";

function App() {
  const [mood, setMood] = useState("");
  const [entries, setEntries] = useState([]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!mood.trim()) return;

    const newEntry = {
      mood: mood.trim(),
      timestamp: new Date().toLocaleString(),
    };

    setEntries(prev => [newEntry, ...prev]);
    setMood("");
  }

  return (
    <div style={{ minHeight: "100vh", padding: "2rem", background: "#050816", color: "#f5f5f5" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Fullstack Lab</h1>
      <p>React skeleton is online. Log a mood:</p>

      <form onSubmit={handleSubmit} style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
        <input
          style={{ padding: "0.5rem 0.75rem", marginRight: "0.5rem", minWidth: "260px" }}
          placeholder="tired but wired..."
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        />
        <button type="submit" style={{ padding: "0.5rem 0.9rem", cursor: "pointer" }}>
          Log
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {entries.map((entry, idx) => (
          <li key={idx} style={{ marginBottom: "0.5rem" }}>
            <strong>{entry.mood}</strong>{" "}
            <span style={{ opacity: 0.7 }}>({entry.timestamp})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

