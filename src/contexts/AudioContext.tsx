"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AudioContextType {
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  toggleAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Load audio state from localStorage on mount
  useEffect(() => {
    const savedAudioState = localStorage.getItem('audioEnabled');
    if (savedAudioState !== null) {
      setAudioEnabled(JSON.parse(savedAudioState));
    }
  }, []);

  // Save audio state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('audioEnabled', JSON.stringify(audioEnabled));
  }, [audioEnabled]);

  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
  };

  return (
    <AudioContext.Provider value={{ audioEnabled, setAudioEnabled, toggleAudio }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
