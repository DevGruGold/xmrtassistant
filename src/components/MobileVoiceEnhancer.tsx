import { useEffect } from 'react';
import { BrowserCompatibilityService } from '@/utils/browserCompatibility';

// Enhanced mobile voice optimizations
export const MobileVoiceEnhancer = () => {
  useEffect(() => {
    const capabilities = BrowserCompatibilityService.detectCapabilities();
    
    if (capabilities.isMobile) {
      console.log('🎤 Enhanced mobile voice optimizations initialized');
      
      // Enhanced audio unlock for mobile
      const unlockAudio = async () => {
        try {
          // Create silent audio to unlock AudioContext
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          
          console.log('🔓 Audio context unlocked for mobile');
        } catch (error) {
          console.warn('⚠️ Audio unlock failed:', error);
        }
      };

      // Enhanced permission request for mobile
      const requestPermissions = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 16000,
              channelCount: 1
            }
          }).then(stream => {
            // Immediately stop the stream to avoid conflicts
            stream.getTracks().forEach(track => track.stop());
            console.log('🎤 Mobile microphone permissions granted');
          });
        } catch (error) {
          console.warn('🎤 Mobile microphone permission failed:', error);
        }
      };

      // Combined mobile initialization
      const initializeMobile = async () => {
        await unlockAudio();
        await requestPermissions();
      };

      // Enhanced touch event listener
      const touchHandler = (event: TouchEvent) => {
        console.log('👆 Mobile touch detected, initializing audio...');
        initializeMobile();
        document.removeEventListener('touchstart', touchHandler);
        document.removeEventListener('click', touchHandler);
      };
      
      // Listen for both touch and click events
      document.addEventListener('touchstart', touchHandler, { passive: true });
      document.addEventListener('click', touchHandler, { passive: true });
      
      // Mobile-specific optimizations
      if (capabilities.userGestureRequired) {
        console.log('🎤 Mobile: User gesture required for audio');
      }
      
      // Prevent mobile Safari audio interruptions
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          console.log('📱 Mobile app resumed, reinitializing audio...');
          initializeMobile();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('touchstart', touchHandler);
        document.removeEventListener('click', touchHandler);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  return null; // This is a utility component
};

export default MobileVoiceEnhancer;