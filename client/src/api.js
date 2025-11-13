// client/src/api.js
const API_URL = "http://localhost:4000";

/**
 * Centralized request helper that handles all API calls
 * @param {string} endpoint - API endpoint (e.g., '/moods')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} If the request fails
 */
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  try {
    const res = await fetch(url, options);
    
    if (!res.ok) {
      // Try to get error details from response
      let errorMessage = `API error: ${res.status} ${res.statusText}`;
      try {
        const errorText = await res.text();
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      } catch (e) {
        // If we can't read the error text, just use the status
      }
      
      // Log warning to console
      console.warn(`[API Error] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    return res.json();
  } catch (err) {
    // Log warning for network errors
    if (!err.message.includes('API error')) {
      const networkError = `Network error: ${err.message}`;
      console.warn(`[Network Error] ${networkError}`);
      throw new Error(networkError);
    }
    // Re-throw API errors (already logged above)
    throw err;
  }
}

/**
 * Fetch all moods from the server
 * @returns {Promise<Array>} Array of mood objects
 */
export async function fetchMoods() {
  return request('/moods');
}

/**
 * Post a new mood to the server
 * @param {string} moodText - The mood text to save
 * @returns {Promise<Object>} The saved mood object with timestamp
 */
export async function postMood(moodText) {
  return request('/moods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mood: moodText }),
  });
}

/**
 * Trigger the clustering script on the server
 * @returns {Promise<Object>} Result object with success status and message
 */
export async function triggerClustering() {
  try {
    return await request('/moods/cluster', {
      method: 'POST',
    });
  } catch (err) {
    // Log error but don't break the UI - clustering is a non-critical enhancement
    console.warn('[triggerClustering] Clustering failed, but mood was saved:', err.message);
    return { success: false, message: err.message };
  }
}

// Export the generic request helper in case we need it elsewhere
export { request as apiRequest };



