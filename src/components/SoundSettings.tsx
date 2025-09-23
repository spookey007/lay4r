'use client';

import React, { useState, useEffect } from 'react';
import { useLisaSounds } from '@/lib/lisaSounds';

interface SoundSettingsProps {
  className?: string;
}

export default function SoundSettings({ className = '' }: SoundSettingsProps) {
  const { setVolume, setEnabled, isEnabled } = useLisaSounds();
  const [volume, setVolumeState] = useState(0.3);
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    setEnabledState(isEnabled);
  }, [isEnabled]);

  const handleVolumeChange = (newVolume: number) => {
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  const handleToggleEnabled = () => {
    const newEnabled = !enabled;
    setEnabledState(newEnabled);
    setEnabled(newEnabled);
  };

  return (
    <div className={`bg-white border-2 border-black rounded-lg p-4 shadow-lg ${className}`}>
      <h3 className="text-lg font-bold mb-4 text-black uppercase tracking-wide">
        🔊 Sound Settings
      </h3>
      
      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-black uppercase tracking-wide">
            Enable Sounds
          </label>
          <button
            onClick={handleToggleEnabled}
            className={`w-12 h-6 rounded-full border-2 border-black transition-colors ${
              enabled 
                ? 'bg-green-500' 
                : 'bg-gray-300'
            }`}
            style={{
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <div 
              className={`w-5 h-5 rounded-full border border-black transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
              style={{
                background: enabled 
                  ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)'
                  : 'linear-gradient(135deg, #f0f0f0 0%, #d0d0d0 100%)',
                boxShadow: '1px 1px 2px rgba(0,0,0,0.3)'
              }}
            />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-black uppercase tracking-wide">
            Volume: {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            disabled={!enabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #4a90e2 0%, #4a90e2 ${volume * 100}%, #e0e0e0 ${volume * 100}%, #e0e0e0 100%)`,
              border: '2px solid #000',
              borderRadius: '8px',
              boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2)'
            }}
          />
        </div>

        {/* Sound Test */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (enabled) {
                // Test different sounds
                const sounds = ['click', 'menuClick', 'buttonClick', 'linkClick'];
                const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
                // This would need to be implemented in the sound manager
                console.log(`Testing sound: ${randomSound}`);
              }
            }}
            disabled={!enabled}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wide border-2 border-black rounded transition-colors disabled:opacity-50"
            style={{
              background: enabled 
                ? 'linear-gradient(180deg, #4a90e2 0%, #357abd 100%)'
                : 'linear-gradient(180deg, #d0d0d0 0%, #b0b0b0 100%)',
              color: enabled ? '#fff' : '#666',
              textShadow: enabled ? '1px 1px 0 #000' : 'none',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.3)'
            }}
          >
            Test Sound
          </button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-600 font-mono">
          Authentic Lisa OS click sounds for enhanced retro experience
        </p>
      </div>
    </div>
  );
}
