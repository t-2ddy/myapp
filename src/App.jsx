import { useState, useEffect } from 'react'
import './App.css'

import { IconName } from "react-icons/fa6";


function App() {
  const [asciiArt, setAsciiArt] = useState('')
  
  useEffect(() => {
    fetch('/ascii-art.html')
      .then(response => response.text())
      .then(data => setAsciiArt(data))
  }, [])
  
  return (
    <div className="flex min-h-screen bg-zinc-900 justify-center">
      <div className="w-full max-w-xl py-12">
        <div className="p-4 text-center" 
             dangerouslySetInnerHTML={{ __html: asciiArt }} 
             style={{ fontFamily: 'monospace', fontSize: '7px', lineHeight: '9px' }}
        />
        <div className='flex-row px-6 tinos-regular'>

          <h1 className='text-4xl pt-12'>
            welcome!
          </h1>
          <h2 className='text-2xl pt-8'>
            about me
          </h2>
          <p className='text-lg pt-4'>
            welcome to myapp! my name is theo leonard and this is my passion. i'm a junior 
            at san diego state university and am currently enrolled under the computer science undergraduate program.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App