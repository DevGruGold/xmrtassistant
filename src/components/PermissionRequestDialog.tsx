import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Camera, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { HumeMode } from './MakeMeHumanToggle';
import { PermissionStatus } from '@/hooks/useHumePermissions';

interface PermissionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: HumeMode;
  onRequestPermissions: () => Promise<void>;
  isRequesting: boolean;
  micPermission: PermissionStatus;
  cameraPermission: PermissionStatus;
  error: string | null;
}

export const PermissionRequestDialog: React.FC<PermissionRequestDialogProps> = ({
  open,
  onOpenChange,
  mode,
  onRequestPermissions,
  isRequesting,
  micPermission,
  cameraPermission,
  error
}) => {
  const needsMic = mode === 'voice' || mode === 'multimodal';
  const needsCamera = mode === 'multimodal';

  const getPermissionIcon = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    if (mode === 'voice') return 'Enable Voice Chat';
    if (mode === 'multimodal') return 'Enable Multimodal Mode';
    return 'Enable Permissions';
  };

  const getDescription = () => {
    if (mode === 'voice') {
      return 'Eliza needs microphone access to have a voice conversation with you and understand your emotions through your voice.';
    }
    if (mode === 'multimodal') {
      return 'Eliza needs microphone and camera access for the full empathic experience - understanding both your voice and facial expressions.';
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'voice' && <Mic className="h-5 w-5 text-purple-500" />}
            {mode === 'multimodal' && <Camera className="h-5 w-5 text-purple-500" />}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Microphone permission */}
          {needsMic && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Mic className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Microphone</p>
                  <p className="text-xs text-muted-foreground">For voice input & emotion detection</p>
                </div>
              </div>
              {getPermissionIcon(micPermission)}
            </div>
          )}

          {/* Camera permission */}
          {needsCamera && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Camera className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Camera</p>
                  <p className="text-xs text-muted-foreground">For facial expression analysis</p>
                </div>
              </div>
              {getPermissionIcon(cameraPermission)}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
                {(micPermission === 'denied' || cameraPermission === 'denied') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    To enable, click the lock/camera icon in your browser's address bar and allow access.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onRequestPermissions}
            disabled={isRequesting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : (
              <>Allow Access</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionRequestDialog;
