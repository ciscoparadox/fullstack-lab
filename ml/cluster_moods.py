import json
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

# 1. Load moods from the server file
server_moods_path = Path("../server/moods.json")
if not server_moods_path.exists():
  raise FileNotFoundError("moods.json not found in ../server. Log some moods first.")

with server_moods_path.open() as f:
  moods_data = json.load(f)

df = pd.DataFrame(moods_data)  # columns: mood, timestamp

if df.empty:
  raise ValueError("No moods found to cluster.")

# 2. Vectorize text with TF-IDF
texts = df["mood"].astype(str).tolist()
vectorizer = TfidfVectorizer(
  max_features=500,
  ngram_range=(1, 2),
  stop_words="english",
)
X = vectorizer.fit_transform(texts)

# 3. KMeans clustering
n_clusters = 3
kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
df["cluster"] = kmeans.fit_predict(X)

# 4. Summarize clusters
print(f"Cluster counts:\n{df['cluster'].value_counts()}\n")

terms = vectorizer.get_feature_names_out()
for c in range(n_clusters):
  center = kmeans.cluster_centers_[c]
  top_idx = center.argsort()[::-1][:8]
  top_terms = [terms[i] for i in top_idx]
  print(f"Cluster {c}: top terms -> {top_terms}")

# 5. Save enriched data for the server to use
output_path = Path("../server/mood_clusters.json")
records = df.to_dict(orient="records")

with output_path.open("w") as f:
  json.dump(records, f, indent=2)

print(f"\nSaved clustered moods to {output_path}")

















