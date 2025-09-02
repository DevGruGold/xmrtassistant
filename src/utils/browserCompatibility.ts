// Browser compatibility detection and logging utility
export interface BrowserCapabilities {
  speechRecognition: boolean;
  webAudio: boolean;
  mediaDevices: boolean;
  isMobile: boolean;
  browser: string;
  platform: string;
  userGestureRequired: boolean;
}

export class BrowserCompatibilityService {
  static detectCapabilities(): BrowserCapabilities {
    const capabilities: BrowserCapabilities = {
      speechRecognition: false,
      webAudio: false,
      mediaDevices: false,
      isMobile: false,
      browser: 'unknown',
      platform: 'unknown',
      userGestureRequired: false
    };

    // Browser detection
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) {
      capabilities.browser = 'Chrome';
      capabilities.userGestureRequired = true;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      capabilities.browser = 'Safari';
      capabilities.userGestureRequired = true;
    } else if (userAgent.includes('Firefox')) {
      capabilities.browser = 'Firefox';
    } else if (userAgent.includes('Edge')) {
      capabilities.browser = 'Edge';
      capabilities.userGestureRequired = true;
    }

    // Platform detection
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      capabilities.isMobile = true;
      capabilities.platform = 'mobile';
    } else {
      capabilities.platform = 'desktop';
    }

    // Speech Recognition API check
    capabilities.speechRecognition = !!(
      window.SpeechRecognition || 
      window.webkitSpeechRecognition
    );

    // Web Audio API check
    capabilities.webAudio = !!(
      window.AudioContext || 
      window.webkitAudioContext
    );

    // MediaDevices API check
    capabilities.mediaDevices = !!(
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia
    );

    return capabilities;
  }

  static logCapabilities(): void {
    const caps = this.detectCapabilities();
    
    console.group('🔍 Browser Compatibility Analysis');
    console.log('Browser:', caps.browser);
    console.log('Platform:', caps.platform);
    console.log('Is Mobile:', caps.isMobile);
    console.log('Speech Recognition:', caps.speechRecognition ? '✅' : '❌');
    console.log('Web Audio:', caps.webAudio ? '✅' : '❌');
    console.log('Media Devices:', caps.mediaDevices ? '✅' : '❌');
    console.log('User Gesture Required:', caps.userGestureRequired ? '⚠️' : '✅');
    console.groupEnd();

    // Specific warnings
    if (!caps.speechRecognition) {
      console.warn('❌ Speech Recognition not supported in this browser');
    }
    
    if (caps.isMobile && caps.browser === 'Safari') {
      console.warn('⚠️ Safari iOS has limited Speech Recognition support');
    }

    if (caps.userGestureRequired) {
      console.info('ℹ️ User interaction required before starting voice features');
    }
  }

  static getRecommendations(): string[] {
    const caps = this.detectCapabilities();
    const recommendations: string[] = [];

    if (!caps.speechRecognition) {
      recommendations.push('Use Chrome, Edge, or Safari for voice recognition');
    }

    if (caps.isMobile) {
      recommendations.push('Push-to-talk works better on mobile devices');
      recommendations.push('Ensure stable internet connection for mobile voice features');
    }

    if (caps.browser === 'Safari') {
      recommendations.push('Voice features may require user interaction in Safari');
    }

    if (!caps.webAudio || !caps.mediaDevices) {
      recommendations.push('Update your browser for full voice functionality');
    }

    return recommendations;
  }
}