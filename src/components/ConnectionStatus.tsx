'use client';

import React from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface ConnectionStatusProps {
  className?: string;
  showMetrics?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '', 
  showMetrics = true 
}) => {
  const { isConnected, isConnecting, connectionState, getConnectionMetrics } = useWebSocket();
  const metrics = getConnectionMetrics();

  const getStatusColor = () => {
    if (isConnected) return 'text-green-600';
    if (isConnecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (isConnected) return '🟢';
    if (isConnecting) return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    return 'Disconnected';
  };

  const getConnectionQuality = () => {
    if (!isConnected || !metrics) return null;
    
    const { queuedMessages, lastPongReceived } = metrics;
    const now = Date.now();
    const timeSinceLastPong = lastPongReceived ? now - lastPongReceived : Infinity;
    
    if (queuedMessages === 0 && timeSinceLastPong < 60000) {
      return { level: 'Excellent', color: 'text-green-600' };
    } else if (queuedMessages < 5 && timeSinceLastPong < 120000) {
      return { level: 'Good', color: 'text-blue-600' };
    } else if (queuedMessages < 10) {
      return { level: 'Fair', color: 'text-yellow-600' };
    } else {
      return { level: 'Poor', color: 'text-red-600' };
    }
  };

  const quality = getConnectionQuality();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Main status indicator */}
      <div className={`flex items-center space-x-2 px-3 py-1 text-sm font-bold border-2 border-black transition-all duration-300 ${
        isConnected 
          ? 'bg-green-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
          : isConnecting
            ? 'bg-yellow-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
            : 'bg-red-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
      }`}>
        <div className={`w-3 h-3 border border-black transition-all duration-300 ${
          isConnected 
            ? 'bg-green-600 animate-pulse' 
            : isConnecting
              ? 'bg-yellow-600 animate-pulse'
              : 'bg-red-600'
        }`}></div>
        <span className="font-mono">{getStatusIcon()} {getStatusText()}</span>
        {connectionState.reconnectAttempts > 0 && (
          <span className="text-xs bg-white px-2 py-0.5 border border-black font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            RETRY {connectionState.reconnectAttempts}
          </span>
        )}
      </div>

      {/* Connection quality indicator */}
      {showMetrics && isConnected && quality && (
        <div className={`px-3 py-1 text-xs font-bold border-2 border-black ${
          quality.color === 'text-green-600' ? 'bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
          quality.color === 'text-blue-600' ? 'bg-blue-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
          quality.color === 'text-yellow-600' ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
          'bg-red-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
        }`}>
          <div className="flex items-center gap-1">
            <span className="text-sm">📊</span>
            <span className="font-mono">QUALITY: {quality.level}</span>
          </div>
        </div>
      )}

      {/* Queued messages indicator */}
      {showMetrics && metrics && metrics.queuedMessages > 0 && (
        <div className="px-3 py-1 text-xs font-bold bg-orange-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-1">
            <span className="text-sm">⏳</span>
            <span className="font-mono">{metrics.queuedMessages} QUEUED</span>
          </div>
        </div>
      )}

      {/* Last error indicator */}
      {connectionState.lastError && (
        <div className="px-3 py-1 text-xs font-bold bg-red-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-1">
            <span className="text-sm">⚠️</span>
            <span className="font-mono">ERROR</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
