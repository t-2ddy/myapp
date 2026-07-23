#!/usr/bin/env node
/**
 * One-command helper to get a fresh Spotify refresh token.
 *
 * Why this exists: production reads SPOTIFY_REFRESH_TOKEN from a Vercel
 * env var, and Spotify's authorization codes are one-time-use and expire
 * fast. Running the OAuth flow against the production site means the
 * frontend races you to exchange (and burn) the code before you can copy
 * it. This script runs a temporary local callback server instead, so the
 * code comes straight to your terminal and nothing else can consume it.
 *
 * Usage:
 *   npm run get-spotify-token
 *
 * Requires SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET to be set (e.g. via
 * `.env.local` and Node's --env-file flag, wired up in package.json).
 *
 * One-time setup: add http://127.0.0.1:9999/callback as a Redirect URI
 * for this app in the Spotify Developer Dashboard.
 */

import http from 'node:http';

const PORT = process.env.SPOTIFY_LOCAL_CALLBACK_PORT || 9999;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-read-playback-state'
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\nMissing SPOTIFY_CLIENT_ID and/or SPOTIFY_CLIENT_SECRET.');
  console.error('Create myapp/.env.local with both values, then run:');
  console.error('  npm run get-spotify-token\n');
  process.exit(1);
}

function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error_description || data?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function sendHtml(res, status, title, body) {
  res.writeHead(status, { 'Content-Type': 'text/html' });
  res.end(`<html><body style="font-family: sans-serif; padding: 40px;">
    <h2>${title}</h2><p>${body}</p></body></html>`);
}

let server;
let finished = false;

function finish(exitCode) {
  if (finished) return;
  finished = true;
  server.close();
  process.exit(exitCode);
}

server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    sendHtml(res, 400, 'Spotify auth failed', 'You can close this tab.');
    console.error(`\nSpotify returned an error: ${error}\n`);
    finish(1);
    return;
  }

  if (!code) {
    sendHtml(res, 400, 'No code received', 'You can close this tab.');
    finish(1);
    return;
  }

  sendHtml(res, 200, 'Success', 'You can close this tab and go back to your terminal.');

  try {
    const tokenData = await exchangeCodeForToken(code);

    if (!tokenData.refresh_token) {
      throw new Error('No refresh_token in response - check the scopes/app config');
    }

    console.log('\n' + '='.repeat(60));
    console.log('New refresh token:');
    console.log(tokenData.refresh_token);
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Vercel -> your project -> Settings -> Environment Variables');
    console.log('2. Set SPOTIFY_REFRESH_TOKEN to the value above (Production)');
    console.log('3. Redeploy');
    console.log('4. Verify: curl -s https://t2ddy-personal.vercel.app/api/spotify/status\n');

    finish(0);
  } catch (err) {
    console.error(`\nToken exchange failed: ${err.message}`);
    console.error('The code may have expired or already been used - run this script again.\n');
    finish(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\nOpen this URL in your browser and approve access:\n');
  console.log(buildAuthorizeUrl());
  console.log(`\nWaiting for the callback on ${REDIRECT_URI} ...`);
});

process.on('SIGINT', () => {
  console.log('\nCancelled.');
  finish(1);
});
