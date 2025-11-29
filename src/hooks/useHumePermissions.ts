import { useState, useCallback, useRef, useEffect } from 'react';
import { HumeMode } from '@/components/MakeMeHumanToggle';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface HumePermissions {
  micPermission: PermissionStatus;
  cameraPermission: PermissionStatus;
  isRequestingMic: boolean;
  isRequestingCamera: boolean;
  error: string | null;
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  requestMicPermission: () => Promise<boolean>;
  requestCameraPermission: () => Promise<boolean>;
  requestPermissionsForMode: (mode: HumeMode) => Promise<boolean>;
  releaseStreams: () => void;
}

export const useHumePermissions = (): HumePermissions => {
  const [micPermission, setMicPermission] = useState<PermissionStatus>('prompt');
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('prompt');
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Check initial permission states
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check microphone permission
        if (navigator.permissions) {
          try {
            const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setMicPermission(micStatus.state as PermissionStatus);
            micStatus.onchange = () => setMicPermission(micStatus.state as PermissionStatus);
          } catch {
            // Some browsers don't support microphone permission query
          }

          try {
            const camStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
            setCameraPermission(camStatus.state as PermissionStatus);
            camStatus.onchange = () => setCameraPermission(camStatus.state as PermissionStatus);
          } catch {
            // Some browsers don't support camera permission query
          }
        }
      } catch (err) {
        console.log('Permission API not fully supported');
      }
    };

    checkPermissions();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseStreams();
    };
  }, []);

  const releaseStreams = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
      setAudioStream(null);
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
      setVideoStream(null);
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (audioStreamRef.current) {
      return true; // Already have stream
    }

    setIsRequestingMic(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioStreamRef.current = stream;
      setAudioStream(stream);
      setMicPermission('granted');
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicPermission('denied');
          setError('Microphone access denied. Please enable it in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setMicPermission('unavailable');
          setError('No microphone found on this device.');
        } else {
          setError(`Microphone error: ${err.message}`);
        }
      } else {
        setError('Failed to access microphone.');
      }
      
      return false;
    } finally {
      setIsRequestingMic(false);
    }
  }, []);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (videoStreamRef.current) {
      return true; // Already have stream
    }

    setIsRequestingCamera(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      videoStreamRef.current = stream;
      setVideoStream(stream);
      setCameraPermission('granted');
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraPermission('denied');
          setError('Camera access denied. Please enable it in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setCameraPermission('unavailable');
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera.');
      }
      
      return false;
    } finally {
      setIsRequestingCamera(false);
    }
  }, []);

  const requestPermissionsForMode = useCallback(async (mode: HumeMode): Promise<boolean> => {
    setError(null);

    if (mode === 'tts') {
      return true; // No permissions needed for TTS
    }

    if (mode === 'voice') {
      return await requestMicPermission();
    }

    if (mode === 'multimodal') {
      // For multimodal: request COMBINED audio + video in single stream
      // Audio comes from webcam's built-in microphone, not separate mic
      setIsRequestingCamera(true);
      setIsRequestingMic(true);
      
      try {
        const combinedStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
        
        // Extract audio track for voice streaming (from webcam mic)
        const audioTracks = combinedStream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioOnlyStream = new MediaStream([audioTracks[0]]);
          audioStreamRef.current = audioOnlyStream;
          setAudioStream(audioOnlyStream);
          setMicPermission('granted');
          console.log('🎬 Multimodal: Audio extracted from webcam stream');
        }
        
        // Keep the full stream for video (includes both audio + video tracks)
        videoStreamRef.current = combinedStream;
        setVideoStream(combinedStream);
        setCameraPermission('granted');
        
        console.log('🎬 Multimodal: Combined audio+video stream ready');
        return true;
        
      } catch (err) {
        console.error('Multimodal permission error:', err);
        
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setMicPermission('denied');
            setCameraPermission('denied');
            setError('Camera and microphone access denied. Please enable in browser settings.');
          } else if (err.name === 'NotFoundError') {
            setError('Camera or microphone not found on this device.');
          } else {
            setError(`Device error: ${err.message}`);
          }
        } else {
          setError('Failed to access camera and microphone.');
        }
        
        return false;
      } finally {
        setIsRequestingMic(false);
        setIsRequestingCamera(false);
      }
    }

    return false;
  }, []);

  return {
    micPermission,
    cameraPermission,
    isRequestingMic,
    isRequestingCamera,
    error,
    audioStream,
    videoStream,
    requestMicPermission,
    requestCameraPermission,
    requestPermissionsForMode,
    releaseStreams
  };
};

export default useHumePermissions;
