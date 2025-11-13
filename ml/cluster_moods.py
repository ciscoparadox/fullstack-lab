import json
import argparse
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# Threshold for determining cluster quality based on silhouette score
SILHOUETTE_QUALITY_THRESHOLD = 0.3

def preprocess_text(text):
  """
  Preprocess a single mood text.
  
  Args:
    text: Raw mood text
    
  Returns:
    Preprocessed text (lowercase, stripped)
  """
  if pd.isna(text):
    return ""
  return str(text).strip().lower()


def generate_cluster_label(top_terms):
  """
  Generate a human-readable label from top TF-IDF terms.
  
  Args:
    top_terms: List of top terms for the cluster
    
  Returns:
    A hyphen-separated label from the top 3 terms
  """
  if not top_terms:
    return "unknown"
  
  # Take top 3 terms and join them with hyphens
  label_terms = top_terms[:3]
  return "-".join(label_terms)


def main():
  """
  Cluster moods using KMeans and save results for the server.
  """
  # Parse command-line arguments
  parser = argparse.ArgumentParser(description="Cluster moods using KMeans")
  parser.add_argument(
    "--clusters",
    type=int,
    default=3,
    help="Number of clusters to create (default: 3)"
  )
  args = parser.parse_args()
  n_clusters = args.clusters

  print(f"[Cluster Moods] Starting clustering with {n_clusters} clusters\n")

  # 1. Load moods from the server file
  server_moods_path = Path("../server/moods.json")
  if not server_moods_path.exists():
    raise FileNotFoundError("moods.json not found in ../server. Log some moods first.")

  with server_moods_path.open() as f:
    moods_data = json.load(f)

  df = pd.DataFrame(moods_data)  # columns: mood, timestamp

  if df.empty:
    raise ValueError("No moods found to cluster.")

  print(f"[Load] Loaded {len(df)} moods from {server_moods_path}")

  # 2. Preprocess text
  print(f"[Preprocess] Cleaning and preprocessing mood text...")
  df["preprocessed"] = df["mood"].apply(preprocess_text)
  
  # Identify very short moods (length < 3) - exclude from clustering
  df["too_short"] = df["preprocessed"].str.len() < 3
  short_count = df["too_short"].sum()
  
  if short_count > 0:
    print(f"[Preprocess] Found {short_count} very short mood(s) (< 3 chars) - will be excluded from clustering")
  
  # Split into clusterables and non-clusterables
  df_cluster = df[~df["too_short"]].copy()
  df_short = df[df["too_short"]].copy()
  
  if df_cluster.empty:
    raise ValueError("No moods long enough to cluster (all < 3 characters).")
  
  print(f"[Preprocess] {len(df_cluster)} moods ready for clustering")

  # 3. Vectorize text with TF-IDF
  texts = df_cluster["preprocessed"].tolist()
  vectorizer = TfidfVectorizer(
    max_features=500,
    ngram_range=(1, 2),
    stop_words="english",
  )
  X = vectorizer.fit_transform(texts)
  print(f"[Vectorize] Created TF-IDF matrix with {X.shape[0]} samples and {X.shape[1]} features")

  # 4. KMeans clustering
  print(f"[Cluster] Running KMeans with {n_clusters} clusters...")
  kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
  df_cluster["cluster"] = kmeans.fit_predict(X)
  
  # Set cluster to None for short moods
  df_short["cluster"] = None
  
  # Recombine dataframes
  df_combined = pd.concat([df_cluster, df_short], ignore_index=True)
  # Sort by original index to maintain order (use timestamp as proxy)
  df_combined = df_combined.sort_values("timestamp").reset_index(drop=True)

  # 5. Summarize clusters
  print(f"\n[Results] Cluster distribution:")
  cluster_counts = df_cluster["cluster"].value_counts().sort_index()
  for cluster_id, count in cluster_counts.items():
    print(f"  Cluster {cluster_id}: {count} moods")
  
  if short_count > 0:
    print(f"  Unclusterable (too short): {short_count} moods")

  print(f"\n[Results] Top terms per cluster:")
  terms = vectorizer.get_feature_names_out()
  
  # Prepare metadata structure for cluster_meta.json
  cluster_metadata = {
    "clusters": [],
    "quality_score": 0.0,
    "quality_rating": "poor"
  }
  
  # Calculate silhouette score ONLY if we have enough samples
  # Requires: n_clusters >= 2 and at least 2 samples per cluster on average
  try:
    if n_clusters >= 2 and len(df_cluster) >= n_clusters * 2:
      quality_score = silhouette_score(X, df_cluster["cluster"])
      cluster_metadata["quality_score"] = float(quality_score)
      cluster_metadata["quality_rating"] = "good" if quality_score > SILHOUETTE_QUALITY_THRESHOLD else "poor"
      print(f"[Quality] Silhouette score: {quality_score:.3f} ({cluster_metadata['quality_rating']})")
    else:
      print(f"[Quality] Skipping silhouette score: need ≥{n_clusters * 2} samples, have {len(df_cluster)}")
  except Exception as e:
    print(f"[Quality] Failed to calculate silhouette score: {e}")
    # Leave defaults (0.0, "poor")

  for c in range(n_clusters):
    center = kmeans.cluster_centers_[c]
    top_idx = center.argsort()[::-1][:8]
    top_terms = [terms[i] for i in top_idx]
    cluster_size = len(df_cluster[df_cluster["cluster"] == c])
    print(f"  Cluster {c} ({cluster_size} moods): {', '.join(top_terms)}")
    
    # Generate human-readable label from top 3 terms
    cluster_label = generate_cluster_label(top_terms)
    
    # Add to metadata
    cluster_metadata["clusters"].append({
      "id": int(c),
      "label": cluster_label,
      "top_terms": top_terms[:3],  # Store only top 3 for brevity
      "size": int(cluster_size)
    })

  # 6. Save enriched data for the server to use
  output_path = Path("../server/mood_clusters.json")
  # Only keep original columns: mood, timestamp, cluster
  output_df = df_combined[["mood", "timestamp", "cluster"]].copy()
  records = output_df.to_dict(orient="records")

  with output_path.open("w") as f:
    json.dump(records, f, indent=2)

  print(f"\n[Save] Saved {len(records)} clustered moods to {output_path}")

  # 7. Save cluster metadata (ALWAYS do this, even if scoring failed)
  meta_output_path = Path("../server/cluster_meta.json")
  with meta_output_path.open("w") as f:
    json.dump(cluster_metadata, f, indent=2)
    
  print(f"[Save] Saved cluster metadata to {meta_output_path}")
  print("[Done] Clustering complete!")


if __name__ == "__main__":
  main()

  







