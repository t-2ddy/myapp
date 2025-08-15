const CLIENT_ID = 'a1051807e7b34d7caf792edfea182fd5';

const REDIRECT_URI = 'https://t2ddy-personal.vercel.app';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : 'https://t2ddy-personal.vercel.app/api';

// Spotify Web API endpoints (only used on backend now)
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

// NEW BACKEND API FUNCTIONS

// Exchange authorization code and store tokens in backend (server does both)
export async function exchangeCodeInBackend(code) {
  try {
    const response = await fetch(`${API_BASE_URL}/spotify/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    });

    const json = await response.json().catch(() => ({ success: false }));
    if (!response.ok) {
      console.error('Backend code exchange failed:', json?.error || response.status);
      return { success: false };
    }
    return json;
  } catch (error) {
    console.error('Failed to exchange code in backend:', error);
    return { success: false };
  }
}

// Deprecated: token storage is handled by the backend during code exchange

export async function getCurrentTrackFromBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/spotify/current-track`);

    if (!response.ok) {
      console.error('Failed to fetch track:', response.status);
      return { success: false, data: null };
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch track from backend:', error);
    return { success: false, data: null };
  }
}

export async function getBackendAuthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/spotify/status`);

    if (!response.ok) {
      return { authenticated: false, hasTrackData: false };
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check backend auth status:', error);
    return { authenticated: false, hasTrackData: false };
  }
}

export async function refreshBackendTrackData() {
  try {
    const response = await fetch(`${API_BASE_URL}/spotify/refresh`, {
      method: 'POST'
    });

    if (!response.ok) {
      return { success: false };
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to refresh backend track data:', error);
    return { success: false };
  }
}
