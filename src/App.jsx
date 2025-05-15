import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1 className='flex text-center justify-center text-4xl '>
          hello world
        </h1>
      </div>
    </>
  )
}

export default App
