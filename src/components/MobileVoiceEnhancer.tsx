import { useEffect } from 'react';
import { BrowserCompatibilityService } from '@/utils/browserCompatibility';

// Mobile-specific voice enhancements
export const MobileVoiceEnhancer = () => {
  useEffect(() => {
    const capabilities = BrowserCompatibilityService.detectCapabilities();
    
    if (capabilities.isMobile) {
      console.log('🎤 Mobile voice enhancements initialized');
      
      // Prevent mobile Safari from auto-pausing audio
      const preventAudioPause = () => {
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGMeAjiS2O/PfiwF';
        audio.play().catch(() => {
          // Ignore - this is just to unlock audio context
        });
      };

      // Add touch event listener to unlock audio
      const touchHandler = () => {
        preventAudioPause();
        document.removeEventListener('touchstart', touchHandler);
      };
      
      document.addEventListener('touchstart', touchHandler);
      
      // Optimize for mobile performance
      if (capabilities.userGestureRequired) {
        console.log('🎤 Mobile: User gesture required for audio');
      }
      
      return () => {
        document.removeEventListener('touchstart', touchHandler);
      };
    }
  }, []);

  return null; // This is a utility component
};

export default MobileVoiceEnhancer;