'use client';

import React from 'react';
import { User } from '@/stores/chatStore';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  users: User[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `typing...`;
    } else if (users.length === 2) {
      return `typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  };

  const getTypingAvatars = () => {
    return users.slice(0, 3).map((user, index) => (
      <motion.div
        key={user.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: index * 0.1 }}
        className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-black"
      >
        {user.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt={user.displayName || user.username || 'User'}
            className="w-full h-full object-cover" 
          />
        ) : (
          (user.displayName?.[0] || user.username?.[0] || 'U').toUpperCase()
        )}
      </motion.div>
    ));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.3 
        }}
        className="flex items-center space-x-3 text-sm bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-lg"
      >
        {/* Typing avatars */}
        {/* <div className="flex -space-x-2">
          {getTypingAvatars()}
        </div> */}
        
        {/* Animated dots */}
        <div className="flex space-x-1">
          <motion.div 
            className="w-2 h-2 bg-black rounded-full"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="w-2 h-2 bg-black rounded-full"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2
            }}
          />
          <motion.div 
            className="w-2 h-2 bg-black rounded-full"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4
            }}
          />
        </div>
        
        {/* Typing text */}
        <motion.span 
          className="font-bold font-mono text-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* {getTypingText()} */}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
