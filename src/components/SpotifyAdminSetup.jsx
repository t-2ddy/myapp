import { useState, useEffect } from 'react';
import { 
  getAuthorizationUrl, 
  getAccessToken, 
  adminTokenStorage,
  storeTokensInBackend
} from '../utils/spotify';

const SpotifyAdminSetup = ({ onSetupComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('ready'); // ready, processing, success, error

  // Check for callback on component mount
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        console.error('Spotify auth error:', error);
        // Clear URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        setIsProcessing(true);
        setStatus('processing');
        
        try {
          const tokenData = await getAccessToken(code);
          
          // Store tokens locally AND in backend
          adminTokenStorage.setTokens(tokenData);
          await storeTokensInBackend(tokenData);
          
          setStatus('success');
          
          // Clear URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Notify parent component
          setTimeout(() => {
            onSetupComplete?.();
          }, 1500);
          
        } catch (err) {
          console.error('Token exchange/storage error:', err);
          setStatus('error');
          // Clear URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
          setIsProcessing(false);
        }
      }
    };

    handleCallback();
  }, [onSetupComplete]);

  const handleLogin = () => {
    const authUrl = getAuthorizationUrl();
    window.location.href = authUrl;
  };

  const handleReset = () => {
    adminTokenStorage.clearTokens();
    setStatus('ready');
  };

  if (status === 'processing') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-zinc-800 rounded-lg p-8 max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-neutral-200 mb-2">
            Setting up Spotify...
          </h2>
          <p className="text-neutral-400">
            Connecting your account for music display
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-zinc-800 rounded-lg p-8 max-w-md mx-auto text-center">
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-neutral-200 mb-2">
            Setup Complete!
          </h2>
          <p className="text-neutral-400">
            Your Spotify is now connected and will display to all visitors
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-zinc-800 rounded-lg p-8 max-w-md mx-auto text-center">
          <div className="text-red-500 text-4xl mb-4">✗</div>
          <h2 className="text-xl font-semibold text-neutral-200 mb-2">
            Setup Failed
          </h2>
          <p className="text-neutral-400 mb-6">
            There was an error connecting to Spotify.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleLogin}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
            >
              Try Again
            </button>
            <button
              onClick={() => setStatus('ready')}
              className="bg-zinc-600 hover:bg-zinc-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial setup screen
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-lg p-8 max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">🎵</div>
        <h2 className="text-2xl font-semibold text-neutral-200 mb-4">
          Setup Your Spotify Display
        </h2>
        <p className="text-neutral-400 mb-6">
          Connect your Spotify account to show what you're listening to. 
          Visitors will see your music without needing to sign in themselves.
        </p>
        
        <div className="bg-zinc-700/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-neutral-200 mb-2">What happens:</h3>
          <ul className="text-sm text-neutral-400 space-y-1">
            <li>• You'll be redirected to Spotify's secure login</li>
            <li>• Your credentials are never stored in the app</li>
            <li>• Visitors see your current/recent tracks publicly</li>
            <li>• Updates automatically every 30 seconds</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleLogin}
            disabled={isProcessing}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Connect Spotify
          </button>
          
          {adminTokenStorage.isAuthenticated() && (
            <button
              onClick={handleReset}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Reset Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotifyAdminSetup;
