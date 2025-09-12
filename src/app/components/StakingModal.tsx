"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StakingModalProps, StakingTheme, defaultStakingTheme } from '@/schemas/staking';

interface StakingModalComponentProps extends StakingModalProps {
  theme?: StakingTheme;
  children?: React.ReactNode;
}

const StakingModal: React.FC<StakingModalComponentProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  isLoading = false,
  type,
  theme = defaultStakingTheme,
  children
}) => {
  if (!isOpen) return null;

  const getModalIcon = () => {
    switch (type) {
      case 'stake':
        return '💰';
      case 'unstake':
        return '💸';
      case 'info':
        return 'ℹ️';
      default:
        return '💰';
    }
  };

  const getModalColor = () => {
    switch (type) {
      case 'stake':
        return theme.colors.success;
      case 'unstake':
        return theme.colors.warning;
      case 'info':
        return theme.colors.info;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-md relative"
          style={{
            background: theme.colors.background,
            borderRadius: theme.borderRadius.xl,
            border: `2px solid ${theme.colors.border}`,
            boxShadow: theme.shadows.xl,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ 
              borderColor: theme.colors.border,
              background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.secondary}20)`
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ 
                  background: `${getModalColor()}20`,
                  border: `2px solid ${getModalColor()}`
                }}
              >
                {getModalIcon()}
              </div>
              <h3 
                className="text-xl font-bold"
                style={{ 
                  color: theme.colors.text,
                  fontFamily: theme.fonts.primary,
                  textShadow: `0 0 10px ${theme.colors.primary}50`
                }}
              >
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-opacity-20 transition-colors"
              style={{ 
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text
              }}
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {children || (
              <div className="text-center">
                <p 
                  className="text-lg mb-6"
                  style={{ 
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.primary,
                    lineHeight: '1.6'
                  }}
                >
                  {message}
                </p>
                
                {type === 'stake' && (
                  <div 
                    className="p-4 rounded-lg mb-6"
                    style={{
                      background: `${theme.colors.success}10`,
                      border: `1px solid ${theme.colors.success}30`
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl">🚀</span>
                      <span 
                        className="font-bold"
                        style={{ 
                          color: theme.colors.success,
                          fontFamily: theme.fonts.primary
                        }}
                      >
                        Stake SOL for L4
                      </span>
                    </div>
                    <p 
                      className="text-sm"
                      style={{ 
                        color: theme.colors.textSecondary,
                        fontFamily: theme.fonts.primary
                      }}
                    >
                      Convert your SOL to L4 tokens and earn rewards over 180 days
                    </p>
                  </div>
                )}

                {type === 'unstake' && (
                  <div 
                    className="p-4 rounded-lg mb-6"
                    style={{
                      background: `${theme.colors.warning}10`,
                      border: `1px solid ${theme.colors.warning}30`
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl">💸</span>
                      <span 
                        className="font-bold"
                        style={{ 
                          color: theme.colors.warning,
                          fontFamily: theme.fonts.primary
                        }}
                      >
                        Unstake & Claim Rewards
                      </span>
                    </div>
                    <p 
                      className="text-sm"
                      style={{ 
                        color: theme.colors.textSecondary,
                        fontFamily: theme.fonts.primary
                      }}
                    >
                      Withdraw your staked SOL and claim accumulated rewards
                    </p>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <motion.div
                      className="w-6 h-6 rounded-full border-2 border-t-transparent"
                      style={{ borderColor: theme.colors.primary }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span 
                      className="text-sm"
                      style={{ 
                        color: theme.colors.text,
                        fontFamily: theme.fonts.primary
                      }}
                    >
                      Processing...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="flex gap-3 p-6 border-t"
            style={{ borderColor: theme.colors.border }}
          >
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border transition-colors"
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text,
                fontFamily: theme.fonts.primary,
                background: 'transparent'
              }}
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 rounded-lg border transition-colors"
              style={{
                borderColor: getModalColor(),
                color: getModalColor(),
                fontFamily: theme.fonts.primary,
                background: `${getModalColor()}10`,
                boxShadow: `0 0 10px ${getModalColor()}30`
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StakingModal;
