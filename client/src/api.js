const API_URL = "http://localhost:4000";

/**
 * Generic API request handler
 * @param {string} endpoint - API endpoint (e.g., '/moods')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} If the request fails
 */
async function apiRequest(endpoint, options = {}) {
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
      throw new Error(errorMessage);
    }
    
    return res.json();
  } catch (err) {
    // Re-throw with more context if it's a network error
    if (err.message.includes('API error')) {
      throw err;
    }
    throw new Error(`Network error: ${err.message}`);
  }
}

/**
 * Fetch all moods from the server
 * @returns {Promise<Array>} Array of mood objects
 */
export async function fetchMoods() {
  return apiRequest('/moods');
}

/**
 * Post a new mood to the server
 * @param {string} moodText - The mood text to save
 * @returns {Promise<Object>} The saved mood object with timestamp
 */
export async function postMood(moodText) {
  return apiRequest('/moods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mood: moodText }),
  });
}

// Export the generic client in case we need it elsewhere
export { apiRequest };








