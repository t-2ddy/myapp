import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const CLIENT_ID = 'a1051807e7b34d7caf792edfea182fd5';
const CLIENT_SECRET = '0417ca91a9e64d22bd0ad5159d921eb3';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

// Provide a resilient storage layer using Supabase Storage, with in-memory fallback
let redis; // adapter interface: get/set/del
let storageLabel = '[Storage]';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET_NAME || 'spotify-tokens';

if (supabaseUrl && supabaseServiceKey) {
  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  let bucketEnsured = false;
  const ensureBucket = async () => {
    if (bucketEnsured) return;
    try {
      const { error } = await supabase.storage.createBucket(supabaseBucket, { public: false });
      if (error && !String(error?.message || '').toLowerCase().includes('exists')) {
        console.warn('[Supabase] createBucket warning:', error.message);
      }
    } catch (e) {
      // ignore; bucket may already exist
    } finally {
      bucketEnsured = true;
    }
  };

  const toPath = (key) => `${key}.json`;

  redis = {
    async get(key) {
      await ensureBucket();
      const { data, error } = await supabase.storage.from(supabaseBucket).download(toPath(key));
      if (error) return null;
      const buffer = Buffer.from(await data.arrayBuffer());
      const text = buffer.toString('utf8');
      return text;
    },
    async set(key, value /*, options*/) {
      await ensureBucket();
      const body = new Blob([typeof value === 'string' ? value : JSON.stringify(value)], { type: 'application/json' });
      const { error } = await supabase.storage.from(supabaseBucket).upload(toPath(key), body, { upsert: true, contentType: 'application/json' });
      if (error) throw error;
      return 'OK';
    },
    async del(key) {
      await ensureBucket();
      const { error } = await supabase.storage.from(supabaseBucket).remove([toPath(key)]);
      if (error) return 0;
      return 1;
    }
  };
  storageLabel = '[Storage:Supabase]';
  console.log(`${storageLabel} Using Supabase Storage bucket '${supabaseBucket}'`);
} else {
  // Fallback to in-memory store
  const mem = new Map();
  redis = {
    async get(key) {
      const v = mem.get(key);
      return v === undefined ? null : v;
    },
    async set(key, value) {
      mem.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      return 'OK';
    },
    async del(key) {
      return mem.delete(key) ? 1 : 0;
    }
  };
  storageLabel = '[Storage:Memory]';
  console.warn(`${storageLabel} SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set. Using in-memory (non-persistent).`);
}

async function exchangeCodeForToken(code) {
  console.log('Exchanging code for token...');
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://t2ddy-personal.vercel.app'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Code exchange failed:', {
      status: response.status,
      error: errorText,
      code: code
    });
    throw new Error(`Failed to exchange code: ${errorText}`);
  }

  return await response.json();
}

async function refreshAccessToken() {
  const refresh_token = await redis.get('spotify_refresh_token');
  
  if (!refresh_token) {
    console.log('No refresh token available in Redis');
    throw new Error('No refresh token available');
  }

  console.log('Refreshing access token...');
  
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', {
        status: response.status,
        error: errorText,
        refresh_token_length: refresh_token.length
      });
      throw new Error(`Failed to refresh token: ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('REFRESH TOKEN:', tokenData.refresh_token);
    
    // Store tokens atomically
    const storePromises = [
      redis.set('spotify_access_token', tokenData.access_token),
      redis.set('spotify_expires_at', Date.now() + (tokenData.expires_in * 1000))
    ];

    // Only update refresh token if we got a new one
    if (tokenData.refresh_token) {
      storePromises.push(redis.set('spotify_refresh_token', tokenData.refresh_token));
    }

    await Promise.all(storePromises);
    
    console.log('Token refreshed and stored successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    // If refresh fails, clear tokens to force re-authentication
    await Promise.all([
      redis.del('spotify_access_token'),
      redis.del('spotify_refresh_token'),
      redis.del('spotify_expires_at')
    ]);
    throw error;
  }
}

async function getValidAccessToken() {
  try {
    const access_token = await redis.get('spotify_access_token');
    const expires_at = parseInt(await redis.get('spotify_expires_at'));
    const refresh_token = await redis.get('spotify_refresh_token');
    
    console.log('Token check:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresAt: expires_at,
      now: Date.now(),
      expired: expires_at ? Date.now() >= (expires_at - 60000) : true
    });

    // If we have no access token but have refresh token, try refresh
    if (!access_token && refresh_token) {
      console.log('No access token found but have refresh token, attempting refresh...');
      return await refreshAccessToken();
    }

    // If we have no tokens at all, we can't proceed
    if (!access_token && !refresh_token) {
      console.log('No tokens available, authentication required');
      throw new Error('Authentication required');
    }

    // If token is expired and we have refresh token, refresh it
    if (expires_at && Date.now() >= (expires_at - 60000) && refresh_token) {
      console.log('Token expired, refreshing...');
      return await refreshAccessToken();
    }

    // If we have a valid access token, use it
    if (access_token && (!expires_at || Date.now() < (expires_at - 60000))) {
      console.log('Using existing valid access token');
      return access_token;
    }

    // If we get here something is wrong with our token state
    throw new Error('Invalid token state');
  } catch (error) {
    console.error('Error in getValidAccessToken:', error);
    throw error;
  }
}

async function fetchSpotifyData() {
  try {
    const accessToken = await getValidAccessToken();
    console.log('Fetching Spotify data with valid token');

    const currentResponse = await fetch(CURRENTLY_PLAYING_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (currentResponse.status === 200) {
      const currentData = await currentResponse.json();
      if (currentData.is_playing) {
        const trackData = {
          track: currentData.item,
          isPlaying: true,
          lastUpdated: Date.now()
        };
        
        await redis.set('current_track_data', JSON.stringify(trackData), {
          ex: 60
        });
        
        console.log('Currently playing:', currentData.item.name);
        return trackData;
      }
    }

    console.log('Nothing currently playing, fetching recently played...');
    const recentResponse = await fetch(RECENTLY_PLAYED_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      if (recentData.items && recentData.items.length > 0) {
        const trackData = {
          track: recentData.items[0].track,
          isPlaying: false,
          lastUpdated: Date.now()
        };
        
        await redis.set('current_track_data', JSON.stringify(trackData), {
          ex: 60
        });
        
        console.log('Last played:', recentData.items[0].track.name);
        return trackData;
      }
    }
    
    console.log('No track data available');
    return null;
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    return null;
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://t2ddy-personal.vercel.app'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://t2ddy-personal.vercel.app');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url.includes('?') ? req.url.split('?')[0] : req.url;
  
  console.log('API Request:', {
    method: req.method,
    path: path,
    origin: req.headers.origin
  });

  try {
    if (path === '/api/spotify/tokens' && req.method === 'POST') {
      const { code } = req.body;
      
      if (!code) {
        console.error('Token exchange failed: Missing authorization code');
        return res.status(400).json({ 
          success: false, 
          error: 'Missing authorization code' 
        });
      }
      
      try {
        console.log('Starting token exchange process...');
        
        // Exchange the code for tokens
        const tokenData = await exchangeCodeForToken(code);
        
        if (!tokenData.access_token || !tokenData.refresh_token) {
          throw new Error('Invalid token data received from Spotify');
        }
        
        // Store tokens atomically
        const storePromises = [
          redis.set('spotify_access_token', tokenData.access_token),
          redis.set('spotify_refresh_token', tokenData.refresh_token),
          redis.set('spotify_expires_at', Date.now() + (tokenData.expires_in * 1000))
        ];
        
        await Promise.all(storePromises);
        console.log('Tokens stored successfully');

        // Verify tokens were stored
        const [storedAccessToken, storedRefreshToken] = await Promise.all([
          redis.get('spotify_access_token'),
          redis.get('spotify_refresh_token')
        ]);
        
        if (!storedAccessToken || !storedRefreshToken) {
          throw new Error('Token verification failed');
        }

        // Try to fetch track data with new tokens
        const trackData = await fetchSpotifyData();
        
        return res.status(200).json({ 
          success: true,
          trackData: trackData 
        });
      } catch (error) {
        console.error('Token exchange/storage error:', error);
        // Clean up any partially stored tokens
        await Promise.all([
          redis.del('spotify_access_token'),
          redis.del('spotify_refresh_token'),
          redis.del('spotify_expires_at')
        ]);
        
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to exchange/store tokens'
        });
      }
    }

    if (path === '/api/spotify/current-track' && req.method === 'GET') {
      let cachedData = await redis.get('current_track_data');
      
      if (cachedData) {
        if (typeof cachedData === 'string') {
          cachedData = JSON.parse(cachedData);
        }
        
        if (cachedData.lastUpdated && Date.now() - cachedData.lastUpdated > 30000) {
          console.log('Cache stale, fetching fresh data...');
          const freshData = await fetchSpotifyData();
          if (freshData) {
            return res.status(200).json({
              success: true,
              data: freshData
            });
          }
        }
        
        console.log('Returning cached track data');
        return res.status(200).json({
          success: true,
          data: cachedData
        });
      }
      
      console.log('No cached data, fetching fresh...');
      const freshData = await fetchSpotifyData();
      
      return res.status(200).json({
        success: true,
        data: freshData
      });
    }

    if (path === '/api/spotify/status' && req.method === 'GET') {
      try {
        // Get all relevant data
        const [access_token, refresh_token, expires_at, trackData] = await Promise.all([
          redis.get('spotify_access_token'),
          redis.get('spotify_refresh_token'),
          redis.get('spotify_expires_at'),
          redis.get('current_track_data')
        ]);

        const tokenExpired = expires_at && Date.now() >= (parseInt(expires_at) - 60000);
        
        console.log('Status check:', {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          tokenExpired,
          hasTrackData: !!trackData,
          expiresAt: expires_at ? new Date(parseInt(expires_at)).toISOString() : null
        });

        // Try to refresh token if needed
        let authenticated = false;
        if (refresh_token) {
          if (!access_token || tokenExpired) {
            try {
              await refreshAccessToken();
              authenticated = true;
            } catch (refreshError) {
              console.error('Auto-refresh failed during status check:', refreshError);
              authenticated = false;
            }
          } else {
            authenticated = true;
          }
        }
        
        return res.status(200).json({
          authenticated: authenticated || !!(access_token && !tokenExpired),
          hasTrackData: !!trackData,
          needsRefresh: tokenExpired
        });
      } catch (error) {
        console.error('Status check error:', error);
        return res.status(200).json({
          authenticated: false,
          hasTrackData: false,
          error: 'Failed to check authentication status'
        });
      }
    }

    if (path === '/api/spotify/refresh' && req.method === 'POST') {
      console.log('Manual refresh requested');
      const freshData = await fetchSpotifyData();
      return res.status(200).json({ 
        success: true, 
        data: freshData 
      });
    }

    if (path === '/api/health' && req.method === 'GET') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        redis: !!redis
      });
    }

    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}