'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLisaSounds } from '@/lib/lisaSounds';
import { animations, createHoverAnimation, createTapAnimation } from '@/lib/animations';

let Phaser: any = null;
let Preloader: any = null;
let Play: any = null;

interface Card {
  gameObject: any;
  flip: (callbackComplete?: () => void) => void;
  destroy: () => void;
  cardName: string;
}

interface CardMemoryGameProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CardMemoryGame({ isOpen, onClose }: CardMemoryGameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameError, setGameError] = useState(false);
  const { playButtonClick, playMenuClick } = useLisaSounds();

  // Ref callback — TRIGGERS when container is rendered
  const setGameContainerRef = (node: HTMLDivElement | null) => {
    if (node) {
      gameContainerRef.current = node;
      console.log("[DEBUG] ✅ Container rendered:", node);
      
      // Try to create game if Phaser is ready
      if (Phaser && Preloader && Play && !phaserGameRef.current) {
        console.log("[DEBUG] 🎮 Phaser ready — creating game now!");
        
        const config = {
          title: 'Card Memory Game',
          type: Phaser.AUTO,
          backgroundColor: '#192a56',
          width: 549,
          height: 480,
          parent: node,
          render: {
            pixelArt: true,
          },
          scene: [Preloader, Play],
        };
      
        try {
          phaserGameRef.current = new Phaser.Game(config);
          console.log("[DEBUG] 🎮 Phaser game successfully created!");
      
          // Start the Preloader scene manually
          phaserGameRef.current.scene.start('Preloader');
          console.log("[DEBUG] ▶️ Preloader scene manually started");

          setTimeout(() => {
            if (isLoading && !gameError) {
              console.warn("[DEBUG] ⚠️ Game still loading after 5s — possible asset issue");
              setGameError(true);
              setIsLoading(false);
            }
          }, 5000);
        } catch (error) {
          console.error("[CRITICAL ERROR] Failed to create Phaser game:", error);
          setGameError(true);
          setIsLoading(false);
        }
      } else {
        console.log("[DEBUG] ⏳ Container ready but Phaser not loaded yet, waiting...");
      }
    }
  };

  // Load Phaser + define scenes
  useEffect(() => {
    if (!isOpen) return;

    if (phaserGameRef.current) {
      console.log("[DEBUG] Game instance already exists, skipping re-init");
      return;
    }

    console.log("[DEBUG] Importing Phaser...");
    import('phaser').then((PhaserModule) => {
      Phaser = PhaserModule.default || PhaserModule;
      console.log("[DEBUG] ✅ Phaser imported successfully");

      // Define Preloader
      Preloader = class Preloader extends Phaser.Scene {
        constructor() {
          super({ key: 'Preloader' });
          console.log("[DEBUG] Preloader scene constructed");
        }
        preload() {
          console.log("[DEBUG] Loading assets from:", '/game_assets/');
          this.load.setBaseURL('/game_assets/');
        
          // Log each file being loaded
          const assets = [
            'volume-icon',
            'volume-icon_off',
            'background',
            'card-back',
            'card-0',
            'card-1',
            'card-2',
            'card-3',
            'card-4',
            'card-5',
            'heart',
            'theme-song',
            'whoosh',
            'card-flip',
            'card-match',
            'card-mismatch',
            'card-slide',
            'victory'
          ];
        
          assets.forEach(key => {
            console.log(`[DEBUG] Queuing: ${key}`);
            if (['theme-song', 'whoosh', 'card-flip', 'card-match', 'card-mismatch', 'card-slide', 'victory'].includes(key)) {
              this.load.audio(key, `audio/${key}.mp3`);
            } else {
              this.load.image(key, `${key}.png`);
            }
          });
        }

        create() {
          console.log("[DEBUG] Preloader.create() — starting Play scene");
          setIsLoading(false);
          this.scene.start('Play');
        }
      };

      // Define createCard
      const createCard = ({ scene, x, y, frontTexture, cardName }: {
        scene: any;
        x: number;
        y: number;
        frontTexture: string;
        cardName: string;
      }) => {
        let isFlipping = false;
        const rotation = { y: 180 }; // Start face down (180 degrees)
        const backTexture = 'card-back';

        const card = scene.add.plane(x, y, backTexture).setName(cardName).setInteractive();
        card.modelRotationY = 180;

        const flipCard = (callbackComplete?: () => void) => {
          if (isFlipping) return;
          console.log(`[DEBUG] Flipping card ${cardName}, current rotation: ${rotation.y}`);
          // Determine if card is currently face up or face down based on rotation
          const isCurrentlyFaceUp = rotation.y < 90;
          const newRotation = isCurrentlyFaceUp ? 180 : 0;
          console.log(`[DEBUG] Card is currently ${isCurrentlyFaceUp ? 'face up' : 'face down'}, flipping to: ${newRotation}`);
          scene.add.tween({
            targets: [rotation],
            y: newRotation,
            ease: Phaser.Math.Easing.Expo.Out,
            duration: 500,
            onStart: () => {
              isFlipping = true;
              scene.sound.play('card-flip');
              scene.tweens.chain({
                targets: card,
                ease: Phaser.Math.Easing.Expo.InOut,
                tweens: [
                  { duration: 200, scale: 1.1 },
                  { duration: 300, scale: 1 },
                ],
              });
            },
            onUpdate: () => {
              card.rotateY = 0 + rotation.y;
              const cardRotation = Math.floor(card.rotateY) % 360;
              if ((cardRotation >= 0 && cardRotation <= 90) || (cardRotation >= 270 && cardRotation <= 359)) {
                card.setTexture(frontTexture);
              } else {
                card.setTexture(backTexture);
              }
            },
            onComplete: () => {
              isFlipping = false;
              console.log(`[DEBUG] Card ${cardName} flip complete, new rotation: ${rotation.y}`);
              if (callbackComplete) callbackComplete();
            },
          });
        };

        const destroy = () => {
          scene.add.tween({
            targets: [card],
            y: card.y - 1000,
            easing: Phaser.Math.Easing.Elastic.In,
            duration: 500,
            onComplete: () => card.destroy(),
          });
        };

        return { gameObject: card, flip: flipCard, destroy, cardName };
      };

      // Define Play
      Play = class Play extends Phaser.Scene {
        cardNames = ['card-0', 'card-1', 'card-2', 'card-3', 'card-4', 'card-5'];
        cards: Card[] = [];
        cardOpened: Card | undefined = undefined;
        canMove = false;
        lives = 10;

        gridConfiguration = {
          x: 113,
          y: 102,
          paddingX: 10,
          paddingY: 10,
        };

        constructor() {
          super({ key: 'Play' });
          console.log("[DEBUG] Play scene constructed");
        }

        init() {
          console.log("[DEBUG] Play.init() called");
          this.cameras.main.fadeIn(500);
          this.lives = 10;
          this.volumeButton();
        }

        create() {
          console.log("[DEBUG] Play.create() — rendering game start screen");
          this.add.image(this.gridConfiguration.x - 63, this.gridConfiguration.y - 77, 'background').setOrigin(0);

          const titleText = this.add
            .text(this.sys.game.scale.width / 2, this.sys.game.scale.height / 2, 'Memory Card Game\nClick to Play', {
              align: 'center',
              strokeThickness: 4,
              fontSize: 40,
              fontStyle: 'bold',
              color: '#8c7ae6',
            })
            .setOrigin(0.5)
            .setDepth(3)
            .setInteractive();

          this.add.tween({
            targets: titleText,
            duration: 800,
            ease: (value: number) => value > 0.8,
            alpha: 0,
            repeat: -1,
            yoyo: true,
          });

          titleText.on(Phaser.Input.Events.POINTER_OVER, () => {
            titleText.setColor('#9c88ff');
            this.input.setDefaultCursor('pointer');
          });
          titleText.on(Phaser.Input.Events.POINTER_OUT, () => {
            titleText.setColor('#8c7ae6');
            this.input.setDefaultCursor('default');
          });
          titleText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            console.log("[DEBUG] Title clicked — starting game");
            this.sound.play('whoosh', { volume: 1.3 });
            this.add.tween({
              targets: titleText,
              ease: Phaser.Math.Easing.Bounce.InOut,
              y: -1000,
              onComplete: () => {
                // if (!this.sound.get('theme-song')) {
                //   this.sound.play('theme-song', { loop: true, volume: 0.5 });
                // }
                this.startGame();
              },
            });
          });
        }

        startGame() {
          console.log("[DEBUG] Play.startGame() — initializing gameplay");
          const winnerText = this.add
            .text(this.sys.game.scale.width / 2, -1000, 'YOU WIN \nClick to restart', {
              align: 'center',
              strokeThickness: 4,
              fontSize: 40,
              fontStyle: 'bold',
              color: '#8c7ae6',
            })
            .setOrigin(0.5)
            .setDepth(3)
            .setInteractive();

          const gameOverText = this.add
            .text(this.sys.game.scale.width / 2, -1000, 'GAME OVER\nClick to restart', {
              align: 'center',
              strokeThickness: 4,
              fontSize: 40,
              fontStyle: 'bold',
              color: '#ff0000',
            })
            .setName('gameOverText')
            .setOrigin(0.5)
            .setDepth(3)
            .setInteractive();

          const hearts = this.createHearts();
          this.cards = this.createGridCards();

          this.time.addEvent({
            delay: 200 * this.cards.length,
            callback: () => {
              this.canMove = true;
              console.log("[DEBUG] Game ready — player can now move");
            },
          });

          this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: any) => {
            if (this.canMove) {
              const card = this.cards.find((card: Card) => card.gameObject.hasFaceAt(pointer.x, pointer.y));
              if (card) {
                this.input.setDefaultCursor('pointer');
              } else {
                this.input.setDefaultCursor('default');
              }
            }
          });

          this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: any) => {
            if (this.canMove && this.cards.length) {
              const card = this.cards.find((card: Card) => card.gameObject.hasFaceAt(pointer.x, pointer.y));
                if (card) {
                  console.log(`[DEBUG] Card clicked: ${card.cardName}`);
                  console.log(`[DEBUG] Card rotation before flip: ${card.gameObject.rotateY}`);
                  this.canMove = false;

                if (this.cardOpened !== undefined) {
                  if (this.cardOpened.gameObject.x === card.gameObject.x && this.cardOpened.gameObject.y === card.gameObject.y) {
                    this.canMove = true;
                    return false;
                  }

                  card.flip(() => {
                    if (this.cardOpened && this.cardOpened.cardName === card.cardName) {
                      console.log("[DEBUG] ✅ Match found!");
                      this.sound.play('card-match');
                      this.cardOpened.destroy();
                      card.destroy();
                      this.cards = this.cards.filter((cardLocal: Card) => cardLocal.cardName !== card.cardName);
                      this.cardOpened = undefined;
                      this.canMove = true;
                    } else {
                      console.log("[DEBUG] ❌ No match");
                      this.sound.play('card-mismatch');
                      this.cameras.main.shake(600, 0.01);
                      const lastHeart = hearts[hearts.length - 1];
                      this.add.tween({
                        targets: lastHeart,
                        ease: Phaser.Math.Easing.Expo.InOut,
                        duration: 1000,
                        y: -1000,
                        onComplete: () => {
                          lastHeart.destroy();
                          hearts.pop();
                        },
                      });
                      this.lives -= 1;

                      // Flip both cards back to face down (following original logic)
                      console.log("[DEBUG] Starting to flip both cards back...");
                      console.log(`[DEBUG] Second card rotation before flip: ${card.gameObject.rotateY}`);
                      console.log(`[DEBUG] First card rotation before flip: ${this.cardOpened?.gameObject.rotateY}`);
                      
                      // Flip the second card back (no callback, like original)
                      card.flip();
                      
                      // Flip the first card back with callback (like original)
                      if (this.cardOpened) {
                        this.cardOpened.flip(() => {
                          console.log("[DEBUG] First card flipped back, resetting game state");
                          this.cardOpened = undefined;
                          this.canMove = true;
                        });
                      }
                    }

                    if (this.lives === 0) {
                      console.log("[DEBUG] 💀 Game Over");
                      this.sound.play('whoosh', { volume: 1.3 });
                      this.add.tween({
                        targets: gameOverText,
                        ease: Phaser.Math.Easing.Bounce.Out,
                        y: this.sys.game.scale.height / 2,
                      });
                      this.canMove = false;
                    }

                    if (this.cards.length === 0) {
                      console.log("[DEBUG] 🎉 You Win!");
                      this.sound.play('whoosh', { volume: 1.3 });
                      this.sound.play('victory');
                      this.add.tween({
                        targets: winnerText,
                        ease: Phaser.Math.Easing.Bounce.Out,
                        y: this.sys.game.scale.height / 2,
                      });
                      this.canMove = false;
                    }
                  });
                } else if (this.cardOpened === undefined && this.lives > 0 && this.cards.length > 0) {
                  card.flip(() => {
                    this.canMove = true;
                  });
                  this.cardOpened = card;
                  console.log(`[DEBUG] First card opened: ${card.cardName}`);
                }
              }
            }
          });

          winnerText.on(Phaser.Input.Events.POINTER_OVER, () => {
            winnerText.setColor('#FF7F50');
            this.input.setDefaultCursor('pointer');
          });
          winnerText.on(Phaser.Input.Events.POINTER_OUT, () => {
            winnerText.setColor('#8c7ae6');
            this.input.setDefaultCursor('default');
          });
          winnerText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.sound.play('whoosh', { volume: 1.3 });
            this.add.tween({
              targets: winnerText,
              ease: Phaser.Math.Easing.Bounce.InOut,
              y: -1000,
              onComplete: () => this.restartGame(),
            });
          });

          gameOverText.on(Phaser.Input.Events.POINTER_OVER, () => {
            gameOverText.setColor('#FF7F50');
            this.input.setDefaultCursor('pointer');
          });
          gameOverText.on(Phaser.Input.Events.POINTER_OUT, () => {
            gameOverText.setColor('#8c7ae6');
            this.input.setDefaultCursor('default');
          });
          gameOverText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.add.tween({
              targets: gameOverText,
              ease: Phaser.Math.Easing.Bounce.InOut,
              y: -1000,
              onComplete: () => this.restartGame(),
            });
          });
        }

        restartGame() {
          console.log("[DEBUG] Restarting game...");
          this.cardOpened = undefined;
          this.cameras.main.fadeOut(200 * this.cards.length);
          this.cards.reverse().map((card: Card, index: number) => {
            this.add.tween({
              targets: card.gameObject,
              duration: 500,
              y: 1000,
              delay: index * 100,
              onComplete: () => card.gameObject.destroy(),
            });
          });

          this.time.addEvent({
            delay: 200 * this.cards.length,
            callback: () => {
              this.cards = [];
              this.canMove = false;
              this.scene.restart();
              this.sound.play('card-slide', { volume: 1.2 });
            },
          });
        }

        createGridCards() {
          console.log("[DEBUG] Creating grid of cards...");
          const gridCardNames = Phaser.Utils.Array.Shuffle([...this.cardNames, ...this.cardNames]);
          return gridCardNames.map((name: string, index: number) => {
            const newCard = createCard({
              scene: this,
              x: this.gridConfiguration.x + (98 + this.gridConfiguration.paddingX) * (index % 4),
              y: -1000,
              frontTexture: name,
              cardName: name,
            });
            this.add.tween({
              targets: newCard.gameObject,
              duration: 800,
              delay: index * 100,
              onStart: () => this.sound.play('card-slide', { volume: 1.2 }),
              y: this.gridConfiguration.y + (128 + this.gridConfiguration.paddingY) * Math.floor(index / 4),
            });
            return newCard;
          });
        }

        createHearts() {
          console.log("[DEBUG] Creating hearts UI...");
          return Array.from(new Array(this.lives)).map((el, index) => {
            const heart = this.add.image(this.sys.game.scale.width + 1000, 20, 'heart').setScale(2);
            this.add.tween({
              targets: heart,
              ease: Phaser.Math.Easing.Expo.InOut,
              duration: 1000,
              delay: 1000 + index * 200,
              x: 140 + 30 * index,
            });
            return heart;
          });
        }

        volumeButton() {
          console.log("[DEBUG] Creating volume button...");
          const volumeIcon = this.add.image(25, 25, 'volume-icon').setName('volume-icon');
          volumeIcon.setInteractive();

          volumeIcon.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.input.setDefaultCursor('pointer');
          });
          volumeIcon.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.input.setDefaultCursor('default');
          });
          volumeIcon.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (this.sound.volume === 0) {
              this.sound.setVolume(1);
              volumeIcon.setTexture('volume-icon');
              volumeIcon.setAlpha(1);
            } else {
              this.sound.setVolume(0);
              volumeIcon.setTexture('volume-icon_off');
              volumeIcon.setAlpha(0.5);
            }
          });
        }
      };

       // ⚠️ DO NOT create game here — wait for container to render via ref callback
       console.log("[DEBUG] Phaser and scenes loaded — waiting for container to render...");
       
       // If container is already available, create game now
       if (gameContainerRef.current && !phaserGameRef.current) {
         console.log("[DEBUG] 🎮 Container already available — creating game now!");
         
         const config = {
           title: 'Card Memory Game',
           type: Phaser.AUTO,
           backgroundColor: '#192a56',
           width: 549,
           height: 480,
           parent: gameContainerRef.current,
           render: {
             pixelArt: true,
           },
           scene: [Preloader, Play],
         };
       
         try {
           phaserGameRef.current = new Phaser.Game(config);
           console.log("[DEBUG] 🎮 Phaser game successfully created!");
       
           // Start the Preloader scene manually
           phaserGameRef.current.scene.start('Preloader');
           console.log("[DEBUG] ▶️ Preloader scene manually started");

           setTimeout(() => {
             if (isLoading && !gameError) {
               console.warn("[DEBUG] ⚠️ Game still loading after 5s — possible asset issue");
               setGameError(true);
               setIsLoading(false);
             }
           }, 5000);
         } catch (error) {
           console.error("[CRITICAL ERROR] Failed to create Phaser game:", error);
           setGameError(true);
           setIsLoading(false);
         }
       }

    }).catch((err) => {
      console.error("[CRITICAL ERROR] Failed to load Phaser module:", err);
      setGameError(true);
      setIsLoading(false);
    });

    return () => {
      console.log("[DEBUG] Cleanup useEffect triggered");
      if (phaserGameRef.current) {
        try {
          phaserGameRef.current.scene?.stop?.();
          phaserGameRef.current.destroy(true, false);
        } catch (error) {
          console.warn("[DEBUG] Error during cleanup:", error);
        } finally {
          phaserGameRef.current = null;
        }
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    playMenuClick();
    if (phaserGameRef.current) {
      try {
        phaserGameRef.current.scene?.stop?.();
        phaserGameRef.current.destroy(true, false);
      } catch (error) {
        console.warn("[DEBUG] handleClose: Error during cleanup:", error);
      } finally {
        phaserGameRef.current = null;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className="bg-white border-3 border-black rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%)',
            border: '3px solid #000',
            boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-4 border-b-3 border-black flex items-center justify-between"
            style={{
              background: 'linear-gradient(180deg, #4a90e2 0%, #357abd 100%)',
              color: '#fff',
              textShadow: '1px 1px 0 #000',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
                  color: '#4a90e2',
                  border: '2px solid #000',
                  textShadow: '1px 1px 0 #000',
                }}
              >
                🎮
              </div>
              <div>
                <h3
                  className="font-bold text-lg uppercase tracking-wide"
                  style={{ textShadow: '2px 2px 0px #000' }}
                >
                  Layer4 Card Memory Game
                </h3>
                <p
                  className="text-sm uppercase tracking-wide"
                  style={{ color: 'rgba(255,255,255,0.8)', textShadow: '1px 1px 0 #000' }}
                >
                  Test Your Memory Skills
                </p>
              </div>
            </div>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1, y: -3 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-all"
              style={{
                background: '#ff6b6b',
                border: '2px solid #000',
                boxShadow: '2px 2px 0 rgba(0,0,0,0.3)',
              }}
            >
              ✕
            </motion.button>
          </div>
  
          <div className="p-6 flex flex-col items-center">
            {/* ⚠️ CRITICAL FIX: Container with ref is now rendered UNCONDITIONALLY */}
            <div
              ref={setGameContainerRef}
              className="w-full flex justify-center mb-4"
              style={{
                minHeight: '480px',
                width: '549px',
                height: '480px',
                background: '#192a56',
                border: '2px solid #000',
                borderRadius: '8px',
                position: 'relative',
              }}
            >
              {/* Show loading spinner OVER the game container while loading */}
              {isLoading && !gameError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#192a56] bg-opacity-95 rounded">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-white text-sm">Loading game assets...</p>
                    <p className="text-xs text-gray-300 mt-1">Check console for progress</p>
                  </div>
                </div>
              )}
  
              {/* Phaser will render the game here automatically when ready */}
            </div>
  
            {/* Show error state if loading failed */}
            {/* {gameError && (
              <div className="flex flex-col items-center justify-center h-48 gap-4 mt-4">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl">
                  ⚠️
                </div>
                <p className="text-lg font-bold text-red-600 uppercase tracking-wide">Game Failed to Load</p>
                <p className="text-sm text-gray-600 font-mono text-center max-w-md">
                  Check the browser console for detailed error logs.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )} */}
  
            {/* Attribution (Required by CC-BY 4.0) */}
            {/* <div className="mt-4 text-xs text-gray-500 text-center max-w-md">
              <p>
                Music: “Fat Caps” by Audionautix —{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"  // ← Fixed: removed trailing spaces
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  Licensed under CC BY 4.0
                </a>
              </p>
            </div> */}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}