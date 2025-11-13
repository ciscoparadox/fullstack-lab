# Semantic Search UI v1

## Placement
- Search bar sits above the “Your Moods” list.
- It uses the same page; no separate screen.

## Behavior
- User types in a query and hits Enter or clicks “Search”.
- Frontend calls `GET /moods/search?query=...`.
- The list below shows ONLY the search results.
- Normal list behavior (click, details, clustering info) still works on results.

## Clear
- Above the list, show: `Search results for: "<query>"`
- Show a “Clear search” button.
- Clicking “Clear search” brings back the full list from `GET /moods`.

