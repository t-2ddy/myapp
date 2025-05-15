import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1 className='flex text-center justify-center text-4xl '>
          hello world, this is a test a very long test to see if the text will go off screen
        </h1>
      </div>
    </>
  )
}

export default App
