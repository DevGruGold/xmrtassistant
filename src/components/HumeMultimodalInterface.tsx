import React, { useState, useCallback } from 'react';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { HumeVoiceChat, EmotionData } from './HumeVoiceChat';
import { HumeVideoAnalyzer, FacialEmotion } from './HumeVideoAnalyzer';
import { EmotionVisualizer, EmotionReading } from './EmotionVisualizer';
import { Mic, Camera, Layers, Activity } from 'lucide-react';

interface HumeMultimodalInterfaceProps {
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onEmotionChange?: (emotions: EmotionReading[]) => void;
  layout?: 'side-by-side' | 'stacked' | 'overlay';
  className?: string;
}

export const HumeMultimodalInterface: React.FC<HumeMultimodalInterfaceProps> = ({
  onTranscript,
  onEmotionChange,
  layout = 'side-by-side',
  className = ''
}) => {
  const [voiceEmotions, setVoiceEmotions] = useState<EmotionReading[]>([]);
  const [facialEmotions, setFacialEmotions] = useState<EmotionReading[]>([]);
  const [activeTab, setActiveTab] = useState<'combined' | 'voice' | 'video' | 'emotions'>('combined');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);

  // Handle voice emotion updates
  const handleVoiceEmotionUpdate = useCallback((emotions: EmotionData[]) => {
    const readings: EmotionReading[] = emotions.map(e => ({
      name: e.name,
      score: e.score,
      source: 'voice' as const
    }));
    setVoiceEmotions(readings);
    
    if (onEmotionChange) {
      onEmotionChange([...readings, ...facialEmotions]);
    }
  }, [facialEmotions, onEmotionChange]);

  // Handle facial emotion updates
  const handleFacialEmotionUpdate = useCallback((emotions: FacialEmotion[]) => {
    const readings: EmotionReading[] = emotions.map(e => ({
      name: e.name,
      score: e.score,
      source: 'face' as const
    }));
    setFacialEmotions(readings);
    setIsVideoActive(emotions.length > 0);
    
    if (onEmotionChange) {
      onEmotionChange([...voiceEmotions, ...readings]);
    }
  }, [voiceEmotions, onEmotionChange]);

  // Handle transcript updates
  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    if (onTranscript) {
      onTranscript(text, role);
    }
    if (role === 'user' || role === 'assistant') {
      setIsVoiceActive(true);
    }
  }, [onTranscript]);

  // Render based on layout
  const renderCombinedView = () => (
    <div className={`grid gap-4 ${layout === 'side-by-side' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
      {/* Voice Chat */}
      <div className="min-h-[400px]">
        <HumeVoiceChat
          onEmotionUpdate={handleVoiceEmotionUpdate}
          onTranscript={handleTranscript}
        />
      </div>
      
      {/* Video & Emotions */}
      <div className="space-y-4">
        <HumeVideoAnalyzer
          onEmotionUpdate={handleFacialEmotionUpdate}
          captureInterval={1500}
        />
        <EmotionVisualizer
          voiceEmotions={voiceEmotions}
          facialEmotions={facialEmotions}
        />
      </div>
    </div>
  );

  const renderOverlayView = () => (
    <div className="relative min-h-[500px]">
      {/* Main voice chat */}
      <div className="h-full">
        <HumeVoiceChat
          onEmotionUpdate={handleVoiceEmotionUpdate}
          onTranscript={handleTranscript}
        />
      </div>
      
      {/* Video overlay in corner */}
      <div className="absolute top-4 right-4 w-48 z-10">
        <HumeVideoAnalyzer
          onEmotionUpdate={handleFacialEmotionUpdate}
          captureInterval={2000}
        />
      </div>
      
      {/* Emotion bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[...voiceEmotions, ...facialEmotions]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((emotion, i) => (
              <Badge 
                key={`${emotion.name}-${i}`} 
                variant="outline"
                className="whitespace-nowrap"
              >
                {emotion.name}: {(emotion.score * 100).toFixed(0)}%
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card className={`bg-card/50 backdrop-blur border-border/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-500" />
          <span className="font-medium">Multimodal Experience</span>
        </div>
        <div className="flex items-center gap-2">
          {isVoiceActive && (
            <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400">
              <Mic className="h-3 w-3 mr-1" />
              Voice
            </Badge>
          )}
          {isVideoActive && (
            <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400">
              <Camera className="h-3 w-3 mr-1" />
              Video
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-3">
          <TabsTrigger value="combined" className="data-[state=active]:bg-muted">
            <Layers className="h-4 w-4 mr-2" />
            Combined
          </TabsTrigger>
          <TabsTrigger value="voice" className="data-[state=active]:bg-muted">
            <Mic className="h-4 w-4 mr-2" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="video" className="data-[state=active]:bg-muted">
            <Camera className="h-4 w-4 mr-2" />
            Video
          </TabsTrigger>
          <TabsTrigger value="emotions" className="data-[state=active]:bg-muted">
            <Activity className="h-4 w-4 mr-2" />
            Emotions
          </TabsTrigger>
        </TabsList>

        <div className="p-4">
          <TabsContent value="combined" className="mt-0">
            {layout === 'overlay' ? renderOverlayView() : renderCombinedView()}
          </TabsContent>

          <TabsContent value="voice" className="mt-0">
            <div className="min-h-[400px]">
              <HumeVoiceChat
                onEmotionUpdate={handleVoiceEmotionUpdate}
                onTranscript={handleTranscript}
              />
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-0">
            <HumeVideoAnalyzer
              onEmotionUpdate={handleFacialEmotionUpdate}
              captureInterval={1000}
            />
          </TabsContent>

          <TabsContent value="emotions" className="mt-0">
            <EmotionVisualizer
              voiceEmotions={voiceEmotions}
              facialEmotions={facialEmotions}
              className="min-h-[300px]"
            />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
};

export default HumeMultimodalInterface;
