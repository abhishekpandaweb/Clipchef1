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
  pixelThreshold: number;
  audioThreshold: number;
  minSceneDuration: number;
  maxScenes: number;
}

export interface DetectedScene {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
  thumbnail: string;
  description?: string;
  detectionMethod: 'pixel' | 'audio' | 'histogram' | 'motion';
}

export interface PlatformPreset {
  id: string;
  name: string;
  displayName: string;
  aspectRatio: number;
  width: number;
  height: number;
  maxDuration: number;
  cropStrategy: 'center' | 'smart' | 'face-detection';
  audioRequired: boolean;
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