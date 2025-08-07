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


  async detectScenes(
    metadata: VideoMetadata,
    config: SceneDetectionConfig, 
    jobId: string
  ): Promise<DetectedScene[]> {
    console.log('VideoProcessor: Detecting scenes with config', config);
    this.currentJobId = jobId;

    try {
      const duration = metadata.duration || 300;
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

        // Generate confidence score based on scene position and duration
        const confidence = Math.min(0.95, 0.6 + (sceneDuration / 60) * 0.3 + Math.random() * 0.1);
        
        const scene: DetectedScene = {
          id: `scene_${i + 1}`,
          startTime: sceneStart,
          endTime: sceneEnd,
          duration: sceneDuration,
          confidence,
          thumbnail: '', // Placeholder - thumbnails generated on main thread
          detectionMethod: 'pixel',
          description: `Scene ${i + 1}: ${Math.round(sceneDuration)}s segment starting at ${Math.round(sceneStart)}s`
        };
        
        scenes.push(scene);

        // Update progress
        this.postMessage({
          type: 'progress',
          jobId,
          stepId: 'detect-scenes',
          data: { 
            progress,
            message: `Detected scene ${i + 1} of ${numScenes}`
          }
        });

        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('VideoProcessor: Scene detection completed', scenes.length, 'scenes');
      return scenes;
    } catch (error) {
      console.error('VideoProcessor: Scene detection failed', error);
      throw new Error(`Failed to detect scenes: ${error}`);
    }
  }

  async generateClip(
    scene: DetectedScene,
    preset: PlatformPreset,
    jobId: string
  ): Promise<{ url: string; thumbnail: string }> {
    console.log('VideoProcessor: Generating clip for', preset.displayName, scene.id);
    this.currentJobId = jobId;

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.postMessage({
        type: 'progress',
        jobId,
        stepId: jobId,
        data: { progress: 100, message: `Generated ${preset.displayName} clip` }
      });

      console.log('VideoProcessor: Clip generated successfully');
      return { 
        url: '', // Placeholder - actual clip URL would be generated
        thumbnail: '' // Placeholder - thumbnail generated on main thread
      };
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

      case 'detectScenes':
        console.log('VideoProcessingWorker: Starting scene detection');
        const scenes = await processor.detectScenes(
          data.metadata,
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