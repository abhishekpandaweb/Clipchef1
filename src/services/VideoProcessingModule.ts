// VideoProcessingModule.ts - Robust video processing with ffmpeg.wasm
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Type definitions
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
  size: number;
  aspectRatio: number;
  hasAudio: boolean;
  audioChannels?: number;
  audioSampleRate?: number;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-100
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ConversionOptions {
  quality?: 'low' | 'medium' | 'high' | 'lossless';
  bitrate?: string; // e.g., '1000k', '2M'
  fps?: number;
  resolution?: { width: number; height: number };
  audioCodec?: string;
  videoCodec?: string;
}

export interface ProgressCallback {
  (progress: {
    phase: 'loading' | 'processing' | 'finalizing';
    percentage: number;
    timeRemaining?: number;
    currentTime?: number;
    totalTime?: number;
    message?: string;
  }): void;
}

export interface VideoClip {
  blob: Blob;
  metadata: VideoMetadata;
  startTime: number;
  endTime: number;
}

// Worker message types
export interface WorkerMessage {
  id: string;
  type: 'init' | 'extractMetadata' | 'generateThumbnail' | 'convertFormat' | 'trimVideo' | 'splitVideo' | 'cleanup';
  data: any;
}

export interface WorkerResponse {
  id: string;
  type: 'success' | 'error' | 'progress';
  data: any;
}

export class VideoProcessingModule {
  private worker: Worker | null = null;
  private isInitialized = false;
  private pendingOperations = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    progressCallback?: ProgressCallback;
  }>();
  private operationCounter = 0;

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker(): Promise<void> {
    try {
      // Create worker with the VideoProcessingWorker
      this.worker = new Worker(
        new URL('./VideoProcessingWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Initialize FFmpeg in worker
      await this.sendWorkerMessage('init', {});
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize VideoProcessingModule:', error);
      throw new Error('Failed to initialize video processing');
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, type, data } = event.data;
    const operation = this.pendingOperations.get(id);

    if (!operation) {
      console.warn('Received message for unknown operation:', id);
      return;
    }

    switch (type) {
      case 'success':
        operation.resolve(data);
        this.pendingOperations.delete(id);
        break;
      case 'error':
        operation.reject(new Error(data.message || 'Unknown error'));
        this.pendingOperations.delete(id);
        break;
      case 'progress':
        if (operation.progressCallback) {
          operation.progressCallback(data);
        }
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    // Reject all pending operations
    this.pendingOperations.forEach(({ reject }) => {
      reject(new Error('Worker error occurred'));
    });
    this.pendingOperations.clear();
  }

  private async sendWorkerMessage(type: string, data: any, progressCallback?: ProgressCallback): Promise<any> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('VideoProcessingModule not initialized');
    }

    const id = `op_${++this.operationCounter}`;
    
    return new Promise((resolve, reject) => {
      this.pendingOperations.set(id, { resolve, reject, progressCallback });
      
      const message: WorkerMessage = { id, type, data };
      this.worker!.postMessage(message);
    });
  }

  /**
   * Extract metadata from a video file
   */
  async extractMetadata(
    videoFile: File | Blob,
    progressCallback?: ProgressCallback
  ): Promise<VideoMetadata> {
    try {
      const arrayBuffer = await videoFile.arrayBuffer();
      return await this.sendWorkerMessage('extractMetadata', {
        videoData: arrayBuffer,
        fileName: videoFile instanceof File ? videoFile.name : 'video.mp4'
      }, progressCallback);
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${error}`);
    }
  }

  /**
   * Generate a thumbnail from a video at a specific timestamp
   */
  async generateThumbnail(
    videoFile: File | Blob,
    timestamp: number,
    options: ThumbnailOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<Blob> {
    try {
      const arrayBuffer = await videoFile.arrayBuffer();
      const result = await this.sendWorkerMessage('generateThumbnail', {
        videoData: arrayBuffer,
        fileName: videoFile instanceof File ? videoFile.name : 'video.mp4',
        timestamp,
        options: {
          width: options.width || 320,
          height: options.height || 180,
          quality: options.quality || 80,
          format: options.format || 'jpeg'
        }
      }, progressCallback);

      return new Blob([result.thumbnailData], { type: `image/${options.format || 'jpeg'}` });
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error}`);
    }
  }

  /**
   * Convert video to a different format
   */
  async convertFormat(
    videoFile: File | Blob,
    targetFormat: string,
    options: ConversionOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<Blob> {
    try {
      const arrayBuffer = await videoFile.arrayBuffer();
      const result = await this.sendWorkerMessage('convertFormat', {
        videoData: arrayBuffer,
        fileName: videoFile instanceof File ? videoFile.name : 'video.mp4',
        targetFormat,
        options
      }, progressCallback);

      return new Blob([result.videoData], { type: `video/${targetFormat}` });
    } catch (error) {
      throw new Error(`Failed to convert format: ${error}`);
    }
  }

  /**
   * Trim video to a specific time range
   */
  async trimVideo(
    videoFile: File | Blob,
    startTime: number,
    endTime: number,
    progressCallback?: ProgressCallback
  ): Promise<VideoClip> {
    try {
      if (startTime < 0 || endTime <= startTime) {
        throw new Error('Invalid time range');
      }

      const arrayBuffer = await videoFile.arrayBuffer();
      const result = await this.sendWorkerMessage('trimVideo', {
        videoData: arrayBuffer,
        fileName: videoFile instanceof File ? videoFile.name : 'video.mp4',
        startTime,
        endTime
      }, progressCallback);

      return {
        blob: new Blob([result.videoData], { type: 'video/mp4' }),
        metadata: result.metadata,
        startTime,
        endTime
      };
    } catch (error) {
      throw new Error(`Failed to trim video: ${error}`);
    }
  }

  /**
   * Split video into multiple clips at specified timestamps
   */
  async splitVideo(
    videoFile: File | Blob,
    timestamps: { start: number; end: number; name?: string }[],
    progressCallback?: ProgressCallback
  ): Promise<VideoClip[]> {
    try {
      if (!timestamps.length) {
        throw new Error('No timestamps provided');
      }

      // Validate timestamps
      for (const { start, end } of timestamps) {
        if (start < 0 || end <= start) {
          throw new Error(`Invalid timestamp range: ${start}-${end}`);
        }
      }

      const arrayBuffer = await videoFile.arrayBuffer();
      const result = await this.sendWorkerMessage('splitVideo', {
        videoData: arrayBuffer,
        fileName: videoFile instanceof File ? videoFile.name : 'video.mp4',
        timestamps
      }, progressCallback);

      return result.clips.map((clip: any, index: number) => ({
        blob: new Blob([clip.videoData], { type: 'video/mp4' }),
        metadata: clip.metadata,
        startTime: timestamps[index].start,
        endTime: timestamps[index].end
      }));
    } catch (error) {
      throw new Error(`Failed to split video: ${error}`);
    }
  }

  /**
   * Get video duration quickly (lightweight metadata extraction)
   */
  async getVideoDuration(videoFile: File | Blob): Promise<number> {
    try {
      const metadata = await this.extractMetadata(videoFile);
      return metadata.duration;
    } catch (error) {
      throw new Error(`Failed to get video duration: ${error}`);
    }
  }

  /**
   * Check if a video format is supported
   */
  static isSupportedFormat(format: string): boolean {
    const supportedFormats = [
      'mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', '3gp', 'ogv'
    ];
    return supportedFormats.includes(format.toLowerCase());
  }

  /**
   * Get optimal settings for a target platform
   */
  static getPlatformSettings(platform: string): ConversionOptions {
    const settings: Record<string, ConversionOptions> = {
      'tiktok': {
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        bitrate: '2M',
        quality: 'high'
      },
      'instagram-reels': {
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        bitrate: '2M',
        quality: 'high'
      },
      'instagram-post': {
        resolution: { width: 1080, height: 1080 },
        fps: 30,
        bitrate: '1.5M',
        quality: 'high'
      },
      'youtube-shorts': {
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        bitrate: '2.5M',
        quality: 'high'
      },
      'twitter': {
        resolution: { width: 1280, height: 720 },
        fps: 30,
        bitrate: '1M',
        quality: 'medium'
      },
      'linkedin': {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        bitrate: '2M',
        quality: 'high'
      }
    };

    return settings[platform] || {
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      bitrate: '2M',
      quality: 'medium'
    };
  }

  /**
   * Cleanup resources and terminate worker
   */
  async cleanup(): Promise<void> {
    try {
      if (this.worker && this.isInitialized) {
        await this.sendWorkerMessage('cleanup', {});
        this.worker.terminate();
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    } finally {
      this.worker = null;
      this.isInitialized = false;
      this.pendingOperations.clear();
    }
  }

  /**
   * Check if the module is ready for operations
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }
}

// Singleton instance for global use
export const videoProcessor = new VideoProcessingModule();

// Utility functions
export const VideoUtils = {
  /**
   * Format duration in seconds to HH:MM:SS
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Format file size in bytes to human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Calculate aspect ratio from width and height
   */
  calculateAspectRatio(width: number, height: number): number {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return width / height;
  },

  /**
   * Get aspect ratio string (e.g., "16:9", "4:3")
   */
  getAspectRatioString(width: number, height: number): string {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }
};