'use client';

import React from 'react';
import { User } from '@/stores/chatStore';

interface TypingIndicatorProps {
  users: User[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].displayName || users[0].username} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].displayName || users[0].username} and ${users[1].displayName || users[1].username} are typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 italic">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}
