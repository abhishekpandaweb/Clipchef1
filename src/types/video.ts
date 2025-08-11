export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
  size: number;
  aspectRatio: number;
}

export interface SceneDetectionConfig {
  sensitivity: 'low' | 'medium' | 'high';
  algorithms: {
    pixelDifference: {
      enabled: boolean;
      threshold: number;
      weight: number;
    };
    audioAmplitude: {
      enabled: boolean;
      threshold: number;
      weight: number;
    };
    colorHistogram: {
      enabled: boolean;
      threshold: number;
      weight: number;
    };
    motionVector: {
      enabled: boolean;
      threshold: number;
      weight: number;
    };
    faceDetection: {
      enabled: boolean;
      speakerChangeThreshold: number;
      weight: number;
    };
  };
  minSceneDuration: number;
  maxScenes: number;
  preserveContext: boolean;
  maintainNarrativeFlow: boolean;
}

export interface DetectedScene {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
  thumbnail: string;
  videoUrl?: string;
  description?: string;
  detectionMethods: {
    pixelDifference: number;
    audioAmplitude: number;
    colorHistogram: number;
    motionVector: number;
    faceDetection: number;
  };
  contextScore: number;
  narrativeImportance: number;
  viralPotential: number;
  speakers: string[];
  dominantColors: string[];
  motionLevel: 'low' | 'medium' | 'high';
  audioFeatures: {
    averageAmplitude: number;
    speechRatio: number;
    musicRatio: number;
  };
}

export interface PlatformPreset {
  id: string;
  name: string;
  displayName: string;
  aspectRatio: number;
  width: number;
  height: number;
  maxDuration: number;
  cropStrategy: 'center' | 'smart' | 'face-tracking' | 'action-following' | 'speaker-focus';
  audioRequired: boolean;
  optimizations: {
    hookDuration: number; // seconds for opening hook
    engagementBoosts: string[]; // captions, effects, etc.
    algorithmFriendly: boolean;
    trendingFormats: string[];
    captionStyle: 'minimal' | 'engaging' | 'professional' | 'trendy';
  };
  contentGuidelines: {
    preferredLength: number;
    idealPacing: 'fast' | 'medium' | 'slow';
    attentionSpan: number; // seconds
    viralElements: string[];
  };
}

export interface ClipGenerationJob {
  id: string;
  videoId: string;
  sceneId: string;
  platform: string;
  preset: PlatformPreset;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  thumbnail?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ProcessingStep {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface VideoProcessingJob {
  id: string;
  videoFile: VideoFile;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  steps: ProcessingStep[];
  metadata?: VideoMetadata;
  scenes: DetectedScene[];
  clips: ClipGenerationJob[];
  progress: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingProgress {
  jobId: string;
  stepId: string;
  progress: number;
  message: string;
  data?: any;
}

export interface WorkerMessage {
  type: 'progress' | 'complete' | 'error' | 'log';
  jobId: string;
  stepId?: string;
  data: any;
}

export interface FFmpegCommand {
  input: string;
  output: string;
  args: string[];
  expectedDuration?: number;
}

// Update existing VideoFile interface
export interface VideoFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  duration: number;
  format: string;
  thumbnail: string;
  url: string;
  uploadedAt: Date;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  projectId?: string;
  metadata?: VideoMetadata;
  processingJobId?: string;
}