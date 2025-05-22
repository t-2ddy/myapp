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
          <div className='flex flex-row justify-center gap-24 sm:gap-36 text-purple-300 mt-8 ease-in-out'>
            <a href='https://discordapp.com/users/840485448458960918'>
              <PiDiscordLogo className='size-6 hover:text-violet-500 hover:scale-120'/>
            </a>
            <a href='https://x.com/_t2ddy'>
              <PiXLogo className='size-6 hover:text-violet-500 hover:scale-120'/>
            </a>
            <a href='www.linkedin.com/in/t2ddy'>
              <PiLinkedinLogo className='size-6 hover:text-violet-500 hover:scale-120'/>
            </a>
            <a href='https://github.com/t-2ddy'>
              <PiGithubLogo className='size-6 hover:text-violet-500 hover:scale-120'/>
            </a>
            </div>
            <h1 className='text-6xl pt-12 text-neutral-200'>
              welcome!
            </h1>
            <h2 className='text-4xl pt-8 text-neutral-200'>
              about me
            </h2>
            <p className='text-lg pt-4 text-neutral-200'>
              welcome to myapp! my name is theo leonard and this is my passion. i'm a junior 
              at san diego state university and am currently enrolled under the computer science undergraduate program.
            </p>
            <div className='flex h-0.5 w-full bg-violet-950 mt-8'/>
            <h2 className='text-4xl pt-8 text-neutral-200'>
              projects
            </h2>
            <h3 className='text-2xl pt-4 text-neutral-200'>
              Overwatch Hero Guide Web Application
            </h3>
            <h4 className='text-md text-neutral-600 mt-2'>
              React, Vite, JavaScript, Tailwind CSS, MySQL, AWS
            </h4>
            <p className='text-lg pt-4 text-neutral-200'>
              this was my first atempt at a full stack web application and i picked up a lot of tools i still currently use in
              my choice of a tech stack. for frontend: i used react with vite, wrote in javascript and tailwindcss for the frontend
              designing, and made api calls from overfast-api. for backend: i made my own database in sql for specific hero tips and 
              hosted it with aws.
            </p>
            <h3 className='text-2xl pt-4 text-neutral-200'>
              Hololive-Themed Productivity Mobile Application
            </h3>
            <h4 className='text-md text-neutral-600 mt-2'>
              React Native, Expo, TypeScript, NativeWind, OpenAI API, Appwrite
            </h4>
            <p className='text-lg pt-4 text-neutral-200'>
               -- wip -- i wanted to move on and try something new from just a web application, so i decided to try and make a mobile app.
               right now themed as the person in the ascii banner at the top of the page. for frontend im using react-native with expo, writting in typescript
               and nativewind for css. and for backend im using appwrite to handel my authentication and my database for user data as well as making my own api
               to have a character themed chat bot.
            </p>
            <h3 className='text-2xl pt-4 text-neutral-200'>
              this site
            </h3>
            <h4 className='text-md text-neutral-600 mt-2'>
              React, Vite, JavaScript, Tailwind CSS
            </h4>
            <p className='text-lg pt-4 text-neutral-200'>
             ermmmmm im doing this rn
            </p>
            <div className='flex h-0.5 w-full bg-violet-950 mt-8'/>
        </div>
      </div>
    </div>
  )
}

export default App