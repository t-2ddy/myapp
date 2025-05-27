import { useState, useEffect, useRef } from 'react'
import './App.css'
import { animate, createScope, stagger } from 'animejs'
import Navbar from './components/Navbar'

import { PiGithubLogo, PiLinkedinLogo, PiXLogo, PiDiscordLogo } from "react-icons/pi";

function App() {
  const [asciiArt, setAsciiArt] = useState('')
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

  const projects = [
  {
    title: "Overwatch Hero Guide Web Application",
    technologies: "React, Vite, JavaScript, Tailwind CSS, MySQL, AWS",
    description: "this was my first atempt at a full stack web application and i picked up a lot of tools i still currently use in my choice of a tech stack. for frontend: i used react with vite, wrote in javascript and tailwindcss for the frontend and made api calls from overfast-api. for backend: i made my own database in sql for specific hero tips and hosted it with aws.",
    link:"https://ow-app-ten.vercel.app/"
  },
  {
    title: "Hololive-Themed Productivity Mobile Application",
    technologies: "React Native, Expo, TypeScript, NativeWind, OpenAI API, Appwrite",
    description: "-- wip -- i wanted to move on and try something new from just a web application, so i decided to try and make a mobile app. right now themed as the person in the ascii banner at the top of the page. for frontend im using react-native with expo, writting in typescript and nativewind for css. and for backend im using appwrite to handle my authentication and my database for user data as well as making my own api to have a character themed chat bot."
  },
  {
    title: "myapp - this site",
    technologies: "React, Vite, JavaScript, Tailwind CSS, Anime.js",
    description: "-- wip -- personal web-app / portfolio / blog / idk"
    }
  ]

  const courses = [
    {
      title:"CS-250: intro to software systems",
      description:"a project based class that provided insite on how to engineer a project from scratch. less code more about the proces and taking everything into consideration when designing and building a product",
    },
    {
      title:"CompE-260: data structures",
      description:"helped me with my understanding of how to apply algorithems and how they work internally. in short, this class helps me look at puzzle problems now with a better foundation of the application for data structures",
    },
    {
      title:"CS-549: machine learning",
      description:"i learned the process of building and testing my own machine learning models, stemming from the kdd cup 1999 third International Knowledge Discovery and Data Mining Tools Competition data set",
    },
    {
      title:"CompE-270: digital systems",
      description:"assembly based project class where i made a maze game. this was my first introduction to building anything outside of smaller scale assignments",
    }
  ]

  const root = useRef(null) //search for ani target
  const scope = useRef(null) //organize the animations...the "scope of the animaitons"
  
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
        delay: 300
      }),

      animate('.welcome-ani', {
        translateX: [-300, 0],
        opacity: [0, 1],
        duration: 500,
        ease: 'out(3)',
        delay: 300
      }),

      animate('.header-ani', {
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 500,
        ease: 'out(3)',
        delay: stagger(150, {start: 300}),
      }),

      animate('.icon-ani', {
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 500,
        ease: 'out(3)',
        scale: [0.8, 1],
        delay: stagger(150, {start: 325}),
      }),

      animate('.info-ani', {
        translateY: [300, 0],
        opacity: [0, 1],
        duration: 800,
        ease: 'out(3)',
        delay: stagger(150, {start: 300}),

      })

    })

    return () => scope.current.revert()
  }, [])

  return (
    <>
      <Navbar className='asciiFade-ani'/>
      <div ref={root} className="flex min-h-screen bg-zinc-900 justify-center lowercase pt-20">
        <div className="w-full max-w-md py-12 sm:max-w-xl">
          <div className="text-center text-[5px] leading-[6px] sm:text-[8px] sm:leading-[9px] asciiFade-ani" 
               dangerouslySetInnerHTML={{ __html: asciiArt }} 
               style={{ fontFamily: 'monospace'}}
          />
          <div className='flex-col px-6 tinos-regular'>
            <div className='flex flex-row justify-center gap-24 sm:gap-36 text-purple-300 mt-8 ease-in-out'>
              {socialIcons.map((social, index) => (
                <a key={index} href={social.href}>
                  <social.Icon className='icon-ani size-6 -mx-2 sm:mx-0 hover:text-violet-500 hover:scale-120 hover:duration-75'/>
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
              
              <p className='text-lg pt-4 text-neutral-200 info-ani'>
                welcome to myapp! my name is theo leonard and this is my passion. i'm a junior 
                at san diego state university and i am currently enrolled under the computer science undergraduate program,
                developing my skills in full-stack development through hands-on projects.
              </p>
            </div>
            
            <div className='flex h-0.5 w-full bg-violet-950 mt-8'/>

            <div id="projects" className="pt-4">
              <h2 className='text-4xl py-6 text-neutral-200 header-ani'>
                projects
              </h2>
              
              {projects.map((project, index) => (
                <div key={index} className='info-ani'>
                  <h3 className='text-2xl py-3 text-purple-300'>
                    {project.link ? (
                      <a 
                        href={project.link} 
                        className='hover:text-violet-500 hover:cursor-pointer hover:scale-105 transition-all duration-200 inline-block'
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {project.title}
                      </a>
                    ) : (
                      <span className='hover:text-violet-500 hover:cursor-not-allowed hover:scale-105 transition-all duration-200 inline-block'>
                        {project.title}
                      </span>
                    )}
                  </h3>
                  <h4 className='text-md text-neutral-600 mt-2'>
                    {project.technologies}
                  </h4>
                  <p className='text-lg pt-4 text-neutral-200'>
                    {project.description}
                  </p>
                </div>
              ))}
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
                  <p className='text-lg py-2 text-neutral-200'>
                    {course.description}
                  </p>
                </div>
              ))}
            </div>

            <div className='flex h-0.5 w-full bg-violet-950 mt-8'/>

          </div>
        </div>
      </div>
    </>
  )
}

export default App