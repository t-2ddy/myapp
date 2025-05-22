import { useState, useEffect } from 'react'
import './App.css'

import { PiGithubLogo, PiLinkedinLogo, PiXLogo, PiDiscordLogo } from "react-icons/pi";


function App() {
  const [asciiArt, setAsciiArt] = useState('')
  
  useEffect(() => {
    fetch('/ascii-art.html')
      .then(response => response.text())
      .then(data => setAsciiArt(data))
  }, [])
  
  return (
    <div className="flex min-h-screen bg-zinc-900 justify-center">
      <div className="w-full max-w-md py-12 sm:max-w-xl">
        <div className="text-center text-[6px] leading-[6px] sm:text-[8px] sm:leading-[9px]" 
             dangerouslySetInnerHTML={{ __html: asciiArt }} 
             style={{ fontFamily: 'monospace'}}
        />
        <div className='flex-col px-6 tinos-regular '>
          <div className='flex flex-row justify-center gap-24 sm:gap-36 text-purple-300 mt-8'>
            <a href='https://discordapp.com/users/840485448458960918'>
              <PiDiscordLogo className='size-6'/>
            </a>
            <a href='https://x.com/_t2ddy'>
              <PiXLogo className='size-6'/>
            </a>
            <a href='www.linkedin.com/in/t2ddy'>
              <PiLinkedinLogo className='size-6'/>
            </a>
            <a href='https://github.com/t-2ddy'>
              <PiGithubLogo className='size-6'/>
            </a>
            </div>
            <h1 className='text-4xl pt-12 text-neutral-200'>
              welcome!
            </h1>
            <h2 className='text-2xl pt-8 text-neutral-200'>
              about me
            </h2>
            <p className='text-lg pt-4 text-neutral-200'>
              welcome to myapp! my name is theo leonard and this is my passion. i'm a junior 
              at san diego state university and am currently enrolled under the computer science undergraduate program.
            </p>
        </div>
      </div>
    </div>
  )
}

export default App