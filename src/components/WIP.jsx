import { createDraggable, utils } from "animejs"
import { useEffect, useRef, useState } from 'react'

const wipProjects = [
  {
    title: "twitter leetcode bot",
    technologies: "n8n, twitter api, javascript",
    description: "• automating my daily leetcode routine with whiteboarding and notes that are significant for me to remember for later\n• using n8n to schedule the tweets and twitter api to post the tweets \n•looking to pull post content from obsidian vault instead of locally",
    link: null,
    images: []
  },
  {
    title: "umaa agents",
    technologies: "n8n",
    description: "• looking to make 2 different ai agents for my umaa site\n• one agent to help automate the next champtions meetings guides on the site\n• one agent to help users with deck building\n• need to figure out where im getting the uma support card data from and where to get guide content from",
    link: null,
    images: []
  },
];

const WIP = () => {
  const projectScrollRefs = useRef([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImage, setImagesClickable] = useState(null);


  // Helper function to check if a file is a video
  const isVideo = (src) => {
    return src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setImagesClickable(true);
    }, 500);

    projectScrollRefs.current.forEach((ref, index) => {
      if (ref) {
        const project = wipProjects[index];
        const containerWidth = 400;
        const descriptionWidth = 500;
        const imageWidth = 320;
        const spacing = 24;
        const imageCount = project.images ? project.images.length : 0;
        
        // Only create draggable scroll if there are images
        if (imageCount > 0) {
          const totalContentWidth = descriptionWidth + (imageCount * (imageWidth + spacing));
          
          const maxScroll = Math.max(0, totalContentWidth - containerWidth);
          const minScroll = -maxScroll;
          
          createDraggable(ref, {
            y: false,
            modifier: utils.clamp(minScroll, 0),
            onRelease: (draggable) => {
              setTimeout(() => {
                // Only recreate if not currently being grabbed
                if (!draggable.grabbed && !draggable.dragged) {
                  draggable.kill();
                  createDraggable(ref, {
                    y: false,
                    modifier: utils.clamp(minScroll, 0),
                  });
                }
              }, 30);
            }
          });
        }
      }
    });

    return () => {
      clearTimeout(timer);
    };
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

  const renderProjects = (projectsList, startIndex) => {
    return projectsList.map((project, relativeIndex) => {
      const index = startIndex + relativeIndex;
      return (
        <div 
          key={index} 
          className='info-ani'
        >
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
          <h4 className='text-lg text-neutral-600'>
            {project.technologies}
          </h4>
          
          <div 
            className={`relative w-full ${project.images && project.images.length > 0 ? 'overflow-hidden' : ''}`}
          >
            <div 
              ref={(el) => projectScrollRefs.current[index] = el}
              className={`flex space-x-6 ${project.images && project.images.length > 0 ? 'cursor-grab select-none' : ''}`}
              style={{ 
                width: project.images && project.images.length > 0 
                  ? `${400 + (project.images.length * 320 + project.images.length * 24)}px`
                  : '100%',
                transform: `translateX(0px)`
              }}
            >
              <div className="flex-shrink-0 w-[345px] sm:w-[520px] py-6">
                <p className="
                text-xl text-neutral-200 leading-relaxed whitespace-pre-line">
                  {project.description}
                </p>
              </div>

              {project.images?.map((src, i) => (
                <div
                  key={i}
                  className="
                  flex-shrink-0 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => openGallery(project, i)}
                >
                  <div className="flex rounded-2xl relative">
                    {isVideo(src) ? (
                      <>
                        <video
                          src={src}
                          className="w-80 h-44 object-cover object-top select-none rounded-lg pointer-events-none justify-center mt-6"
                          muted
                          loop
                          autoPlay
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-6">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                        </div>
                      </>
                    ) : (
                      <img
                        src={src}
                        alt={`${project.title} screenshot ${i + 1}`}
                        className="w-80 h-44 object-cover object-top select-none rounded-lg pointer-events-none justify-center mt-6"
                        draggable={false}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div>
      {renderProjects(wipProjects, 0)}

    {galleryOpen && currentProject && (
      <div className="fixed inset-0 bg-zinc-900 bg-opacity-90 flex items-center justify-center z-50">
        <div className="sm:max-w-5xl max-w-sm flex items-center justify-center px-10 p-10 sm:px-20">
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 text-white text-5xl hover:text-violet-400 hover:scale-125 ease-in duration-200 transition-transform z-10 bg-zinc-900 rounded-full size-20 flex items-center justify-center"
          >
            ×
          </button>
          {currentProject.images && currentProject.images.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-5xl hover:text-purple-400 hover:scale-125 ease-in duration-200 transition-transform z-10  bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ‹
            </button>
          )}
          {currentProject.images && currentProject.images.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-5xl hover:text-purple-400 hover:scale-125 ease-in duration-200 transition-transform z-10 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ›
            </button>
          )}
          <div className="flex flex-col items-center justify-center">
            {isVideo(currentProject.images[currentImageIndex]) ? (
              <video
                src={currentProject.images[currentImageIndex]}
                className={`object-contain rounded-xl ${
                  currentProject.title.includes("Hololive") 
                    ? "max-w-xs sm:max-w-md max-h-[70vh]" 
                    : "max-w-full max-h-[80vh]"
                }`}
                controls
                autoPlay
                loop
                muted
              />
            ) : (
              <img
                src={currentProject.images[currentImageIndex]}
                alt={`${currentProject.title} screenshot ${currentImageIndex + 1}`}
                className={`object-contain rounded-xl ${
                  currentProject.title.includes("Hololive") 
                    ? "max-w-xs sm:max-w-md max-h-[70vh]" 
                    : "max-w-full max-h-[80vh]"
                }`}
              />
            )}
          </div>
          {currentProject.images && currentProject.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-zinc-900 bg-opacity-50 rounded-lg p-2">
              {currentProject.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => goToImage(i)}
                  className={`w-16 h-10 rounded overflow-hidden border-2 transition-all relative ${
                    i === currentImageIndex
                      ? 'border-purple-400 scale-110'
                      : 'border-neutral-600 hover:border-purple-300'
                  }`}
                >
                  {isVideo(src) ? (
                    <>
                      <video
                        src={src}
                        className="w-full h-full object-cover"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <img
                      src={src}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
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

export default WIP

