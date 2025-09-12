"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html, Environment, Stars, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

// ======================
// 🚀 SHIP COMPONENT
// ======================
function Spaceship({ position, velocity }: { position: [number, number, number], velocity: { x: number, y: number } }) {
  const meshRef = useRef<THREE.Group>(null);
  const [rotation, setRotation] = useState({ y: 0, z: 0 });

  const targetY = Math.atan2(velocity.x, 5) * 0.3;
  const targetZ = Math.atan2(-velocity.y, 5) * 0.2;

  useFrame((state) => {
    if (!meshRef.current) return;

    setRotation(prev => ({
      y: prev.y + (targetY - prev.y) * 0.1,
      z: prev.z + (targetZ - prev.z) * 0.1
    }));

    meshRef.current.rotation.y = rotation.y;
    meshRef.current.rotation.z = rotation.z;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
  });

  return (
    <group ref={meshRef} position={position}>
      <mesh>
        <boxGeometry args={[1, 0.3, 2]} />
        <meshStandardMaterial color="#2E5CB8" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.8, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.1, 1.2]} />
        <meshStandardMaterial color="#1E3D7A" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.8, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.1, 1.2]} />
        <meshStandardMaterial color="#1E3D7A" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.25, 0.6]}>
        <sphereGeometry args={[0.35, 32, 16]} />
        <meshStandardMaterial color="#87CEEB" transparent opacity={0.8} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0, -1.3]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFA500" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0, -1.6]}>
        <coneGeometry args={[0.2, 0.8, 16]} />
        <meshStandardMaterial color="#FF4500" emissive="#FF6347" emissiveIntensity={0.6} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// ======================
// 🌑 ASTEROID
// ======================
function Asteroid({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.008;
      meshRef.current.rotation.y += 0.012;
      meshRef.current.rotation.z += 0.006;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale, scale]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#654321" metalness={0.2} roughness={0.9} />
    </mesh>
  );
}

// ======================
// 💎 COLLECTIBLE
// ======================
function Collectible({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.8;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <octahedronGeometry args={[0.3, 2]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ffaa" emissiveIntensity={1} metalness={0.8} />
      </mesh>
      <Sparkles count={8} scale={2} speed={0.5} color="#00ffaa" />
    </group>
  );
}

// ======================
// 🔫 BULLET
// ======================
function Bullet({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.3;
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffffff" emissiveIntensity={2} metalness={1} />
      </mesh>
      <mesh position={[position[0], position[1], position[2] - 0.2]}>
        <coneGeometry args={[0.05, 0.3, 8]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffcc00" emissiveIntensity={1} transparent opacity={0.8} />
      </mesh>
    </>
  );
}

// ======================
// 🎵 AUDIO HOOK
// ======================
const useAudioManager = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    const initAudio = () => {
      if (typeof window !== 'undefined') {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          setAudioContext(ctx);
        } catch (e) {
          console.warn("Web Audio API not supported");
        }
      }
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playSound = useCallback((type: 'shoot' | 'collect' | 'hit') => {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'shoot':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        break;
      case 'collect':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        break;
      case 'hit':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        break;
    }

    oscillator.start();
    oscillator.stop(audioContext.currentTime + (type === 'hit' ? 0.2 : 0.1));
  }, [audioContext]);

  return { playSound, isAudioReady: !!audioContext };
};

// ======================
// 🎮 GAME SCENE
// ======================
function GameScene({ 
  gameState, 
  shipPosition, 
  shipVelocity,
  shakeEndTime,
  gameWidth,
  gameHeight,
  gameObjects
}: {
  gameState: any;
  shipPosition: { x: number; y: number };
  shipVelocity: { x: number; y: number };
  shakeEndTime: number;
  gameWidth: number;
  gameHeight: number;
  gameObjects: any[];
}) {
  const { camera, scene } = useThree();
  const VIEW_WIDTH = 10;
  const VIEW_HEIGHT = 6;

  useEffect(() => {
    // Type-safe camera setup
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 3, 12);
      camera.fov = 60;
      camera.updateProjectionMatrix();
    }
    
    scene.fog = new THREE.Fog(0x000022, 8, 25);
  }, [camera, scene]);

  useFrame(() => {
    // Type-safe camera shake
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const baseX = 0;
    const baseY = 3;
    const baseZ = 12;
    const now = performance.now();
    
    if (now < shakeEndTime) {
      const t = (shakeEndTime - now) / 500;
      const intensity = 0.2 * t * t;
      camera.position.set(
        baseX + (Math.random() - 0.5) * intensity,
        baseY + (Math.random() - 0.5) * intensity * 0.5,
        baseZ + (Math.random() - 0.5) * intensity * 0.3
      );
    } else {
      camera.position.set(baseX, baseY, baseZ);
    }
    camera.lookAt(0, 0, 0);
  });

  const convertTo3D = useCallback((x: number, y: number) => {
    // Map 2D game coordinates to 3D space where:
    // - X: left/right movement (same as 2D)
    // - Y: vertical position in 3D (0 = ground level)
    // - Z: depth (forward/backward in 3D, mapped from 2D Y)
    return [
      (x / gameWidth) * VIEW_WIDTH - VIEW_WIDTH / 2,
      0, // Keep all objects at ground level
      (y / gameHeight) * VIEW_HEIGHT - VIEW_HEIGHT / 2
    ] as [number, number, number];
  }, [gameWidth, gameHeight, VIEW_WIDTH, VIEW_HEIGHT]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 8, 3]} intensity={1.5} castShadow />
      <pointLight position={[0, 2, 0]} color="#4A90E2" intensity={1} distance={15} />
      <pointLight position={[0, -2, 5]} color="#FFD700" intensity={0.5} distance={15} />

      {/* <Environment preset="city" /> */}
      <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Spaceship 
        position={convertTo3D(shipPosition.x, shipPosition.y)} 
        velocity={shipVelocity}
      />

      {gameObjects.map(obj => {
        const pos = convertTo3D(obj.x, obj.y);
        switch (obj.type) {
          case 'obstacle':
            return <Asteroid key={obj.id} position={pos} scale={obj.size / 30} />;
          case 'collectible':
            return <Collectible key={obj.id} position={pos} />;
          case 'bullet':
            return <Bullet key={obj.id} position={pos} />;
          default:
            return null;
        }
      })}
    </>
  );
}

// ======================
// 🕹️ MAIN GAME COMPONENT
// ======================
export default function CosmicDefender() {
  const [gameState, setGameState] = useState({
    score: 0,
    gameOver: false,
    gameStarted: false,
    level: 1,
    health: 100,
    highScore: typeof window !== 'undefined' ? parseInt(localStorage.getItem('cosmicHighScore') || '0') : 0,
    paused: false,
    invincible: false,
    invincibleEndTime: 0
  });

  const [gameObjects, setGameObjects] = useState<any[]>([]);
  const [shipPosition, setShipPosition] = useState({ x: 200, y: 300 });
  const [shipVelocity, setShipVelocity] = useState({ x: 0, y: 0 });
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false });
  const [showInstructions, setShowInstructions] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 500 });
  const [shakeEndTime, setShakeEndTime] = useState(0);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const gameLoopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const { playSound, isAudioReady } = useAudioManager();

  const GAME_WIDTH = dimensions.width;
  const GAME_HEIGHT = dimensions.height;
  const SHIP_SIZE = 40;
  const BULLET_SIZE = 8;
  const OBSTACLE_SIZE = 30;
  const COLLECTIBLE_SIZE = 20;

  useEffect(() => {
    if (gameState.highScore > 0) {
      localStorage.setItem('cosmicHighScore', gameState.highScore.toString());
    }
  }, [gameState.highScore]);

  // ✅ FIXED: containerRef.current is possibly null
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return; // ✅ Null check
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(400, Math.floor(rect.height))
      });
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    updateSize();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (gameState.invincible && Date.now() > gameState.invincibleEndTime) {
      setGameState(prev => ({ ...prev, invincible: false }));
    }
  }, [gameState.invincible, gameState.invincibleEndTime]);

  const generateObstacle = useCallback(() => ({
    id: Math.random().toString(36).substr(2, 9),
    x: Math.random() * (GAME_WIDTH - OBSTACLE_SIZE),
    y: -OBSTACLE_SIZE - 40,
    type: 'obstacle',
    size: OBSTACLE_SIZE * (0.8 + Math.random() * 0.4)
  }), [GAME_WIDTH]);

  const generateCollectible = useCallback(() => ({
    id: Math.random().toString(36).substr(2, 9),
    x: Math.random() * (GAME_WIDTH - COLLECTIBLE_SIZE),
    y: -COLLECTIBLE_SIZE - 40,
    type: 'collectible',
    size: COLLECTIBLE_SIZE
  }), [GAME_WIDTH]);

  const getLevelParams = useCallback((level: number) => {
    const factor = Math.pow(level, 0.7) * 0.1;
    return {
      obstacleSpeed: 200 + level * 30 + factor * 120, // Much faster movement
      collectibleSpeed: 150 + level * 20 + factor * 80, // Much faster movement
      obstacleRate: Math.min(0.012 + level * 0.0025 + factor * 0.015, 0.07),
      maxObjects: Math.min(35 + level * 4, 70)
    };
  }, []);

  const shootBullet = useCallback(() => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;
    playSound('shoot');
    setGameObjects(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      x: shipPosition.x + SHIP_SIZE / 2 - BULLET_SIZE / 2,
      y: shipPosition.y,
      type: 'bullet',
      size: BULLET_SIZE
    }]);
  }, [gameState, shipPosition, playSound]);

  const updateShipPosition = useCallback(() => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;

    setShipPosition(prev => {
      let newX = prev.x;
      // Allow ship to move across most of the screen height to reach asteroids
      const minY = Math.floor(GAME_HEIGHT * 0.3);
      const maxY = Math.floor(GAME_HEIGHT * 0.9);
      let newY = Math.max(minY, Math.min(maxY, prev.y));
      
      const acceleration = 0.35;
      const maxSpeed = 9;
      const friction = 0.88;
      
      let velX = shipVelocity.x;
      let velY = shipVelocity.y;
      
      if (keys.a && !keys.d) velX = Math.max(-maxSpeed, velX - acceleration);
      else if (keys.d && !keys.a) velX = Math.min(maxSpeed, velX + acceleration);
      else velX *= friction;

      if (keys.w && !keys.s) velY = Math.max(-maxSpeed, velY - acceleration);
      else if (keys.s && !keys.w) velY = Math.min(maxSpeed, velY + acceleration);
      else velY *= friction;

      newX += velX;
      newY += velY;

      newX = Math.max(0, Math.min(GAME_WIDTH - SHIP_SIZE, newX));
      newY = Math.max(minY, Math.min(maxY - SHIP_SIZE, newY));

      setShipVelocity({ x: velX, y: velY });
      return { x: newX, y: newY };
    });
  }, [keys, gameState, GAME_HEIGHT, GAME_WIDTH, shipVelocity]);

  const checkCollisions = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    const ship = { 
      x: shipPosition.x + 6, 
      y: shipPosition.y + 6, 
      right: shipPosition.x + SHIP_SIZE - 6,
      bottom: shipPosition.y + SHIP_SIZE - 6
    };

    const obstacleCollisions = gameObjects.filter(obj => {
      if (obj.type !== 'obstacle') return false;
      const ox = obj.x + 6;
      const oy = obj.y + 6;
      const oright = ox + obj.size - 12;
      const obottom = oy + obj.size - 12;
      return ox < ship.right && oright > ship.x && oy < ship.bottom && obottom > ship.y;
    });

    if (obstacleCollisions.length > 0 && !gameState.invincible) {
      playSound('hit');
      setShakeEndTime(Date.now() + 500);
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 300);

      setGameState(prev => {
        const newHealth = Math.max(0, prev.health - 20 * obstacleCollisions.length);
        const gameOver = newHealth <= 0;
        return { ...prev, health: newHealth, gameOver };
      });

      setGameObjects(prev => prev.filter(obj => !obstacleCollisions.includes(obj)));
    }

    const collectibleCollisions = gameObjects.filter(obj => {
      if (obj.type !== 'collectible') return false;
      const cx = obj.x + 4;
      const cy = obj.y + 4;
      const cright = cx + obj.size - 8;
      const cbottom = cy + obj.size - 8;
      return cx < ship.right && cright > ship.x && cy < ship.bottom && cbottom > ship.y;
    });

    if (collectibleCollisions.length > 0) {
      playSound('collect');
      setScoreFlash(true);
      setTimeout(() => setScoreFlash(false), 300);

      setGameState(prev => {
        const points = collectibleCollisions.length * 10;
        const newScore = prev.score + points;
        const newLevel = Math.floor(newScore / 100) + 1;
        const newHighScore = Math.max(prev.highScore, newScore);
        
        if (newScore >= 100 && !prev.invincible) {
          return {
            ...prev,
            score: newScore,
            level: newLevel,
            highScore: newHighScore,
            invincible: true,
            invincibleEndTime: Date.now() + 3000
          };
        }

        return {
          ...prev,
          score: newScore,
          level: newLevel,
          highScore: newHighScore
        };
      });

      setGameObjects(prev => prev.filter(obj => !collectibleCollisions.includes(obj)));
    }
  }, [shipPosition, gameObjects, gameState, GAME_WIDTH, GAME_HEIGHT, playSound]);

  const updateGameObjects = useCallback((dt: number) => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;

    setGameObjects(prev => {
      const params = getLevelParams(gameState.level);
      const dtSec = Math.min(0.05, dt / 1000);
      const levelScale = 1 + gameState.level * 0.07;

      const updated = prev.map(obj => {
        switch (obj.type) {
          case 'bullet': return { ...obj, y: obj.y - 450 * levelScale * dtSec };
          case 'obstacle': return { ...obj, y: obj.y + params.obstacleSpeed * levelScale * dtSec };
          case 'collectible': return { ...obj, y: obj.y + params.collectibleSpeed * levelScale * dtSec };
          default: return obj;
        }
      }).filter(obj => obj.y > -150 && obj.y < GAME_HEIGHT + 150);

      const newObjects = [];
      if (Math.random() < params.obstacleRate) newObjects.push(generateObstacle());
      if (Math.random() < 0.015 + gameState.level * 0.002) newObjects.push(generateCollectible());

      const combined = [...updated, ...newObjects];
      if (combined.length > params.maxObjects) {
        return combined.slice(combined.length - params.maxObjects);
      }

      return combined;
    });
  }, [gameState, GAME_HEIGHT, generateObstacle, generateCollectible, getLevelParams]);

  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (dt > 0 && dt < 1000) {
        updateShipPosition();
        updateGameObjects(dt);
        checkCollisions();
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      lastTimeRef.current = 0;
    };
  }, [updateShipPosition, updateGameObjects, checkCollisions, gameState]);

  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;
    const delay = Math.max(80, 200 - gameState.level * 15);
    const interval = setInterval(shootBullet, delay);
    return () => clearInterval(interval);
  }, [shootBullet, gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGameState(prev => ({ ...prev, paused: !prev.paused }));
        return;
      }
      if (!gameState.gameStarted || gameState.gameOver) return;
      
      const key = e.key.toLowerCase();
      setKeys(prev => ({
        ...prev,
        ...(key === 'w' || key === 'arrowup') && { w: true },
        ...(key === 'a' || key === 'arrowleft') && { a: true },
        ...(key === 's' || key === 'arrowdown') && { s: true },
        ...(key === 'd' || key === 'arrowright') && { d: true },
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setKeys(prev => ({
        ...prev,
        ...(key === 'w' || key === 'arrowup') && { w: false },
        ...(key === 'a' || key === 'arrowleft') && { a: false },
        ...(key === 's' || key === 'arrowdown') && { s: false },
        ...(key === 'd' || key === 'arrowright') && { d: false },
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const screenWidth = rect.width;

      if (x < screenWidth / 2) {
        setKeys(prev => ({ ...prev, a: true, d: false }));
      } else {
        setKeys(prev => ({ ...prev, d: true, a: false }));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setKeys(prev => ({ ...prev, a: false, d: false }));
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gameState.gameStarted, gameState.gameOver]);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      score: 0,
      gameOver: false,
      gameStarted: true,
      level: 1,
      health: 100,
      paused: false,
      invincible: false
    }));
    setGameObjects([]);
    setShipPosition({
      x: GAME_WIDTH / 2 - SHIP_SIZE / 2,
      y: GAME_HEIGHT * 0.7 - SHIP_SIZE
    });
    setShipVelocity({ x: 0, y: 0 });
    setKeys({ w: false, a: false, s: false, d: false });
    setShowInstructions(false);
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      score: 0,
      gameOver: false,
      gameStarted: false,
      level: 1,
      health: 100,
      paused: false,
      invincible: false
    }));
    setGameObjects([]);
    setShipPosition({ 
      x: GAME_WIDTH / 2 - SHIP_SIZE / 2, 
      y: GAME_HEIGHT * 0.7 - SHIP_SIZE 
    });
    setShipVelocity({ x: 0, y: 0 });
    setKeys({ w: false, a: false, s: false, d: false });
    setShowInstructions(true);
  };

  const togglePause = () => {
    if (!gameState.gameStarted || gameState.gameOver) return;
    setGameState(prev => ({ ...prev, paused: !prev.paused }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex flex-col">
      <div className="bg-black/20 backdrop-blur-md border-b border-blue-500/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-xl font-bold text-white">🚀 Cosmic Defender</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className={`bg-blue-500/20 px-3 py-2 rounded border transition-all ${scoreFlash ? 'ring-2 ring-blue-400 scale-105' : ''}`}>
                <div className="text-xs text-blue-300">Score</div>
                <div className="text-lg font-bold text-white">{gameState.score.toLocaleString()}</div>
              </div>
              <div className={`bg-red-500/20 px-3 py-2 rounded border transition-all ${damageFlash ? 'ring-2 ring-red-400 scale-105' : ''}`}>
                <div className="text-xs text-red-300">Health</div>
                <div className="w-24 h-2 bg-red-900/50 rounded mt-1">
                  <div className="h-full bg-gradient-to-r from-red-400 to-red-600" style={{ width: `${(gameState.health / 100) * 100}%` }} />
                </div>
              </div>
              <div className="bg-green-500/20 px-3 py-2 rounded border">
                <div className="text-xs text-green-300">Level</div>
                <div className="text-lg font-bold text-white">{gameState.level}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {!gameState.gameStarted ? (
                <button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition">
                  Start Game
                </button>
              ) : (
                <>
                  <button onClick={togglePause} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-bold transition">
                    {gameState.paused ? 'Resume' : 'Pause'}
                  </button>
                  <button onClick={resetGame} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold transition">
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-blue-500/30 h-full overflow-hidden">
          {/* ✅ FIXED: containerRef.current null check already handled in effect */}
          <div ref={containerRef} className="w-full h-full min-h-[500px] relative">
            <Canvas shadows camera={{ position: [0, 3, 12], fov: 60 }}>
              <GameScene 
                gameState={gameState}
                shipPosition={shipPosition}
                shipVelocity={shipVelocity}
                shakeEndTime={shakeEndTime}
                gameWidth={GAME_WIDTH}
                gameHeight={GAME_HEIGHT}
                gameObjects={gameObjects}
              />
              <EffectComposer>
                <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} />
                <Vignette eskil={false} offset={0.1} darkness={0.5} />
              </EffectComposer>
            </Canvas>
          </div>
        </div>
      </div>

      {gameState.gameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-xl text-center border border-red-500">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over</h2>
            <p className="text-xl text-white mb-2">Score: {gameState.score.toLocaleString()}</p>
            {gameState.score >= gameState.highScore && (
              <p className="text-green-400 font-bold">🎉 New High Score!</p>
            )}
            <button onClick={resetGame} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-bold">
              Play Again
            </button>
          </div>
        </div>
      )}

      {!gameState.gameStarted && !gameState.gameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-xl text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold text-white mb-4">Cosmic Defender</h2>
            <p className="mb-6">Navigate space, destroy asteroids, collect power-ups!</p>
            <button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-bold w-full">
              Start Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}