'use client';

import React from 'react';

interface MessageStatusProps {
  isOptimistic?: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  readCount?: number;
  className?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  isOptimistic = false,
  isDelivered = false,
  isRead = false,
  readCount = 0,
  className = ''
}) => {
  if (isOptimistic) {
    return (
      <div className={`flex items-center gap-1 text-xs font-mono ${className}`}>
        <div className="flex space-x-0.5">
          <div className="w-2 h-2 bg-yellow-400 border border-black animate-pulse"></div>
          <div className="w-2 h-2 bg-yellow-400 border border-black animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-yellow-400 border border-black animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <span className="text-yellow-300 font-bold">SENDING...</span>
      </div>
    );
  }

  if (isRead && readCount > 0) {
    return (
      <div className={`flex items-center gap-1 text-xs font-mono ${className}`}>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 bg-green-500 border border-white"></div>
          <div className="w-2 h-2 bg-green-500 border border-white"></div>
        </div>
        <span className="text-green-300 font-bold">READ ({readCount})</span>
      </div>
    );
  }

  if (isDelivered) {
    return (
      <div className={`flex items-center gap-1 text-xs font-mono ${className}`}>
        <div className="w-2 h-2 bg-cyan-500 border border-white"></div>
        <span className="text-cyan-300 font-bold">DELIVERED</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${className}`}>
      <div className="w-2 h-2 bg-gray-500 border border-white"></div>
      <span className="text-gray-300 font-bold">SENT</span>
    </div>
  );
};

export default MessageStatus;
