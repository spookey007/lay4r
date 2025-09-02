"use client";
import React, { useEffect, useState, useRef } from "react";
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
  const audioRef = useRef<HTMLAudioElement>(null);

  const startLoading = () => {
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
  };

  const toggleAudio = () => {
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
  };

  const startAudio = async () => {
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
  };

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
          className="flex flex-col items-center justify-center min-h-screen bg-white p-4"
          style={{
            fontFamily: "'LisaStyle', monospace",
            backgroundImage: "url('/logo02.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >

    {/* CRT Scanlines Overlay (retro feel) */}
    <div className="pointer-events-none fixed inset-0 opacity-20 z-10" style={{
      backgroundImage: `
        repeating-linear-gradient(
          0deg,
          rgba(0, 255, 0, 0.03),
          rgba(0, 255, 0, 0.03) 1px,
          transparent 1px,
          transparent 2px
        )
      `,
    }}></div>

    {/* Main Terminal Window */}
    <div className="max-w-md w-full bg-transparent">
      


      {/* Terminal Content */}
      <div className="p-6 text-center space-y-6">
        
        {/* Disk Insert Animation */}
        <div className="relative mx-auto w-48 h-60 rounded-lg flex items-center justify-center overflow-hidden">
          <Image
            src="/aceofbase.png"
            alt="System Disk: Ace of Base - The Sign"
            fill
            className="rounded shadow-lg transition-transform hover:scale-105 duration-300 object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Audio Toggle - positioned right below the image */}
        <div className="flex justify-center">
          <button
            onClick={toggleAudio}
            className="flex items-center gap-2 px-4 py-2 text-sm font-mono border-2 border-cyan-400 bg-gray-900 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300 font-bold shadow-[0_0_8px_#00ffff]"
          >
            {audioEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'}
          </button>
        </div>

        {/* Launch Button */}
        <button
          onClick={startLoading}
          className="w-full py-4 bg-yellow-400 border-2 border-yellow-400 text-black-400 font-bold uppercase tracking-wider text-xl hover:bg-yellow-400 hover:text-gray-900 transition-all duration-300 font-mono group shadow-[0_0_12px_#ffff00] font-extrabold"
        >
          <span className="group-hover:animate-pulse">▶ Launch Layer4</span>
        </button>

      </div>
    </div>

    {/* Optional: Glitch Effect on Click (add to body or use JS later) */}
    <style jsx>{`
      @keyframes glitch {
        0% { opacity: 1; }
        2% { opacity: 0; transform: translateX(2px); }
        4% { opacity: 1; }
        100% { opacity: 1; }
      }
      .glitch-active {
        animation: glitch 0.3s ease-in-out;
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
          className="flex flex-col items-center justify-center min-h-screen bg-white p-4"
          style={{
            fontFamily: "'LisaStyle', monospace",
            backgroundImage: "url('/logo02.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >
          <div className="vintage-container max-w-lg w-full shadow-lg relative bg-white bg-opacity-90">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Layer4 Boot Sequence</h2>
            {/* <div className="flex gap-1">
              <div className="w-3 h-3 bg-[#ff5f57] rounded-full"></div>
              <div className="w-3 h-3 bg-[#ffbd2e] rounded-full"></div>
              <div className="w-3 h-3 bg-[#28c940] rounded-full"></div>
            </div> */}
          </div>
          
          <div className="mb-2 font-mono text-sm h-6">{message}</div>
          
          <div className="w-full bg-white border-2 border-[#808080] rounded mb-6 h-6">
            <div 
              className="bg-[#0000ff] h-full rounded flex items-center justify-center text-white text-xs font-bold transition-all duration-300"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
          
          {/* {showAudioPrompt && (
            <div className="border-2 border-[#808080] rounded bg-white p-4 mb-4">
              <p className="text-center mb-3">Audio is muted. Click below to enable system sounds:</p>
              <div className="text-center">
                <button 
                  onClick={startAudio}
                  className="button-lisa"
                >
                  Enable Audio
                </button>
              </div>
            </div>
          )} */}
          
          <div className="text-center text-xs text-gray-600 mt-4">
            <p>Layer4 Protocol - Unbreakable Stability</p>
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
