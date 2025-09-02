// Mobile-First Permission Service
export interface MobilePermissionStatus {
  microphone: 'granted' | 'denied' | 'prompt' | 'unavailable';
  hasInteracted: boolean;
  isSupported: boolean;
  browserType: 'safari' | 'chrome' | 'firefox' | 'other';
  isMobile: boolean;
  needsUserGesture: boolean;
}

export interface MobileAudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export class MobilePermissionService {
  private static instance: MobilePermissionService;
  private status: MobilePermissionStatus;
  private audioContext: AudioContext | null = null;
  private currentStream: MediaStream | null = null;

  private constructor() {
    this.status = this.detectMobileCapabilities();
  }

  static getInstance(): MobilePermissionService {
    if (!MobilePermissionService.instance) {
      MobilePermissionService.instance = new MobilePermissionService();
    }
    return MobilePermissionService.instance;
  }

  private detectMobileCapabilities(): MobilePermissionStatus {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    let browserType: 'safari' | 'chrome' | 'firefox' | 'other' = 'other';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserType = 'safari';
    } else if (userAgent.includes('Chrome')) {
      browserType = 'chrome';
    } else if (userAgent.includes('Firefox')) {
      browserType = 'firefox';
    }

    const isSupported = !!(navigator.mediaDevices?.getUserMedia);
    const needsUserGesture = browserType === 'safari' || browserType === 'chrome';

    return {
      microphone: 'prompt',
      hasInteracted: false,
      isSupported,
      browserType,
      isMobile,
      needsUserGesture
    };
  }

  getMobileAudioConfig(): MobileAudioConfig {
    // Optimized settings for mobile devices
    return {
      sampleRate: this.status.isMobile ? 16000 : 44100, // Lower sample rate for mobile
      channelCount: 1, // Mono for better mobile performance
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
  }

  async requestMicrophonePermission(): Promise<{ success: boolean; stream?: MediaStream; error?: string }> {
    if (!this.status.isSupported) {
      return { success: false, error: 'Microphone not supported on this device' };
    }

    if (this.status.needsUserGesture && !this.status.hasInteracted) {
      return { success: false, error: 'User interaction required first' };
    }

    try {
      // Stop any existing stream
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
      }

      const config = this.getMobileAudioConfig();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: config.channelCount,
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression,
          autoGainControl: config.autoGainControl
        }
      });

      this.currentStream = stream;
      this.status.microphone = 'granted';
      
      console.log('🎤 Mobile microphone permission granted', {
        sampleRate: config.sampleRate,
        browser: this.status.browserType,
        mobile: this.status.isMobile
      });

      return { success: true, stream };
    } catch (error) {
      console.error('Mobile microphone permission failed:', error);
      this.status.microphone = 'denied';
      
      let errorMessage = 'Microphone access denied';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Please allow microphone access in your browser settings';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found on this device';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Microphone not supported in this browser';
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  async unlockAudioContext(): Promise<{ success: boolean; error?: string }> {
    if (this.audioContext && this.audioContext.state === 'running') {
      return { success: true };
    }

    try {
      // Create or resume audio context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play silent sound to fully unlock
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);

      console.log('🔓 Mobile audio context unlocked');
      return { success: true };
    } catch (error) {
      console.error('Failed to unlock audio context:', error);
      return { success: false, error: 'Failed to unlock audio' };
    }
  }

  markUserInteraction(): void {
    this.status.hasInteracted = true;
    console.log('👆 User interaction detected - mobile permissions enabled');
  }

  async initializeMobileAudio(): Promise<{ success: boolean; stream?: MediaStream; error?: string }> {
    // Step 1: Unlock audio context
    const audioResult = await this.unlockAudioContext();
    if (!audioResult.success) {
      return { success: false, error: audioResult.error };
    }

    // Step 2: Request microphone permission
    return await this.requestMicrophonePermission();
  }

  getStatus(): MobilePermissionStatus {
    return { ...this.status };
  }

  getBrowserSpecificInstructions(): string[] {
    const instructions: string[] = [];
    
    if (this.status.browserType === 'safari' && this.status.isMobile) {
      instructions.push('Tap the microphone button to enable voice');
      instructions.push('Safari may ask for permission multiple times');
    } else if (this.status.browserType === 'chrome' && this.status.isMobile) {
      instructions.push('Tap to allow microphone when prompted');
      instructions.push('Look for the microphone icon in the address bar');
    } else if (!this.status.isSupported) {
      instructions.push('Voice features not supported in this browser');
      instructions.push('Try Chrome, Safari, or Firefox for voice support');
    }

    return instructions;
  }

  cleanup(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const mobilePermissionService = MobilePermissionService.getInstance();