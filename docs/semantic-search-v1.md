# Semantic Search v1 – `GET /moods/search`

## 1. Goal

Add a `GET /moods/search?query=...` endpoint that lets users search their existing mood entries by text. Version 1 uses **simple, case-insensitive substring search on the existing `mood` field only**—no embeddings, no vector search yet. The endpoint should feel fast, predictable, and return mood objects in the **same shape** as `GET /moods`, including any clustering metadata.

---

## 2. Endpoint

**Route**

* `GET /moods/search`

**Query parameters**

* `query` (required, string)

  * The text to search for within the `mood` field.
* `limit` (optional, integer)

  * Maximum number of results to return.
  * Default: `20`
  * Maximum: `100` (values above 100 are treated as 100).

**Example requests**

* `/moods/search?query=wire`
* `/moods/search?query=tired%20but%20wired&limit=10`
* `/moods/search?query=anxious&limit=50`

---

## 3. Search behavior

**Matching rules (V1)**

* Perform a **case-insensitive substring match** on the `mood` field of each stored mood.

  * Example: `query="wire"` should match `"Tired but Wired [title=...]"`.
* Trim whitespace from `query` before using it.
* If `query` is **missing** or becomes an empty string after trimming:

  * Return `400` with a JSON error payload (see Response section).

**Result ordering**

* Results are ordered by **`timestamp` descending** (most recent first).
* Only moods with a valid string `mood` field and a valid `timestamp` are considered.

**Data source**

* Reuse the same source of truth as `GET /moods`:

  * For V1, it’s acceptable to load moods from existing storage (file/DB) and filter in memory, as long as performance is reasonable for current scale.

---

## 4. Response shape & edge cases

**Base response shape**

* On success, the endpoint returns a JSON array of mood objects in the **same shape as `GET /moods`**, for example:

```json
[
  {
    "mood": "tired but wired [title=Late night grind; tags=work,focus; energy=7]",
    "timestamp": "2025-11-06T12:34:56.000Z",
    "cluster": 1,
    "cluster_label": "high energy reflective",
    "quality_rating": "good"
  }
]
```

* All fields present in `GET /moods` responses (e.g. `cluster`, `cluster_label`, `quality_rating`) should be preserved exactly; **no new fields are required for V1**.

**Status codes & edge cases**

* **200 OK**

  * Returned when the request is valid and search completes successfully.
  * Body is:

    * A non-empty array of mood objects if matches are found, or
    * `[]` if there are no matching moods.

* **400 Bad Request**

  * Returned when `query` is missing, `null`, or empty after `.trim()`.
  * Example response:

  ```json
  {
    "error": "query is required"
  }
  ```

* **500 Internal Server Error**

  * Returned when an unexpected error occurs (e.g. storage read failure, JSON parse error).
  * Should reuse the existing error middleware style, e.g.:

  ```json
  {
    "error": "Internal server error"
  }
  ```

  * Actual logging details stay on the server side.

**Limit handling**

* If `limit` is omitted, treat it as `20`.
* If `limit` is provided and:

  * `< 1` → treat as `1`.
  * `> 100` → treat as `100`.
* Apply `limit` **after** filtering and sorting.

---

## 5. V2 (embeddings) upgrade path

In a future version, semantic search can be upgraded to use embeddings while keeping the same overall response shape so the frontend doesn’t break.

**High-level V2 plan**

* **Embedding generation (Python ML)**

  * Use a sentence transformer or similar model in `cluster_moods.py` (or a new script) to:

    * Compute an embedding vector for each mood’s text (`mood` field).
    * Store embeddings alongside moods (either in Postgres as a `VECTOR`/`JSONB` field or in a dedicated vector store).

* **Query flow for `/moods/search?query=...` (V2)**

  * On request:

    1. Embed the `query` text using the same model.
    2. Perform nearest-neighbor search (e.g., cosine similarity) against stored embeddings.
    3. Retrieve the top `N` moods and return them in the **same shape** as `GET /moods` / V1 search.
  * Optionally include an extra field like `"score": number` (similarity), but this should be additive, not breaking.

* **Backward compatibility**

  * Keep the route, query parameters, and base response fields identical.
  * Frontend continues working without any changes; it simply gets better, semantically relevant results.
  * V1 substring search logic can remain as a fallback (e.g., when embeddings are unavailable or fail).

