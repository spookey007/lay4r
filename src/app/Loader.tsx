"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import CircularGallery from './components/CircularGallery';

// Typewriter Text Component
const TypewriterText = ({ text, speed = 100 }: { text: string; speed?: number }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <span>
      {displayText}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="ml-1"
      >
        |
      </motion.span>
    </span>
  );
};

export default function Loader({ children }: { children: React.ReactNode }) {
  const bootMessages = [
    "Checking Layer4 hardware...",
    "Loading Layer4 OS modules...",
    "Initializing memory...",
    "Mounting Layer4 disk...",
    "Starting Layer4 GUI...",
    "Configuring crypto modules...",
    "Syncing blockchain...",
    "Almost there...",
    "Welcome to Layer4!",
  ];
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<string | null>(null);
  const currentMusicRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);

  // Handle music selection change - just set up the audio file for loader
  const handleMusicSelection = useCallback((item: { image: string; text: string; music?: string }, index: number) => {
    console.log('🎵 [LOADER MUSIC SELECTION]', {
      item: item,
      index: index,
      music: item.music,
      image: item.image,
      text: item.text
    });
    
    if (item.music) {
      setCurrentMusic(item.music);
      currentMusicRef.current = item.music;
      console.log('🎵 [MUSIC SET]', {
        previousMusic: currentMusicRef.current,
        newMusic: item.music
      });
      
      // Just set up the audio file for the loader, don't play immediately
      if (musicRef.current) {
        musicRef.current.src = item.music;
        musicRef.current.load(); // Load the audio file
        console.log('🎵 [AUDIO LOADED]', {
          src: musicRef.current.src,
          readyState: musicRef.current.readyState
        });
      }
    } else {
      console.log('🎵 [NO MUSIC]', 'Item has no music property');
    }
  }, []); // Remove currentMusic dependency to prevent re-creation

  const startLoading = useCallback(() => {
    if (!started) {
      setStarted(true);
      setLoading(true);
      setMessage(bootMessages[0]);
      
      // Start playing audio immediately when launch button is clicked
      if (audioEnabled && audioRef.current) {
        // Use selected music if available, otherwise default to aceofbase.mp3
        const musicToPlay = currentMusicRef.current || "/aceofbase.mp3";
        audioRef.current.src = musicToPlay;
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        setAudioStarted(true);
      }
    }
  }, [started, audioEnabled]);

  const toggleAudio = useCallback(() => {
    if (audioRef.current) {
      if (audioEnabled) {
        audioRef.current.pause();
        setAudioEnabled(false);
      } else {
        // Use selected music if available, otherwise default to aceofbase.mp3
        const musicToPlay = currentMusicRef.current || "/aceofbase.mp3";
        audioRef.current.src = musicToPlay;
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        setAudioEnabled(true);
      }
    }
  }, [audioEnabled]);

  const startAudio = useCallback(async () => {
    if (audioRef.current && audioEnabled) {
      try {
        // Use selected music if available, otherwise default to aceofbase.mp3
        const musicToPlay = currentMusicRef.current || "/aceofbase.mp3";
        audioRef.current.src = musicToPlay;
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
        await audioRef.current.play();
        setAudioStarted(true);
        setShowAudioPrompt(false);
      } catch (error) {
        console.log("Audio autoplay failed:", error);
        setShowAudioPrompt(true);
      }
    }
  }, [audioEnabled]);

  const handleVideoLoad = useCallback(() => {
    setVideoLoaded(true);
  }, []);

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.log("Video failed to load:", e);
    const videoElement = e.target as HTMLVideoElement;
    videoElement.style.display = 'none';
  }, []);

  useEffect(() => {
    if (started) {
      const timer = setTimeout(() => {
        // Only call startAudio if audio hasn't been started yet
        if (!audioStarted) {
          startAudio();
        }
      }, 1000);

      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + Math.floor(Math.random() * 10) + 5;
          if (newProgress >= 100) {
            clearInterval(interval);
            setLoading(false);
            return 100;
          }
          return newProgress;
        });

        setMessage((prevMessage) => {
          const currentIndex = bootMessages.indexOf(prevMessage);
          if (currentIndex < bootMessages.length - 1) {
            return bootMessages[currentIndex + 1];
          }
          return prevMessage;
        });
      }, 800);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [started, audioStarted]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !started) {
        startLoading();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [started]);

  if (!started) {
    return (
      <>
        <audio ref={audioRef} preload="auto">
          <source src="/aceofbase.mp3" type="audio/mpeg" />
        </audio>
        <audio ref={musicRef} preload="auto" />
        <motion.div
          className="flex flex-col items-center justify-center min-h-screen bg-white p-4 relative"
          style={{
            fontFamily: "'LisaStyle', monospace"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Video Background - Smooth Loading Only */}
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-2000 ease-in-out ${
              videoLoaded ? 'opacity-100' : 'opacity-100'
            }`}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          >
            <source src="/layer4_xfade.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

    {/* Main Terminal Window */}
    <motion.div 
      className="max-w-md w-full bg-transparent relative z-30"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
    >
      {/* Terminal Content */}
      <motion.div 
        className="p-6 text-center space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        {/* Circular Gallery Disk Selection */}
        <motion.div 
          className="relative mx-auto"
          initial={{ scale: 0.8, opacity: 0, rotateY: -15 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{ 
            delay: 0.7, 
            duration: 1,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
        >
          <div style={{ height: '600px', position: 'relative' }}>
            <CircularGallery 
              bend={3} 
              textColor="#ffffff" 
              borderRadius={0.05} 
              scrollEase={0.02}
              onSelectionChange={handleMusicSelection}
            />
          </div>
        </motion.div>

        {/* Audio Toggle - positioned right below the image */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <motion.button
            onClick={toggleAudio}
            className="flex items-center gap-2 px-6 py-3 text-sm font-mono border-2 border-cyan-400 bg-gray-900/80 backdrop-blur-sm text-cyan-400 font-bold shadow-[0_0_12px_#00ffff] rounded-lg"
            whileHover={{ 
              scale: 1.05,
              backgroundColor: "#00ffff",
              color: "#000000",
              boxShadow: "0 0 25px #00ffff"
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span 
              className="text-lg"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </motion.span>
            <span>Sound: {audioEnabled ? 'ON' : 'OFF'}</span>
          </motion.button>
        </motion.div>

        {/* Launch Button */}
        <motion.button
          onClick={startLoading}
          className="w-full py-4 bg-yellow-400 border-2 border-yellow-400 text-black font-bold uppercase tracking-wider text-xl font-mono group shadow-[0_0_15px_#ffff00] font-extrabold rounded-lg relative overflow-hidden"
          whileHover={{ 
            scale: 1.02,
            boxShadow: "0 0 30px #ffff00",
            backgroundColor: "#fbbf24"
          }}
          whileTap={{ 
            scale: 0.98,
            boxShadow: "0 0 20px #ffff00"
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            delay: 0.5
          }}
        >
          <motion.span 
            className="relative z-10"
            whileHover={{ scale: 1.05 }}
            animate={{ 
              textShadow: [
                "0 0 0px #000000",
                "0 0 10px #ffff00",
                "0 0 0px #000000"
              ]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            ▶ Launch Layer4
          </motion.span>
          
          {/* Animated glow effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.3 }}
            animate={{
              background: [
                "linear-gradient(90deg, #fbbf24, #f59e0b)",
                "linear-gradient(90deg, #f59e0b, #fbbf24)",
                "linear-gradient(90deg, #fbbf24, #f59e0b)"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              opacity: { duration: 0.3 }
            }}
          />
          
          {/* Ripple effect on click */}
          <motion.div
            className="absolute inset-0 bg-white opacity-0"
            whileTap={{ 
              opacity: 0.3,
              scale: 1.1
            }}
            transition={{ duration: 0.1 }}
          />
        </motion.button>

      </motion.div>
    </motion.div>

    {/* Enhanced Glitch Effect */}
    <style jsx>{`
      @keyframes glitch {
        0% { opacity: 1; transform: translateX(0); }
        2% { opacity: 0.8; transform: translateX(-1px); }
        4% { opacity: 1; transform: translateX(1px); }
        6% { opacity: 0.9; transform: translateX(-1px); }
        8% { opacity: 1; transform: translateX(0); }
        100% { opacity: 1; transform: translateX(0); }
      }
      @keyframes scanline {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100vh); }
      }
      .glitch-active {
        animation: glitch 0.3s ease-in-out;
      }
      .scanline {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.3), transparent);
        animation: scanline 3s linear infinite;
        pointer-events: none;
        z-index: 25;
      }
    `}</style>
      </motion.div>
    </>
  );
  }

  if (loading) {
    return (
      <>
        <audio ref={audioRef} preload="auto">
          <source src="/aceofbase.mp3" type="audio/mpeg" />
        </audio>
        <div
          className="flex flex-col items-center justify-center min-h-screen bg-white p-4 relative"
          style={{
            fontFamily: "'LisaStyle', monospace"
          }}
        >
          {/* Video Background - Smooth Loading Only */}
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-2000 ease-in-out ${
              videoLoaded ? 'opacity-100' : 'opacity-100'
            }`}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          >
            <source src="/layer4.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          <motion.div 
            className="vintage-container max-w-lg w-full shadow-2xl relative bg-white/95 backdrop-blur-sm z-30 rounded-lg border border-gray-200"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              duration: 0.8
            }}
          >
            <div className="p-6">
              <motion.div 
                className="flex justify-between items-center mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <motion.h2 
                  className="text-xl font-bold text-gray-800 font-mono"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <TypewriterText text="Layer4 Boot Sequence" speed={80} />
                </motion.h2>
              </motion.div>
              
              <motion.div 
                className="mb-4 font-mono text-sm h-6 text-gray-700 flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <motion.span 
                  className="mr-2"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  ●
                </motion.span>
                <motion.span
                  key={message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <TypewriterText text={message} speed={50} />
                </motion.span>
              </motion.div>
              
              <motion.div 
                className="w-full bg-gray-200 border-2 border-gray-300 rounded-lg mb-6 h-8 overflow-hidden"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-lg flex items-center justify-center text-white text-xs font-bold relative"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.span 
                    className="relative z-10"
                    key={progress}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {progress}%
                  </motion.span>
                  
                  {/* Enhanced shimmer effect */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ 
                      x: ["-100%", "100%"],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="text-center text-xs text-gray-600 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <motion.p 
                  className="font-mono"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                >
                  <TypewriterText text="Layer4 Protocol - Unbreakable Stability" speed={80} />
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <audio ref={audioRef} preload="auto">
        <source src="/aceofbase.mp3" type="audio/mpeg" />
      </audio>
      {children}
    </>
  );
}
