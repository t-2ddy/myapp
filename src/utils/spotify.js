const CLIENT_ID = 'a1051807e7b34d7caf792edfea182fd5';
const CLIENT_SECRET = '0417ca91a9e64d22bd0ad5159d921eb3';

// Always use production URL for OAuth redirect to avoid localhost security issues
const REDIRECT_URI = 'https://t2ddy-personal.vercel.app';

// Spotify Web API endpoints
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

// Get authorization URL for admin login (your initial setup)
export function getAuthorizationUrl() {
  const scopes = [
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-read-playback-state'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: scopes,
    redirect_uri: REDIRECT_URI,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function getAccessToken(code) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return await response.json();
}

// Refresh access token
export async function refreshAccessToken(refreshToken) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

// Get currently playing track
export async function getCurrentlyPlaying(accessToken) {
  const response = await fetch(CURRENTLY_PLAYING_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 204) {
    return null; // Nothing currently playing
  }

  if (!response.ok) {
    throw new Error('Failed to get currently playing track');
  }

  return await response.json();
}

// Get recently played tracks
export async function getRecentlyPlayed(accessToken) {
  const response = await fetch(RECENTLY_PLAYED_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get recently played tracks');
  }

  const data = await response.json();
  return data.items[0]; // Return the most recent track
}

// Admin token storage (for your authentication only)
export const adminTokenStorage = {
  getTokens: () => {
    const accessToken = localStorage.getItem('admin_spotify_access_token');
    const refreshToken = localStorage.getItem('admin_spotify_refresh_token');
    const expiresAt = localStorage.getItem('admin_spotify_expires_at');
    
    return { 
      accessToken, 
      refreshToken, 
      expiresAt: expiresAt ? parseInt(expiresAt) : null 
    };
  },

  setTokens: (tokenData) => {
    localStorage.setItem('admin_spotify_access_token', tokenData.access_token);
    if (tokenData.refresh_token) {
      localStorage.setItem('admin_spotify_refresh_token', tokenData.refresh_token);
    }
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);
    localStorage.setItem('admin_spotify_expires_at', expiresAt.toString());
  },

  clearTokens: () => {
    localStorage.removeItem('admin_spotify_access_token');
    localStorage.removeItem('admin_spotify_refresh_token');
    localStorage.removeItem('admin_spotify_expires_at');
  },

  isTokenValid: () => {
    const { accessToken, expiresAt } = adminTokenStorage.getTokens();
    return accessToken && expiresAt && Date.now() < (expiresAt - 60000); // 1 minute buffer
  },

  isAuthenticated: () => {
    const { accessToken, refreshToken } = adminTokenStorage.getTokens();
    return !!(accessToken || refreshToken);
  }
};

// Get valid access token (handles refresh automatically)
export async function getValidAccessToken() {
  const { accessToken, refreshToken } = adminTokenStorage.getTokens();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  if (adminTokenStorage.isTokenValid()) {
    return accessToken;
  }

  // Token expired, refresh it
  try {
    const tokenData = await refreshAccessToken(refreshToken);
    adminTokenStorage.setTokens(tokenData);
    return tokenData.access_token;
  } catch (error) {
    // Refresh failed, clear tokens
    adminTokenStorage.clearTokens();
    throw new Error('Token refresh failed');
  }
}
