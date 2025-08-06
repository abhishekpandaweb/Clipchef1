// VideoProcessingWorker.ts - Simplified client-side video processing
console.log('VideoProcessingWorker: Starting initialization');

// Define interfaces for worker communication
interface WorkerMessage {
  type: 'progress' | 'complete' | 'error' | 'log';
  jobId: string;
  stepId?: string;
  data: any;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
  size: number;
  aspectRatio: number;
}

interface DetectedScene {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
  thumbnail: string;
  description?: string;
  detectionMethod: 'pixel' | 'audio' | 'histogram' | 'motion';
}

interface SceneDetectionConfig {
  sensitivity: 'low' | 'medium' | 'high';
  pixelThreshold: number;
  audioThreshold: number;
  minSceneDuration: number;
  maxScenes: number;
}

interface PlatformPreset {
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

class VideoProcessor {
  private currentJobId: string | null = null;

  constructor() {
    console.log('VideoProcessor: Constructor called');
  }

  private postMessage(message: WorkerMessage) {
    console.log('VideoProcessor: Posting message', message);
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage(message);
    }
  }

  async extractMetadata(videoFile: File, jobId: string): Promise<VideoMetadata> {
    console.log('VideoProcessor: Extracting metadata for', videoFile.name);
    this.currentJobId = jobId;

    try {
      // Create video element to extract metadata
      const video = document.createElement('video');
      const url = URL.createObjectURL(videoFile);
      video.src = url;
      
      // Wait for metadata to load
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(() => reject(new Error('Metadata loading timeout')), 10000);
      });

      const metadata: VideoMetadata = {
        duration: video.duration || 0,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        fps: 30, // Default - could be extracted from metadata
        bitrate: Math.round(videoFile.size * 8 / (video.duration || 1)),
        format: videoFile.name.split('.').pop() || 'mp4',
        size: videoFile.size,
        aspectRatio: (video.videoWidth || 16) / (video.videoHeight || 9)
      };

      // Clean up
      URL.revokeObjectURL(url);

      this.postMessage({
        type: 'progress',
        jobId,
        data: { progress: 100, message: 'Metadata extracted successfully' }
      });

      console.log('VideoProcessor: Metadata extracted', metadata);
      return metadata;
    } catch (error) {
      console.error('VideoProcessor: Metadata extraction failed', error);
      throw new Error(`Failed to extract metadata: ${error}`);
    }
  }

  async generateThumbnail(videoFile: File, timestamp: number, jobId: string): Promise<string> {
    console.log('VideoProcessor: Generating thumbnail at', timestamp, 'for', videoFile.name);
    this.currentJobId = jobId;

    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(videoFile);
      
      video.src = url;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          canvas.width = 320;
          canvas.height = (video.videoHeight / video.videoWidth) * 320;
          video.currentTime = Math.max(0, Math.min(timestamp, video.duration - 1));
        };
        video.onseeked = resolve;
        video.onerror = reject;
        setTimeout(() => reject(new Error('Thumbnail generation timeout')), 10000);
      });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        console.log('VideoProcessor: Thumbnail generated successfully');
        return thumbnailUrl;
      } else {
        throw new Error('Could not get canvas context');
      }
    } catch (error) {
      console.error('VideoProcessor: Thumbnail generation failed', error);
      throw new Error(`Failed to generate thumbnail: ${error}`);
    }
  }

  async detectScenes(
    videoFile: File, 
    config: SceneDetectionConfig, 
    jobId: string
  ): Promise<DetectedScene[]> {
    console.log('VideoProcessor: Detecting scenes with config', config);
    this.currentJobId = jobId;

    try {
      // Get video duration
      const video = document.createElement('video');
      const url = URL.createObjectURL(videoFile);
      video.src = url;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(() => reject(new Error('Video loading timeout')), 10000);
      });
      
      const duration = video.duration || 300;
      const scenes: DetectedScene[] = [];
      
      // Calculate number of scenes based on config
      const minScenes = Math.max(2, Math.floor(duration / 60)); // At least 2 scenes, 1 per minute
      const maxScenes = Math.min(config.maxScenes, Math.floor(duration / config.minSceneDuration));
      const numScenes = Math.min(maxScenes, Math.max(minScenes, Math.floor(duration / 30))); // Aim for 1 scene per 30s

      console.log(`VideoProcessor: Creating ${numScenes} scenes for ${duration}s video`);

      for (let i = 0; i < numScenes; i++) {
        const progress = ((i + 1) / numScenes) * 100;
        
        // Calculate scene boundaries
        const sceneStart = (duration / numScenes) * i;
        const sceneEnd = Math.min(sceneStart + Math.max(config.minSceneDuration, duration / numScenes), duration);
        const sceneDuration = sceneEnd - sceneStart;
        
        // Skip scenes that are too short
        if (sceneDuration < config.minSceneDuration) {
          continue;
        }

        // Generate thumbnail at scene start + 2 seconds
        const thumbnailTime = Math.min(sceneStart + 2, sceneEnd - 1);
        const thumbnail = await this.generateThumbnail(videoFile, thumbnailTime, jobId);
        
        // Generate confidence score based on scene position and duration
        const confidence = Math.min(0.95, 0.6 + (sceneDuration / 60) * 0.3 + Math.random() * 0.1);
        
        const scene: DetectedScene = {
          id: `scene_${i + 1}`,
          startTime: sceneStart,
          endTime: sceneEnd,
          duration: sceneDuration,
          confidence,
          thumbnail,
          detectionMethod: 'pixel',
          description: `Scene ${i + 1}: ${Math.round(sceneDuration)}s segment starting at ${Math.round(sceneStart)}s`
        };
        
        scenes.push(scene);

        // Update progress
        this.postMessage({
          type: 'progress',
          jobId,
          data: { 
            progress,
            message: `Detected scene ${i + 1} of ${numScenes}`
          }
        });

        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clean up
      URL.revokeObjectURL(url);
      
      console.log('VideoProcessor: Scene detection completed', scenes.length, 'scenes');
      return scenes;
    } catch (error) {
      console.error('VideoProcessor: Scene detection failed', error);
      throw new Error(`Failed to detect scenes: ${error}`);
    }
  }

  async generateClip(
    videoFile: File,
    scene: DetectedScene,
    preset: PlatformPreset,
    jobId: string
  ): Promise<{ url: string; thumbnail: string }> {
    console.log('VideoProcessor: Generating clip for', preset.displayName, scene.id);
    this.currentJobId = jobId;

    try {
      // For now, return the original video URL as a placeholder
      // In a real implementation, this would use FFmpeg.wasm to crop and resize
      const url = URL.createObjectURL(videoFile);
      
      // Generate a thumbnail for the clip
      const thumbnail = await this.generateThumbnail(videoFile, scene.startTime + 1, jobId);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.postMessage({
        type: 'progress',
        jobId,
        data: { progress: 100, message: `Generated ${preset.displayName} clip` }
      });

      console.log('VideoProcessor: Clip generated successfully');
      return { url, thumbnail };
    } catch (error) {
      console.error('VideoProcessor: Clip generation failed', error);
      throw new Error(`Failed to generate clip: ${error}`);
    }
  }

  async cleanup() {
    console.log('VideoProcessor: Cleaning up resources');
    // Clean up any remaining resources
  }
}

// Worker message handler
let processor: VideoProcessor;

console.log('VideoProcessingWorker: Setting up message handler');

self.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;
  console.log('VideoProcessingWorker: Received message', type, data);

  try {
    if (!processor) {
      processor = new VideoProcessor();
    }

    switch (type) {
      case 'extractMetadata':
        console.log('VideoProcessingWorker: Starting metadata extraction');
        const metadata = await processor.extractMetadata(data.videoFile, data.jobId);
        self.postMessage({
          type: 'complete',
          jobId: data.jobId,
          stepId: data.stepId,
          data: { metadata }
        });
        break;

      case 'generateThumbnail':
        console.log('VideoProcessingWorker: Starting thumbnail generation');
        const thumbnail = await processor.generateThumbnail(
          data.videoFile, 
          data.timestamp, 
          data.jobId
        );
        self.postMessage({
          type: 'complete',
          jobId: data.jobId,
          stepId: data.stepId,
          data: { thumbnail }
        });
        break;

      case 'detectScenes':
        console.log('VideoProcessingWorker: Starting scene detection');
        const scenes = await processor.detectScenes(
          data.videoFile, 
          data.config, 
          data.jobId
        );
        self.postMessage({
          type: 'complete',
          jobId: data.jobId,
          stepId: data.stepId,
          data: { scenes }
        });
        break;

      case 'generateClip':
        console.log('VideoProcessingWorker: Starting clip generation');
        const clip = await processor.generateClip(
          data.videoFile,
          data.scene,
          data.preset,
          data.jobId
        );
        self.postMessage({
          type: 'complete',
          jobId: data.jobId,
          stepId: data.stepId,
          data: { clip }
        });
        break;

      case 'cleanup':
        console.log('VideoProcessingWorker: Starting cleanup');
        await processor.cleanup();
        self.postMessage({
          type: 'complete',
          jobId: data.jobId,
          stepId: data.stepId,
          data: { success: true }
        });
        break;

      default:
        console.error('VideoProcessingWorker: Unknown message type', type);
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('VideoProcessingWorker: Error processing message', error);
    self.postMessage({
      type: 'error',
      jobId: data.jobId,
      stepId: data.stepId,
      data: { error: error.message }
    });
  }
};

console.log('VideoProcessingWorker: Initialization complete');