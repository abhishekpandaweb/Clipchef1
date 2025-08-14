export interface AIModel {
  id: string;
  name: string;
  type: 'llm' | 'whisper' | 'vision';
  size: number; // in MB
  loaded: boolean;
  downloadProgress: number;
  capabilities: string[];
}

export interface AIProcessingConfig {
  useLocalModels: boolean;
  enableOfflineMode: boolean;
  modelQuality: 'fast' | 'balanced' | 'high';
  privacyMode: boolean;
}

export interface ContentAnalysis {
  speakers: SpeakerSegment[];
  emotions: EmotionSegment[];
  topics: TopicSegment[];
  viralMoments: ViralMoment[];
  engagementScore: number;
  narrativeFlow: NarrativeSegment[];
}

export interface SpeakerSegment {
  id: string;
  startTime: number;
  endTime: number;
  speakerId: string;
  confidence: number;
  transcript: string;
  emotion: string;
}

export interface EmotionSegment {
  startTime: number;
  endTime: number;
  emotion: 'joy' | 'surprise' | 'anger' | 'sadness' | 'fear' | 'neutral';
  intensity: number;
  confidence: number;
}

export interface TopicSegment {
  startTime: number;
  endTime: number;
  topic: string;
  keywords: string[];
  relevanceScore: number;
}

export interface ViralMoment {
  id: string;
  startTime: number;
  endTime: number;
  type: 'hook' | 'punchline' | 'revelation' | 'emotional_peak' | 'call_to_action';
  viralScore: number;
  description: string;
  suggestedPlatforms: string[];
}

export interface NarrativeSegment {
  startTime: number;
  endTime: number;
  type: 'introduction' | 'buildup' | 'climax' | 'resolution' | 'transition';
  importance: number;
  contextDependency: number;
}

export interface FaceDetection {
  timestamp: number;
  faces: {
    id: string;
    bbox: { x: number; y: number; width: number; height: number };
    confidence: number;
    landmarks: { x: number; y: number }[];
  }[];
}

export interface MotionAnalysis {
  timestamp: number;
  motionVectors: {
    x: number;
    y: number;
    magnitude: number;
    direction: number;
  }[];
  cameraMovement: {
    type: 'static' | 'pan' | 'tilt' | 'zoom' | 'shake';
    intensity: number;
  };
}

// Transcription types
export interface TranscriptionCapabilities {
  languages: string[];
  maxDuration: number; // in seconds
  supportsSpeakerDiarization: boolean;
  supportsWordTimestamps: boolean;
  accuracyRate: number; // 0-1
}

export interface CaptionStyle {
  platform: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
  alignment: 'left' | 'center' | 'right';
  maxLineLength: number;
  lineBreakStrategy: 'word' | 'character' | 'smart';
}