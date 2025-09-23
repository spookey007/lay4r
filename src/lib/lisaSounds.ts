// Lisa OS Sound System
// Authentic Lisa OS click sounds and audio feedback

export class LisaSoundManager {
  private static instance: LisaSoundManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 0.3;

  private constructor() {
    this.initializeAudioContext();
  }

  public static getInstance(): LisaSoundManager {
    if (!LisaSoundManager.instance) {
      LisaSoundManager.instance = new LisaSoundManager();
    }
    return LisaSoundManager.instance;
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadSounds();
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }

  private async loadSounds() {
    if (!this.audioContext) return;

    try {
      // Load actual audio files from public/web_sounds/
      await this.loadAudioFile('click', '/web_sounds/mouse_click.wav');
      await this.loadAudioFile('menuClick', '/web_sounds/mouse_click.wav'); // Use same sound for menu
      await this.loadAudioFile('buttonClick', '/web_sounds/mouse_click.wav'); // Use same sound for buttons
      await this.loadAudioFile('linkClick', '/web_sounds/mouse_hover.wav'); // Use hover sound for links
      await this.loadAudioFile('chat', '/web_sounds/chat_close.wav'); // Use chat close for chat sounds
      await this.loadAudioFile('chatClose', '/web_sounds/chat_close.wav'); // Specific chat close sound
      await this.loadAudioFile('hover', '/web_sounds/mouse_hover.wav'); // Hover sound

      // Keep some generated sounds as fallbacks
      const errorSound = this.generateLisaErrorSound();
      this.sounds.set('error', errorSound);

      const successSound = this.generateLisaSuccessSound();
      this.sounds.set('success', successSound);

    } catch (error) {
      console.warn('Sound loading failed:', error);
    }
  }

  private async loadAudioFile(soundName: string, filePath: string): Promise<void> {
    try {
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      this.sounds.set(soundName, audioBuffer);
      console.log(`✅ Loaded sound: ${soundName} from ${filePath}`);
    } catch (error) {
      console.warn(`Failed to load sound ${soundName} from ${filePath}:`, error);
      // Fallback to generated sound
      const fallbackSound = this.generateLisaClickSound();
      this.sounds.set(soundName, fallbackSound);
    }
  }

  private generateLisaClickSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1; // 100ms
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate Lisa OS click sound - short, sharp, digital
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 800 + Math.sin(t * 2000) * 200; // Varying frequency
      const envelope = Math.exp(-t * 15); // Quick decay
      const wave = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = wave * 0.3;
    }

    return buffer;
  }

  private generateLisaMenuClickSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.08;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 1000 + Math.sin(t * 3000) * 300;
      const envelope = Math.exp(-t * 20);
      const wave = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = wave * 0.25;
    }

    return buffer;
  }

  private generateLisaButtonClickSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.12;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 600 + Math.sin(t * 1500) * 150;
      const envelope = Math.exp(-t * 12);
      const wave = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = wave * 0.35;
    }

    return buffer;
  }

  private generateLisaLinkClickSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.06;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 1200 + Math.sin(t * 4000) * 400;
      const envelope = Math.exp(-t * 25);
      const wave = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = wave * 0.2;
    }

    return buffer;
  }

  private generateLisaChatSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 500 + Math.sin(t * 1000) * 100;
      const envelope = Math.exp(-t * 8);
      const wave = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = wave * 0.4;
    }

    return buffer;
  }

  private generateLisaErrorSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 300 + Math.sin(t * 500) * 50;
      const envelope = Math.exp(-t * 5);
      const wave = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = wave * 0.5;
    }

    return buffer;
  }

  private generateLisaSuccessSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.18;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 700 + Math.sin(t * 2000) * 200;
      const envelope = Math.exp(-t * 6);
      const wave = Math.sin(2 * Math.PI * frequency * t) * envelope;
      data[i] = wave * 0.3;
    }

    return buffer;
  }

  public async playSound(soundName: string): Promise<void> {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const sound = this.sounds.get(soundName);
      if (!sound) {
        console.warn(`Sound '${soundName}' not found`);
        return;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = sound;
      gainNode.gain.value = this.volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.isEnabled;
  }

  // Convenience methods for different interaction types
  public async playClick(): Promise<void> {
    await this.playSound('click');
  }

  public async playMenuClick(): Promise<void> {
    await this.playSound('menuClick');
  }

  public async playButtonClick(): Promise<void> {
    await this.playSound('buttonClick');
  }

  public async playLinkClick(): Promise<void> {
    await this.playSound('linkClick');
  }

  public async playChatSound(): Promise<void> {
    await this.playSound('chat');
  }

  public async playErrorSound(): Promise<void> {
    await this.playSound('error');
  }

  public async playSuccessSound(): Promise<void> {
    await this.playSound('success');
  }

  public async playChatCloseSound(): Promise<void> {
    await this.playSound('chatClose');
  }

  public async playHoverSound(): Promise<void> {
    await this.playSound('hover');
  }
}

// Export singleton instance
export const lisaSounds = LisaSoundManager.getInstance();

// React hook for easy integration
export const useLisaSounds = () => {
  return {
    playClick: () => lisaSounds.playClick(),
    playMenuClick: () => lisaSounds.playMenuClick(),
    playButtonClick: () => lisaSounds.playButtonClick(),
    playLinkClick: () => lisaSounds.playLinkClick(),
    playChatSound: () => lisaSounds.playChatSound(),
    playChatCloseSound: () => lisaSounds.playChatCloseSound(),
    playHoverSound: () => lisaSounds.playHoverSound(),
    playErrorSound: () => lisaSounds.playErrorSound(),
    playSuccessSound: () => lisaSounds.playSuccessSound(),
    setVolume: (volume: number) => lisaSounds.setVolume(volume),
    setEnabled: (enabled: boolean) => lisaSounds.setEnabled(enabled),
    isEnabled: lisaSounds.isSoundEnabled()
  };
};
