import { useState, useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { 
  getCurrentTrackFromBackend,
  getBackendAuthStatus
} from '../utils/spotify';

const MySpotifyPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const recordRef = useRef(null);
  const animationRef = useRef(null);

  // Fetch current or recent track data from backend
  const fetchTrackData = async () => {
    try {
      setError(null);

      // Get track data from backend (public endpoint)
      const response = await getCurrentTrackFromBackend();
      
      if (response.success && response.data) {
        setCurrentTrack(response.data.track);
        setIsPlaying(response.data.isPlaying);
      } else {
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Error fetching track data:', err);
      setError('Unable to load music data');
      setCurrentTrack(null);
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    // Always try to fetch track data - backend handles authentication
    fetchTrackData();
  }, []);

  // Handle record spinning animation
  useEffect(() => {
    if (recordRef.current) {
      if (isPlaying) {
        // Start spinning animation
        animationRef.current = animate(recordRef.current, {
          rotate: '360deg',
          duration: 3000,
          loop: true,
          easing: 'linear'
        });
      } else {
        // Stop spinning animation
        if (animationRef.current) {
          animationRef.current.pause();
          animationRef.current = null;
        }
      }
    }

    // Cleanup function
    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  // Refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchTrackData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-4 w-full">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-zinc-700 rounded-full animate-pulse flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-zinc-700 rounded animate-pulse mb-2"></div>
            <div className="h-2 bg-zinc-700 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !currentTrack) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-4 w-full">
        <div className="flex items-center space-x-3 text-neutral-400">
          <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs">♪</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">Music data unavailable</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-4 w-full">
        <div className="flex items-center space-x-3 text-neutral-400">
          <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs">♪</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">No recent tracks</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-4 w-full border border-zinc-700/50">
      <div className="flex items-center space-x-3">
        {/* Record Player */}
        <div className="relative w-12 h-12 flex-shrink-0">
          {/* Vinyl Record */}
          <div 
            ref={recordRef}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-900 to-black border-2 border-zinc-600 relative"
          >
            {/* Album art in center */}
            {currentTrack.album?.images?.[0] && (
              <img
                src={currentTrack.album.images[0].url}
                alt={currentTrack.album.name}
                className="w-6 h-6 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover"
              />
            )}
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-zinc-400 rounded-full"></div>
            
            {/* Vinyl grooves */}
            <div className="absolute inset-0.5 rounded-full border border-zinc-700 opacity-30"></div>
            <div className="absolute inset-1 rounded-full border border-zinc-700 opacity-20"></div>
            <div className="absolute inset-1.5 rounded-full border border-zinc-700 opacity-10"></div>
          </div>
          
          {/* Turntable arm */}
          <div className="absolute -top-0.5 -right-0.5 w-3 h-0.5 bg-zinc-600 rounded-sm transform rotate-45 origin-bottom-left"></div>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isPlaying 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-zinc-600/20 text-zinc-400 border border-zinc-600/30'
            }`}>
              {isPlaying ? '🎵 listening' : '🎶 last played'}
            </span>
          </div>
          
          <h3 className="text-base font-semibold text-neutral-200 truncate leading-tight">
            {currentTrack.name}
          </h3>
          
          <p className="text-neutral-400 text-sm truncate">
            {currentTrack.artists?.map(artist => artist.name).join(', ')}
          </p>
        </div>

        {/* Spotify logo */}
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default MySpotifyPlayer;
