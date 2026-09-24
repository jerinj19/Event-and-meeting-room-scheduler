const API_BASE = 'http://localhost:8000';

/**
 * Fetch wrapper that injects Authorization headers and automatically
 * refreshes expired access tokens transparently.
 */
export async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');

  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  const headers = {
    'Content-Type': 'application/json',
    'X-Timezone': clientTimezone,
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(url, { ...options, headers });

  // If token is invalid or expired (401), attempt transparent token refresh
  if (res.status === 401 && refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        token = refreshData.access;
        localStorage.setItem('access_token', token);

        // Retry original request with newly refreshed token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${token}`,
        };
        res = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        // Refresh token also invalid - session truly expired
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    } catch {
      // Network error during refresh
    }
  }

  return res;
}

export default fetchWithAuth;
