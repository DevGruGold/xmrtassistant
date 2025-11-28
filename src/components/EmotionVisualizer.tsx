import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { TrendingUp, TrendingDown, Minus, Activity, Heart, Smile, Frown } from 'lucide-react';

export interface EmotionReading {
  name: string;
  score: number;
  source: 'voice' | 'face' | 'fused';
}

interface EmotionVisualizerProps {
  voiceEmotions?: EmotionReading[];
  facialEmotions?: EmotionReading[];
  className?: string;
}

interface EmotionHistory {
  timestamp: number;
  emotions: EmotionReading[];
  dominantEmotion: string;
}

export const EmotionVisualizer: React.FC<EmotionVisualizerProps> = ({
  voiceEmotions = [],
  facialEmotions = [],
  className = ''
}) => {
  const [fusedEmotions, setFusedEmotions] = useState<EmotionReading[]>([]);
  const [emotionHistory, setEmotionHistory] = useState<EmotionHistory[]>([]);
  const [emotionalTrend, setEmotionalTrend] = useState<'improving' | 'declining' | 'stable'>('stable');
  const [dominantEmotion, setDominantEmotion] = useState<string>('neutral');

  // Fuse voice and facial emotions
  useEffect(() => {
    const emotionMap = new Map<string, { voiceScore: number; faceScore: number; count: number }>();

    // Add voice emotions
    voiceEmotions.forEach(e => {
      const existing = emotionMap.get(e.name) || { voiceScore: 0, faceScore: 0, count: 0 };
      existing.voiceScore = e.score;
      existing.count++;
      emotionMap.set(e.name, existing);
    });

    // Add facial emotions
    facialEmotions.forEach(e => {
      const existing = emotionMap.get(e.name) || { voiceScore: 0, faceScore: 0, count: 0 };
      existing.faceScore = e.score;
      existing.count++;
      emotionMap.set(e.name, existing);
    });

    // Calculate fused scores (weighted average: face 60%, voice 40%)
    const fused: EmotionReading[] = [];
    emotionMap.forEach((value, name) => {
      const fusedScore = (value.faceScore * 0.6 + value.voiceScore * 0.4) / 
        (value.faceScore > 0 && value.voiceScore > 0 ? 1 : value.count > 0 ? 1 : 1);
      
      if (fusedScore > 0.01) {
        fused.push({
          name,
          score: Math.min(fusedScore, 1),
          source: 'fused'
        });
      }
    });

    // Sort by score
    fused.sort((a, b) => b.score - a.score);
    setFusedEmotions(fused);

    // Update dominant emotion
    if (fused.length > 0) {
      setDominantEmotion(fused[0].name);
    }

    // Add to history (keep last 30 entries)
    if (fused.length > 0) {
      setEmotionHistory(prev => {
        const newHistory = [...prev, {
          timestamp: Date.now(),
          emotions: fused,
          dominantEmotion: fused[0]?.name || 'neutral'
        }];
        return newHistory.slice(-30);
      });
    }
  }, [voiceEmotions, facialEmotions]);

  // Calculate emotional trend
  useEffect(() => {
    if (emotionHistory.length < 3) {
      setEmotionalTrend('stable');
      return;
    }

    const positiveEmotions = ['joy', 'happiness', 'interest', 'excitement', 'amusement', 'contentment'];
    
    const recentPositive = emotionHistory.slice(-5).reduce((sum, h) => {
      const positive = h.emotions
        .filter(e => positiveEmotions.includes(e.name.toLowerCase()))
        .reduce((s, e) => s + e.score, 0);
      return sum + positive;
    }, 0);

    const olderPositive = emotionHistory.slice(-10, -5).reduce((sum, h) => {
      const positive = h.emotions
        .filter(e => positiveEmotions.includes(e.name.toLowerCase()))
        .reduce((s, e) => s + e.score, 0);
      return sum + positive;
    }, 0);

    if (recentPositive > olderPositive * 1.2) {
      setEmotionalTrend('improving');
    } else if (recentPositive < olderPositive * 0.8) {
      setEmotionalTrend('declining');
    } else {
      setEmotionalTrend('stable');
    }
  }, [emotionHistory]);

  // Get emotion icon
  const getEmotionIcon = (emotion: string) => {
    const positive = ['joy', 'happiness', 'interest', 'excitement', 'amusement'];
    const negative = ['sadness', 'fear', 'anger', 'disgust', 'contempt'];
    
    if (positive.some(p => emotion.toLowerCase().includes(p))) {
      return <Smile className="h-4 w-4 text-green-500" />;
    }
    if (negative.some(n => emotion.toLowerCase().includes(n))) {
      return <Frown className="h-4 w-4 text-orange-500" />;
    }
    return <Heart className="h-4 w-4 text-pink-500" />;
  };

  // Get trend icon
  const getTrendIcon = () => {
    switch (emotionalTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get emotion color
  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      joy: 'hsl(48, 96%, 53%)',
      happiness: 'hsl(48, 96%, 53%)',
      surprise: 'hsl(187, 100%, 42%)',
      interest: 'hsl(217, 91%, 60%)',
      sadness: 'hsl(217, 91%, 40%)',
      fear: 'hsl(271, 91%, 65%)',
      anger: 'hsl(0, 72%, 51%)',
      disgust: 'hsl(142, 76%, 36%)',
      contempt: 'hsl(24, 94%, 50%)',
      neutral: 'hsl(215, 14%, 46%)'
    };
    return colors[emotion.toLowerCase()] || 'hsl(var(--primary))';
  };

  return (
    <Card className={`bg-card/50 backdrop-blur border-border/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Emotional State</span>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <Badge variant="outline" className="text-xs capitalize">
            {emotionalTrend}
          </Badge>
        </div>
      </div>

      {/* Dominant emotion highlight */}
      {dominantEmotion && fusedEmotions.length > 0 && (
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getEmotionIcon(dominantEmotion)}
              <span className="text-lg font-semibold capitalize">{dominantEmotion}</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: getEmotionColor(dominantEmotion) }}>
              {(fusedEmotions[0]?.score * 100 || 0).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Emotion breakdown */}
      <div className="p-3 space-y-3">
        {/* Source indicators */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Voice</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Face</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Fused</span>
          </div>
        </div>

        {/* Emotion bars */}
        {fusedEmotions.length > 0 ? (
          <div className="space-y-2">
            {fusedEmotions.slice(0, 6).map((emotion) => (
              <div key={emotion.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize">{emotion.name}</span>
                  <span className="text-muted-foreground">{(emotion.score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${emotion.score * 100}%`,
                      backgroundColor: getEmotionColor(emotion.name)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No emotional data yet</p>
            <p className="text-xs">Start speaking or enable camera</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      {emotionHistory.length > 5 && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Recent Timeline</p>
          <div className="flex gap-0.5 h-8">
            {emotionHistory.slice(-20).map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all hover:opacity-80"
                style={{ backgroundColor: getEmotionColor(h.dominantEmotion) }}
                title={`${h.dominantEmotion} at ${new Date(h.timestamp).toLocaleTimeString()}`}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default EmotionVisualizer;
