import { useState, useEffect, useRef } from 'react'
import './App.css'
import { animate, createScope, stagger } from 'animejs'
import Navbar from './components/Navbar'
import Projects from './components/Projects'
import MySpotifyPlayer from './components/MySpotifyPlayer'
import SpotifyAdminSetup from './components/SpotifyAdminSetup'
import { getBackendAuthStatus, getAuthorizationUrl, exchangeCodeInBackend } from './utils/spotify'

import { PiGithubLogo, PiLinkedinLogo, PiXLogo, PiDiscordLogo } from "react-icons/pi";

function App() {
  const [asciiArt, setAsciiArt] = useState('')
  const [showAdminSetup, setShowAdminSetup] = useState(false)
  const [adminSetupKey, setAdminSetupKey] = useState(0)

  useEffect(() => {
    const checkAndAutoAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Handle callback silently in background, no popup
        if (code) {
          console.log('Spotify callback detected, exchanging code in background');
          await exchangeCodeInBackend(code);
          window.history.replaceState({}, document.title, window.location.pathname);
          setAdminSetupKey(prev => prev + 1);
          return;
        }
        if (error) {
          console.error('Spotify auth error:', error);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // Skip auto-redirect in local development
        if (isLocalhost) {
          console.log('Localhost detected, skipping auto-auth (use Ctrl+Shift+S)');
          return;
        }

        // If not authenticated, auto-redirect to Spotify without showing popup
        try {
          const backendStatus = await getBackendAuthStatus();
          console.log('Auth check:', { backendAuth: backendStatus.authenticated, hasTrackData: backendStatus.hasTrackData });
          if (!backendStatus.authenticated) {
            const authUrl = getAuthorizationUrl();
            console.log('Not authenticated, auto-redirecting to Spotify...');
            window.location.href = authUrl;
          }
        } catch (authError) {
          console.error('Auth check failed:', authError);
        }
      } catch (e) {
        console.error('Error in auto-auth flow:', e);
      }
    };

    checkAndAutoAuth();
  }, []);

  const handleSetupComplete = () => {
    setShowAdminSetup(false);
    setAdminSetupKey(prev => prev + 1);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        console.log('🎵 Admin setup triggered manually with Ctrl+Shift+S');
        setShowAdminSetup(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const socialIcons = [
    {
      href: 'https://discordapp.com/users/840485448458960918',
      Icon: PiDiscordLogo,
      name: 'Discord'
    },
    {
      href: 'https://x.com/_t2ddy',
      Icon: PiXLogo,
      name: 'X'
    },
    {
      href: 'https://www.linkedin.com/in/t2ddy',
      Icon: PiLinkedinLogo,
      name: 'LinkedIn'
    },
    {
      href: 'https://github.com/t-2ddy',
      Icon: PiGithubLogo,
      name: 'GitHub'
    }
  ]

  const courses = [
    {
      title: "CS-250: intro to software systems",
      description: "• A project-based class that provided insight on how to engineer a project from scratch\n• Less code, more about the process and taking everything into consideration\n• Focused on designing and building products systematically",
    },
    {
      title: "CompE-260: data structures",
      description: "• Helped me understand how to apply algorithms and how they work internally\n• Built a better foundation for solving puzzle problems\n• Learned practical applications for different data structures",
    },
    {
      title: "CS-549: machine learning",
      description: "• Learned the process of building and testing my own ML models\n• Worked with the KDD Cup 1999 dataset from the International Knowledge Discovery competition\n• Gained hands-on experience with machine learning workflows",
    },
    {
      title: "CompE-270: digital systems",
      description: "• Assembly-based project class where I made a maze game\n• My first introduction to building anything outside of smaller assignments\n• Learned low-level programming and digital system design",
    }
  ]

  const root = useRef(null)
  const scope = useRef(null)
  
  useEffect(() => {
    fetch('/ascii-art.html')
      .then(response => response.text())
      .then(data => setAsciiArt(data))
  }, [])

  useEffect(() => {
    scope.current = createScope({ root }).add(self => {

      animate('.asciiFade-ani', {
        opacity: [0, 1],
        duration: 1000,
        ease: 'out(3)',
        delay: 450
      }),

      animate('.welcome-ani', {
        translateX: [-300, 0],
        opacity: [0, 1],
        duration: 700,
        ease: 'out(3)',
        delay: 450
      }),

      animate('.header-ani', {
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 500,
        ease: 'out(3)',
        delay: stagger(150, {start: 500}),
      }),

      animate('.icon-ani', {
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 800,
        ease: 'out(3)',
        scale: [0.8, 1],
        delay: stagger(150, {start: 500}),
      }),

      animate('.info-ani', {
        translateY: [300, 0],
        opacity: [0, 1],
        duration: 850,
        ease: 'out(3)',
        delay: stagger(150, {start: 550}),

      })

    })

    return () => scope.current.revert()
  }, [])

  return (
    <>
      <Navbar className='asciiFade-ani'/>
      <div ref={root} className="flex min-h-screen bg-zinc-900 justify-center lowercase pt-10">
        <div className="w-full max-w-md py-6 sm:max-w-xl">
          <div className="text-center text-[5px] leading-[6px] sm:text-[7.7px] sm:leading-[8px] asciiFade-ani" 
               dangerouslySetInnerHTML={{ __html: asciiArt }} 
               style={{ fontFamily: 'monospace'}}
          />
          
          <div className="asciiFade-ani mt-8 mb-8 px-6">
            <MySpotifyPlayer key={adminSetupKey} />
          </div>
          <div className='flex-col px-6 tinos-regular'>
            <div className='flex flex-row justify-center gap-24 sm:gap-36 text-purple-300 mt-8 ease-in-out'>
              {socialIcons.map((social, index) => (
                <a key={index} href={social.href}>
                  <social.Icon target="_blank" className='icon-ani size-6 -mx-2 sm:mx-0 hover:text-violet-500 hover:scale-120 hover:duration-75'/>
                </a>
              ))}
            </div>
            
            <h1 className='welcome-ani text-6xl pt-8 text-neutral-200'>
              welcome!
            </h1>
            
            <div id="about" className="pt-4">
              <h2 className='text-4xl text-neutral-200 header-ani py-2'>
                about me
              </h2>
              
              <p className='text-xl pt-4 text-neutral-200 info-ani'>
                welcome to myapp! my name is theo leonard and this is my passion. i'm a junior 
                at san diego state university and i am currently enrolled under the computer science undergraduate program,
                developing my skills in full-stack development through hands-on projects.
              </p>
            </div>
            
            <div className='flex h-0.5 w-full bg-violet-950 mt-8'/>

            <div id="projects" className="pt-4">
              <Projects/>
            </div>

            <div className='flex h-0.5 w-full bg-violet-950 mt-8'/>

            <div id="courses" className="pt-4">
              <h2 className='text-4xl py-6 text-neutral-200 header-ani'>
                relevant courses
              </h2>
              {courses.map((course, index) =>(
                <div key={index} className='info-ani'>
                  <h3 className='text-2xl py-2 text-purple-300'>
                    {course.title}
                  </h3>
                  <p className='text-xl py-2 text-neutral-200 whitespace-pre-line'>
                    {course.description}
                  </p>
                </div>
              ))}
            </div>

            <div className='flex h-0.5 w-full bg-violet-950 mt-8'/>

          </div>
        </div>
      </div>
      
      {showAdminSetup && (
        <SpotifyAdminSetup onSetupComplete={handleSetupComplete} />
      )}
    </>
  )
}

export default App