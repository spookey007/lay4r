"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startLoading = useCallback(() => {
    if (!started) {
      setStarted(true);
      setLoading(true);
      setMessage(bootMessages[0]);
      
      // Start playing audio immediately when launch button is clicked
      if (audioEnabled && audioRef.current) {
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
            <source src="/layer4_xfade.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

    {/* Main Terminal Window */}
    <div className="max-w-md w-full bg-transparent relative z-30">
      {/* Terminal Content */}
      <div className="p-6 text-center space-y-6">
        {/* Disk Insert Animation */}
        <div className="relative mx-auto w-48 h-60 rounded-lg flex items-center justify-center overflow-hidden group">
          <Image
            src="/aceofbase.png"
            alt="System Disk: Ace of Base - The Sign"
            fill
            className="rounded shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-cyan-500/25 object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Glow effect on hover */}
          <div className="absolute inset-0 rounded-lg bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
        </div>

        {/* Audio Toggle - positioned right below the image */}
        <div className="flex justify-center">
          <button
            onClick={toggleAudio}
            className="flex items-center gap-2 px-6 py-3 text-sm font-mono border-2 border-cyan-400 bg-gray-900/80 backdrop-blur-sm text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300 font-bold shadow-[0_0_12px_#00ffff] hover:shadow-[0_0_20px_#00ffff] rounded-lg"
          >
            <span className="text-lg">{audioEnabled ? '🔊' : '🔇'}</span>
            <span>Sound: {audioEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Launch Button */}
        <button
          onClick={startLoading}
          className="w-full py-4 bg-yellow-400 border-2 border-yellow-400 text-black font-bold uppercase tracking-wider text-xl hover:bg-yellow-300 hover:text-gray-900 transition-all duration-300 font-mono group shadow-[0_0_15px_#ffff00] hover:shadow-[0_0_25px_#ffff00] font-extrabold rounded-lg relative overflow-hidden"
        >
          <span className="group-hover:animate-pulse relative z-10">▶ Launch Layer4</span>
          {/* Button glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </button>

      </div>
    </div>

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
      </div>
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
          
          <div className="vintage-container max-w-lg w-full shadow-2xl relative bg-white/95 backdrop-blur-sm z-30 rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Layer4 Boot Sequence</h2>
            </div>
            
            <div className="mb-4 font-mono text-sm h-6 text-gray-700 flex items-center">
              <span className="animate-pulse mr-2">●</span>
              {message}
            </div>
            
            <div className="w-full bg-gray-200 border-2 border-gray-300 rounded-lg mb-6 h-8 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <span className="relative z-10">{progress}%</span>
                {/* Progress bar shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-600 mt-4">
              <p className="font-mono">Layer4 Protocol - Unbreakable Stability</p>
            </div>
          </div>
          </div>
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
