import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceRecorder } from './VoiceRecorder';
import { CameraCapture } from './CameraCapture';
import { Mic, Camera, Type, Paperclip, Send, X, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultimodalMessage {
  text?: string;
  audio?: Blob;
  images?: string[];
  transcript?: string;
}

interface MultimodalInputProps {
  onSend: (message: MultimodalMessage) => void;
  disabled?: boolean;
  className?: string;
}

export const MultimodalInput = ({ onSend, disabled, className }: MultimodalInputProps) => {
  const [textInput, setTextInput] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [attachments, setAttachments] = useState<{
    audio?: Blob;
    images: string[];
    transcript?: string;
  }>({ images: [] });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = e.target?.result as string;
          setAttachments(prev => ({
            ...prev,
            images: [...prev.images, imageData]
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleAudioCapture = (audioBlob: Blob, transcript?: string) => {
    setAttachments(prev => ({
      ...prev,
      audio: audioBlob,
      transcript
    }));
    if (transcript) {
      setTextInput(prev => prev + (prev ? ' ' : '') + transcript);
    }
  };

  const handleImageCapture = (imageData: string) => {
    setAttachments(prev => ({
      ...prev,
      images: [...prev.images, imageData]
    }));
  };

  const removeImage = (index: number) => {
    setAttachments(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeAudio = () => {
    setAttachments(prev => ({
      ...prev,
      audio: undefined,
      transcript: undefined
    }));
  };

  const handleSend = () => {
    if (!textInput.trim() && !attachments.audio && attachments.images.length === 0) return;
    
    const message: MultimodalMessage = {
      text: textInput.trim() || undefined,
      audio: attachments.audio,
      images: attachments.images.length > 0 ? attachments.images : undefined,
      transcript: attachments.transcript
    };
    
    onSend(message);
    
    // Reset form
    setTextInput('');
    setAttachments({ images: [] });
    setActiveTab('text');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasAttachments = attachments.audio || attachments.images.length > 0;

  return (
    <div className={cn("border rounded-lg bg-background max-h-80 overflow-hidden", className)}>
      {/* Attachments Preview */}
      {hasAttachments && (
        <div className="p-3 border-b bg-secondary/30">
          <div className="flex flex-wrap gap-2">
            {/* Audio attachment */}
            {attachments.audio && (
              <div className="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                <Mic className="h-3 w-3" />
                <span>Voice message</span>
                {attachments.transcript && (
                  <span className="text-xs opacity-70">"{attachments.transcript.substring(0, 30)}..."</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAudio}
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Image attachments */}
            {attachments.images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image}
                  alt={`Attachment ${index + 1}`}
                  className="h-12 w-12 object-cover rounded border"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-none bg-transparent">
          <TabsTrigger value="text" className="flex items-center space-x-2">
            <Type className="h-4 w-4" />
            <span>Text</span>
          </TabsTrigger>
          <TabsTrigger value="rich" className="flex items-center space-x-2">
            <Camera className="h-4 w-4" />
            <span>Rich</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center space-x-2">
            <Mic className="h-4 w-4" />
            <span>Voice</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="p-4 space-y-3">
          <div className="flex space-x-2">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to Eliza..."
              className="min-h-[80px] max-h-[120px] resize-none"
              disabled={disabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            <Button onClick={handleSend} disabled={disabled || (!textInput.trim() && !hasAttachments)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="rich" className="p-4">
          <div className="space-y-4">
            <VoiceRecorder
              onAudioCapture={handleAudioCapture}
              className="min-h-[120px] max-h-[150px] flex items-center justify-center overflow-hidden"
            />
            <CameraCapture
              onImageCapture={handleImageCapture}
              className="min-h-[150px] max-h-[200px] overflow-hidden"
            />
          </div>
          {(textInput || hasAttachments) && (
            <div className="mt-4 pt-3 border-t flex justify-end">
              <Button onClick={handleSend} disabled={disabled}>
                <Send className="h-4 w-4 mr-2" />
                Send Rich Message
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="voice" className="p-0">
          {/* Voice tab content will be handled by UnifiedChat directly */}
          <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Continuous voice mode handled by chat interface</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};