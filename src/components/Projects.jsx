import { createDraggable, utils } from "animejs"
import { useEffect, useRef, useState } from 'react'

import owHeros    from '/images/ow_heros.png'
import owHome     from '/images/ow_home.png'
import owWelcome  from '/images/ow_welcome.png'
import hhAuth1    from '/images/hh_auth1.png'
import hhAuth2    from '/images/hh_auth2.png'
import hhAuth3    from '/images/hh_auth3.png'
import hhHome     from '/images/hh_home.png'
import hhTowa     from '/images/hh_towa.png'
import hhMessages from '/images/hh_messages.png'

const Projects = () => {
  const projectScrollRefs = useRef([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesClickable, setImagesClickable] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setImagesClickable(true);
    }, 1500);

    projectScrollRefs.current.forEach((ref, index) => {
      if (ref) {
        const project = projects[index];
        const containerWidth = 400;
        const descriptionWidth = 500;
        const imageWidth = 320;
        const spacing = 24;
        const imageCount = project.images ? project.images.length : 0;
        
        const totalContentWidth = descriptionWidth + (imageCount * (imageWidth + spacing));
        
        const maxScroll = Math.max(0, totalContentWidth - containerWidth);
        const minScroll = -maxScroll;
        
        createDraggable(ref, {
          y: false,
          modifier: utils.clamp(minScroll, 0),
          onRelease: () => {
            createDraggable(ref, {
              y: false,
              modifier: utils.clamp(minScroll, 0),
            });
          }
        });
      }
    });

    return () => clearTimeout(timer);
  }, []);

  const openGallery = (project, imageIndex) => {
    setCurrentProject(project);
    setCurrentImageIndex(imageIndex);
    setGalleryOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeGallery = () => {
    setGalleryOpen(false);
    setCurrentProject(null);
    setCurrentImageIndex(0);
    document.body.style.overflow = 'unset';
  };

  const nextImage = () => {
    if (currentProject && currentProject.images) {
      setCurrentImageIndex((prev) => 
        prev === currentProject.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (currentProject && currentProject.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? currentProject.images.length - 1 : prev - 1
      );
    }
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!galleryOpen) return;
      
      if (e.key === 'Escape') {
        closeGallery();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [galleryOpen]);

  const projects = [
    {
      title: "Overwatch Hero Guide Web Application",
      technologies: "React, Vite, JavaScript, Tailwind CSS, MySQL, AWS",
      description: "this was my first atempt at a full stack web application and i picked up a lot of tools i still currently use in my choice of a tech stack. for frontend: i used react with vite, wrote in javascript and tailwindcss for the frontend and made api calls from overfast-api. for backend: i made my own database in sql for specific hero tips and hosted it with aws.",
      link: "https://ow-app-ten.vercel.app/",
      images: [
        owHome,
        owHeros,
        owWelcome,
      ]
    },
    {
      title: "Hololive-Themed Productivity Mobile Application",
      technologies: "React Native, Expo, TypeScript, NativeWind, OpenAI API, Appwrite",
      description: "-- wip -- i wanted to move on and try something new from just a web application, so i decided to try and make a mobile app. right now themed as the person in the ascii banner at the top of the page. for frontend im using react-native with expo, writting in typescript and nativewind for css. and for backend im using appwrite to handle my authentication and my database for user data as well as making my own api to have a character themed chat bot.",
      images: [
        hhAuth1,
        hhAuth2,
        hhAuth3,
        hhHome,
        hhTowa,
        hhMessages,
      ]
    },
    {
      title: "myapp - this site",
      technologies: "React, Vite, JavaScript, Tailwind CSS, Anime.js",
      description: "-- wip -- personal web-app / portfolio / blog / idk"
    }
  ];

  return (
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
              <span className='hover:text-violet-500 hover:cursor-not-allowed hover:scale-105 transition-all duration-200 inline-block py-4'>
                {project.title}
              </span>
            )}
          </h3>
          <h4 className='text-md text-neutral-600 mt-2'>
            {project.technologies}
          </h4>
          
          <div className="relative w-full overflow-hidden">
            <div 
              ref={(el) => projectScrollRefs.current[index] = el}
              className="flex space-x-6 cursor-grab select-none"
              style={{ 
                width: `${400 + (project.images ? project.images.length * 320 + project.images.length * 24 : 0)}px`,
                transform: `translateX(0px)`
              }}
            >
              <div className="flex-shrink-0 w-[345px] sm:w-[520px] py-6 shadow-lg">
                <p className="text-lg text-neutral-200 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {project.images?.map((src, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => openGallery(project, i)}
                >
                  <div className="flex rounded-2xl">
                  <img
                    src={src}
                    alt={`${project.title} screenshot ${i + 1}`}
                    className="w-80 h-52 object-cover object-top select-none rounded-lg pointer-events-none justify-center mt-6"
                    draggable={false}
                  />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {galleryOpen && currentProject && (
        <div className="fixed inset-0 bg-zinc-900 bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-6xl max-h-full w-full h-full flex items-center justify-center p-4">

            <button
              onClick={closeGallery}
              className="absolute top-4 right-4 text-white text-4xl hover:text-violet-400 transition-colors z-10 bg-zinc-900 bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ×
            </button>

            {currentProject.images && currentProject.images.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-violet-600 text-4xl hover:text-purple-400 transition-colors z-10  bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ‹
              </button>
            )}

            {currentProject.images && currentProject.images.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-violet-600 text-4xl hover:text-purple-400 transition-colors z-10 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ›
              </button>
            )}

            <div className="flex flex-col items-center justify-center max-w-full max-h-full">
              <img
                src={currentProject.images[currentImageIndex]}
                alt={`${currentProject.title} screenshot ${currentImageIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            </div>

            {currentProject.images && currentProject.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-zinc-900 bg-opacity-50 rounded-lg p-2">
                {currentProject.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => goToImage(i)}
                    className={`w-16 h-10 rounded overflow-hidden border-2 transition-all ${
                      i === currentImageIndex 
                        ? 'border-purple-400 scale-110' 
                        : 'border-neutral-600 hover:border-purple-300'
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects