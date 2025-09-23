// Global Animation Configuration for Smooth, Watery Experience
// Consistent animation presets across the entire website

export const animations = {
  // Spring physics for natural, bouncy feel
  spring: {
    gentle: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8
    },
    smooth: {
      type: "spring" as const, 
      stiffness: 400,
      damping: 40,
      mass: 0.6
    },
    fluid: {
      type: "spring" as const,
      stiffness: 500,
      damping: 50,
      mass: 0.4
    },
    bouncy: {
      type: "spring" as const,
      stiffness: 600,
      damping: 25,
      mass: 0.5
    }
  },

  // Easing curves for smooth transitions
  easing: {
    smooth: [0.25, 0.46, 0.45, 0.94],
    fluid: [0.23, 1, 0.32, 1],
    watery: [0.4, 0, 0.2, 1],
    bouncy: [0.68, -0.55, 0.265, 1.55]
  },

  // Duration presets
  duration: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
    slower: 0.8
  },

  // Common animation variants
  variants: {
    // Fade animations
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    
    fadeInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },

    fadeInDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 }
    },

    fadeInLeft: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 }
    },

    fadeInRight: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    },

    // Scale animations
    scaleIn: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 }
    },

    scaleInBounce: {
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0, opacity: 0 }
    },

    // Slide animations
    slideUp: {
      initial: { y: "100%", opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: "100%", opacity: 0 }
    },

    slideDown: {
      initial: { y: "-100%", opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: "-100%", opacity: 0 }
    },

    // Hover effects
    hover: {
      scale: 1.05,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },

    hoverSubtle: {
      scale: 1.02,
      y: -1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },

    // Tap effects
    tap: {
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 600,
        damping: 30
      }
    },

    tapBounce: {
      scale: 0.9,
      transition: {
        type: "spring",
        stiffness: 800,
        damping: 20
      }
    }
  },

  // Page transition animations
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1]
    }
  },

  // Modal animations
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    content: {
      initial: { scale: 0.9, opacity: 0, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: 0.9, opacity: 0, y: 20 },
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 0.6
      }
    }
  },

  // Stagger animations for lists
  stagger: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.1,
          delayChildren: 0.1
        }
      }
    },
    item: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40
      }
    }
  },

  // Floating animations
  float: {
    animate: {
      y: [-2, 2, -2],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  // Pulse animations
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  // Shake animations
  shake: {
    animate: {
      x: [0, -5, 5, -5, 5, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  }
};

// Helper function to create smooth transitions
export const createTransition = (type: keyof typeof animations.spring, duration?: number) => ({
  ...animations.spring[type],
  ...(duration && { duration })
});

  // Helper function for hover animations
export const createHoverAnimation = (intensity: 'subtle' | 'normal' | 'strong' | 'bouncy' = 'normal') => {
  const configs = {
    subtle: { scale: 1.02, y: -1 },
    normal: { scale: 1.05, y: -2 },
    strong: { scale: 1.1, y: -3 },
    bouncy: { scale: 1.1, y: -3 }
  };
  
  return {
    ...configs[intensity],
    transition: animations.spring.fluid
  };
};

// Helper function for tap animations
export const createTapAnimation = (intensity: 'subtle' | 'normal' | 'strong' | 'bouncy' = 'normal') => {
  const configs = {
    subtle: { scale: 0.98 },
    normal: { scale: 0.95 },
    strong: { scale: 0.9 },
    bouncy: { scale: 0.9 }
  };
  
  return {
    ...configs[intensity],
    transition: animations.spring.bouncy
  };
};
