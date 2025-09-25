'use client';

import React, { useState, useRef } from 'react';
import { useChatEvents } from '@/contexts/WebSocketContext';
import { Message, MessageReaction, useChatStore } from '@/stores/chatStore';
import { useWallet } from '@solana/wallet-adapter-react';
import MessageStatus from '@/components/MessageStatus';

// Default avatar placeholder
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236b7280'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

// Handle avatar image errors
const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_AVATAR) {
    target.src = DEFAULT_AVATAR;
  }
};

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isConsecutive?: boolean;
}

export default function MessageBubble({ 
  message, 
  showAvatar = true, 
  showTimestamp = true,
  isConsecutive = false
}: MessageBubbleProps) {
  const { publicKey } = useWallet();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useChatStore();

  const { 
    addReaction, 
    removeReaction 
  } = useChatEvents();
  // Check if the message author's wallet address matches current user's wallet address
  const isOwnMessage = message.author?.walletAddress === publicKey?.toString();
  // Check if this is actually a bot message (more specific check)
  const isBot = message.author?.username === "Layer4 Bot" || 
                message.author?.username === "Layer4Bot" ||
                message.author?.displayName === "Layer4 Bot" ||
                (message.author?.username?.toLowerCase().includes('bot') && 
                 message.author?.username?.toLowerCase().includes('layer4'));

  // Debug logging for message author
  if (message.author?.username === "Layer4 Bot" || message.author?.displayName === "Layer4 Bot") {
    // console.log('🤖 [BOT DEBUG] Message author data:', {
    //   id: message.author.id,
    //   username: message.author.username,
    //   displayName: message.author.displayName,
    //   walletAddress: message.author.walletAddress,
    //   isVerified: message.author.isVerified
    // });
  }

  // Common reaction emojis
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Group reactions by emoji
  const reactionsByEmoji = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>) || {};

  const handleReactionClick = (emoji: string) => {
    const userId = publicKey?.toString() || 'anonymous';
    const existingReaction = message.reactions?.find(r => r.userId === userId && r.emoji === emoji);
    
    if (existingReaction) {
      removeReaction(message.id, emoji);
    } else {
      addReaction(message.id, emoji);
    }
  };

  // Parse content for links and images
  const parseContent = (input: string): Array<any> => {
    const tokens: Array<any> = [];
    
    // Handle markdown-style links and images: [text](url) and ![alt](url)
    const markdownRegex = /(!?)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = markdownRegex.exec(input)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', text: input.slice(lastIndex, match.index) });
      }
      
      const isImage = match[1] === '!';
      const label = match[2];
      const url = match[3];
      
      if (isImage) {
        tokens.push({ type: 'image', url, alt: label });
      } else {
        tokens.push({ type: 'link', url, label });
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Handle plain URLs
    if (lastIndex < input.length) {
      const remainingText = input.slice(lastIndex);
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      let urlMatch: RegExpExecArray | null;
      let urlLastIndex = 0;
      
      while ((urlMatch = urlRegex.exec(remainingText)) !== null) {
        if (urlMatch.index > urlLastIndex) {
          tokens.push({ type: 'text', text: remainingText.slice(urlLastIndex, urlMatch.index) });
        }
        
        const url = urlMatch[0];
        if (/\.(png|jpe?g|webp|gif)$/i.test(url)) {
          tokens.push({ type: 'image', url });
        } else {
          tokens.push({ type: 'link', url });
        }
        
        urlLastIndex = urlMatch.index + url.length;
      }
      
      if (urlLastIndex < remainingText.length) {
        tokens.push({ type: 'text', text: remainingText.slice(urlLastIndex) });
      }
    }
    
    return tokens;
  };

  const parts = parseContent(message.content || "");
  const author = message.author?.username || message.author?.displayName || (message.authorId ? `${message.authorId.slice(0,4)}…${message.authorId.slice(-4)}` : "Anonymous");

  return (
    <div className={`flex gap-2 sm:gap-3 group hover:bg-black/10 -mx-2 px-2 py-1 transition-all duration-200 ${isOwnMessage ? 'justify-end' : 'justify-start'}`} ref={messageRef}>
      {/* Avatar for received messages (left side) */}
      {!isOwnMessage && showAvatar && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500">
          <img 
            src={message.author?.avatarUrl || DEFAULT_AVATAR} 
            alt={author} 
            className="w-full h-full object-cover pixelated" 
            onError={handleAvatarError}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
      )}
      {!isOwnMessage && !showAvatar && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center">
          {showTimestamp && message.sentAt && (
            <span className="text-xs text-black opacity-0 group-hover:opacity-100 transition-opacity font-mono bg-yellow-300 border border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
      
      {/* Message content */}
      <div className={`max-w-[80%] sm:max-w-[70%] md:max-w-[55%] relative ${isOwnMessage ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
        {/* Only show author info for other people's messages, not your own */}
        {!isOwnMessage && showAvatar && (
          <div className="flex items-center gap-2 mb-1 justify-start">
            <span className={`font-bold text-xs sm:text-sm font-mono tracking-wide ${
              isBot ? 'text-orange-600' : 'text-black'
            }`}>
              {author}
            </span>
            {message.author?.isVerified && !isBot && (
              <div className="text-green-600" title="Verified wallet">
                <div className="w-3 h-3 bg-green-500 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"></div>
              </div>
            )}
            {isBot && (
              <span className="bg-yellow-300 text-black text-xs px-2 py-0.5 font-bold font-mono border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                BOT
              </span>
            )}
            {message.sentAt && (
              <span className="text-xs text-black font-mono bg-cyan-300 border border-black px-2 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
        
        <div className={`px-2 sm:px-3 py-1.5 sm:py-2 relative border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          isOwnMessage 
            ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white' 
            : isBot 
              ? 'bg-gradient-to-br from-yellow-300 to-orange-400 text-black' 
              : 'bg-gradient-to-br from-green-300 to-cyan-400 text-black'
        } ${message.isOptimistic ? 'opacity-70' : ''}`}>
          {/* Message status and timestamp container */}
          {isOwnMessage && (
            <div className="absolute -top-8 right-0 flex flex-col items-end gap-1">
              {/* Message status indicator */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <MessageStatus
                  isOptimistic={message.isOptimistic}
                  isDelivered={!message.isOptimistic}
                  isRead={message.readReceipts && message.readReceipts.length > 0}
                  readCount={message.readReceipts?.length || 0}
                  className="bg-black text-white px-2 py-1 text-xs font-mono border border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                />
              </div>
              
              {/* Timestamp */}
              {message.sentAt && !message.isOptimistic && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-xs text-black bg-yellow-300 px-2 py-1 font-mono border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {parts.map((p, i) => {
              if (p.type === 'image') return (
                <div key={i} className="my-3 max-w-full">
                  <img 
                    src={p.url} 
                    alt={p.alt || "Image"} 
                    className="max-w-full rounded-xl border border-gray-200 shadow-sm" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cccccc"%3E%3Cpath d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5m16-12V18a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2z"/%3E%3C/svg%3E';
                    }}
                  />
                </div>
              );
              if (p.type === 'link') return (
                <a 
                  key={i} 
                  href={p.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`underline break-all hover:opacity-80 font-medium ${
                    isOwnMessage ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  {p.label || p.url}
                </a>
              );
              return <span key={i}>{p.text}</span>;
            })}
          </div>
        </div>
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionsByEmoji).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={`text-xs px-2 py-1 font-bold font-mono flex items-center gap-1 transition-all hover:scale-105 border border-black ${
                  reactions.some(r => r.userId === publicKey?.toString()) 
                    ? 'bg-yellow-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                    : 'bg-white text-black hover:bg-yellow-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                <span className="text-sm">{emoji}</span>
                <span className="bg-black text-white px-1 py-0.5 font-mono text-xs">{reactions.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Read receipts for own messages - only show on last message */}
        {isOwnMessage && showTimestamp && message.readReceipts && message.readReceipts.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs justify-end">
            <div className="flex -space-x-1">
              {message.readReceipts.slice(0, 3).map((receipt, index) => (
                <div
                  key={receipt.id}
                  className="w-4 h-4 bg-green-500 border border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  title={`Read at ${new Date(receipt.readAt).toLocaleTimeString()}`}
                >
                  <div className="w-2 h-2 bg-white border border-black"></div>
                </div>
              ))}
              {message.readReceipts.length > 3 && (
                <div className="w-4 h-4 bg-gray-500 border border-black flex items-center justify-center text-xs font-bold font-mono text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  +{message.readReceipts.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-black font-mono bg-cyan-300 border border-black px-2 py-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              {message.readReceipts.length} READ
            </span>
          </div>
        )}
        
        {/* Reaction picker (shows on hover for desktop) */}
        {/* <div className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} top-0 transition-all duration-200 opacity-0 group-hover:opacity-100 hidden md:flex gap-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2 -translate-y-2 z-10`}>
          {reactionEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => handleReactionClick(emoji)}
              className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center hover:scale-110"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div> */}

        {/* Mobile reaction button */}
        {/* <div className="md:hidden mt-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium bg-white rounded-full px-3 py-1 shadow-sm border border-gray-200"
          >
            😀 React
          </button>
        </div> */}

        {/* Mobile emoji picker */}
        {showEmojiPicker && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10 md:hidden">
            <div className="grid grid-cols-6 gap-2">
              {reactionEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleReactionClick(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-10 h-10 text-lg hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* No avatar for sent messages - they're on the right side without avatar */}
    </div>
  );
}