import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className='flex min-h-screen bg-zinc-900 justify-center'>
        <div className='w-full max-w-sm'>
          <h1 className='text-center text-4xl text-neutral-300'>
            hello world, this is a test a very long test to see if the text will go off screen
          </h1>
        </div>
      </div>
    </>
  )
}
export default App
