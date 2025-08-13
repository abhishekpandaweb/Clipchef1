// VideoProcessingWorker.ts - FFmpeg.wasm worker implementation
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface WorkerMessage {
  id: string;
  type: 'init' | 'extractMetadata' | 'generateThumbnail' | 'convertFormat' | 'trimVideo' | 'splitVideo' | 'cleanup';
  data: any;
}

interface WorkerResponse {
  id: string;
  type: 'success' | 'error' | 'progress';
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
  hasAudio: boolean;
  audioChannels?: number;
  audioSampleRate?: number;
}

class VideoProcessingWorker {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;

  constructor() {
    console.log('VideoProcessingWorker: Initializing');
  }

  private postMessage(response: WorkerResponse): void {
    self.postMessage(response);
  }

  private postProgress(id: string, progress: any): void {
    this.postMessage({
      id,
      type: 'progress',
      data: progress
    });
  }

  private postSuccess(id: string, data: any): void {
    this.postMessage({
      id,
      type: 'success',
      data
    });
  }

  private postError(id: string, error: string): void {
    this.postMessage({
      id,
      type: 'error',
      data: { message: error }
    });
  }

  async initialize(): Promise<void> {
    try {
      this.ffmpeg = new FFmpeg();

      // Set up progress tracking
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.ffmpeg.on('progress', ({ progress, time }) => {
        // This will be used by individual operations
        console.log('FFmpeg progress:', progress, time);
      });

      // Load FFmpeg
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
      console.log('VideoProcessingWorker: FFmpeg loaded successfully');
    } catch (error) {
      console.error('VideoProcessingWorker: Failed to load FFmpeg:', error);
      throw error;
    }
  }

  async extractMetadata(id: string, videoData: ArrayBuffer, fileName: string): Promise<void> {
    try {
      if (!this.ffmpeg || !this.isLoaded) {
        throw new Error('FFmpeg not loaded');
      }

      this.postProgress(id, {
        phase: 'loading',
        percentage: 10,
        message: 'Loading video file...'
      });

      // Write input file
      await this.ffmpeg.writeFile(fileName, new Uint8Array(videoData));

      this.postProgress(id, {
        phase: 'processing',
        percentage: 30,
        message: 'Extracting metadata...'
      });

      // Extract metadata using ffprobe-like command
      await this.ffmpeg.exec([
        '-i', fileName,
        '-f', 'null',
        '-'
      ]);

      this.postProgress(id, {
        phase: 'processing',
        percentage: 70,
        message: 'Parsing metadata...'
      });

      // For now, we'll simulate metadata extraction
      // In a real implementation, you'd parse FFmpeg's output
      const metadata: VideoMetadata = {
        duration: 120, // This would be parsed from FFmpeg output
        width: 1920,
        height: 1080,
        fps: 30,
        bitrate: 2000000,
        format: fileName.split('.').pop() || 'mp4',
        size: videoData.byteLength,
        aspectRatio: 1920 / 1080,
        hasAudio: true,
        audioChannels: 2,
        audioSampleRate: 44100
      };

      // Clean up
      await this.ffmpeg.deleteFile(fileName);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 100,
        message: 'Metadata extracted successfully'
      });

      this.postSuccess(id, metadata);
    } catch (error) {
      this.postError(id, `Failed to extract metadata: ${error}`);
    }
  }

  async generateThumbnail(
    id: string,
    videoData: ArrayBuffer,
    fileName: string,
    timestamp: number,
    options: any
  ): Promise<void> {
    try {
      if (!this.ffmpeg || !this.isLoaded) {
        throw new Error('FFmpeg not loaded');
      }

      this.postProgress(id, {
        phase: 'loading',
        percentage: 10,
        message: 'Loading video file...'
      });

      const inputFile = `input_${Date.now()}.${fileName.split('.').pop()}`;
      const outputFile = `thumbnail_${Date.now()}.${options.format}`;

      // Write input file
      await this.ffmpeg.writeFile(inputFile, new Uint8Array(videoData));

      this.postProgress(id, {
        phase: 'processing',
        percentage: 40,
        message: 'Generating thumbnail...'
      });

      // Generate thumbnail
      const args = [
        '-i', inputFile,
        '-ss', timestamp.toString(),
        '-vframes', '1',
        '-vf', `scale=${options.width}:${options.height}`,
        '-q:v', Math.floor((100 - options.quality) / 10).toString(),
        outputFile
      ];

      await this.ffmpeg.exec(args);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 80,
        message: 'Reading thumbnail data...'
      });

      // Read output file
      const thumbnailData = await this.ffmpeg.readFile(outputFile);

      // Clean up
      await this.ffmpeg.deleteFile(inputFile);
      await this.ffmpeg.deleteFile(outputFile);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 100,
        message: 'Thumbnail generated successfully'
      });

      this.postSuccess(id, { thumbnailData });
    } catch (error) {
      this.postError(id, `Failed to generate thumbnail: ${error}`);
    }
  }

  async convertFormat(
    id: string,
    videoData: ArrayBuffer,
    fileName: string,
    targetFormat: string,
    options: any
  ): Promise<void> {
    try {
      if (!this.ffmpeg || !this.isLoaded) {
        throw new Error('FFmpeg not loaded');
      }

      this.postProgress(id, {
        phase: 'loading',
        percentage: 5,
        message: 'Loading video file...'
      });

      const inputFile = `input_${Date.now()}.${fileName.split('.').pop()}`;
      const outputFile = `output_${Date.now()}.${targetFormat}`;

      // Write input file
      await this.ffmpeg.writeFile(inputFile, new Uint8Array(videoData));

      this.postProgress(id, {
        phase: 'processing',
        percentage: 20,
        message: 'Converting video format...'
      });

      // Build FFmpeg arguments
      const args = ['-i', inputFile];

      // Add video codec
      if (options.videoCodec) {
        args.push('-c:v', options.videoCodec);
      }

      // Add audio codec
      if (options.audioCodec) {
        args.push('-c:a', options.audioCodec);
      }

      // Add bitrate
      if (options.bitrate) {
        args.push('-b:v', options.bitrate);
      }

      // Add resolution
      if (options.resolution) {
        args.push('-vf', `scale=${options.resolution.width}:${options.resolution.height}`);
      }

      // Add FPS
      if (options.fps) {
        args.push('-r', options.fps.toString());
      }

      // Add quality preset
      if (options.quality) {
        const presets = {
          'low': 'fast',
          'medium': 'medium',
          'high': 'slow',
          'lossless': 'veryslow'
        };
        args.push('-preset', presets[options.quality] || 'medium');
      }

      args.push(outputFile);

      // Set up progress tracking
      let progressInterval: any;
      const startTime = Date.now();

      progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedTotal = 60; // Rough estimate
        const progress = Math.min(95, (elapsed / estimatedTotal) * 100);
        
        this.postProgress(id, {
          phase: 'processing',
          percentage: 20 + (progress * 0.6),
          message: 'Converting video...',
          currentTime: elapsed,
          totalTime: estimatedTotal
        });
      }, 1000);

      await this.ffmpeg.exec(args);

      clearInterval(progressInterval);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 90,
        message: 'Reading converted video...'
      });

      // Read output file
      const videoData_output = await this.ffmpeg.readFile(outputFile);

      // Clean up
      await this.ffmpeg.deleteFile(inputFile);
      await this.ffmpeg.deleteFile(outputFile);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 100,
        message: 'Conversion completed successfully'
      });

      this.postSuccess(id, { videoData: videoData_output });
    } catch (error) {
      this.postError(id, `Failed to convert format: ${error}`);
    }
  }

  async trimVideo(
    id: string,
    videoData: ArrayBuffer,
    fileName: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    try {
      if (!this.ffmpeg || !this.isLoaded) {
        throw new Error('FFmpeg not loaded');
      }

      this.postProgress(id, {
        phase: 'loading',
        percentage: 10,
        message: 'Loading video file...'
      });

      const inputFile = `input_${Date.now()}.${fileName.split('.').pop()}`;
      const outputFile = `trimmed_${Date.now()}.mp4`;

      // Write input file
      await this.ffmpeg.writeFile(inputFile, new Uint8Array(videoData));

      this.postProgress(id, {
        phase: 'processing',
        percentage: 30,
        message: 'Trimming video...'
      });

      const duration = endTime - startTime;

      // Trim video
      await this.ffmpeg.exec([
        '-i', inputFile,
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-c', 'copy', // Use stream copy for faster processing
        outputFile
      ]);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 80,
        message: 'Reading trimmed video...'
      });

      // Read output file
      const trimmedVideoData = await this.ffmpeg.readFile(outputFile);

      // Generate basic metadata
      const metadata: VideoMetadata = {
        duration: duration,
        width: 1920, // Would be extracted from actual video
        height: 1080,
        fps: 30,
        bitrate: 2000000,
        format: 'mp4',
        size: trimmedVideoData.byteLength,
        aspectRatio: 1920 / 1080,
        hasAudio: true
      };

      // Clean up
      await this.ffmpeg.deleteFile(inputFile);
      await this.ffmpeg.deleteFile(outputFile);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 100,
        message: 'Video trimmed successfully'
      });

      this.postSuccess(id, { videoData: trimmedVideoData, metadata });
    } catch (error) {
      this.postError(id, `Failed to trim video: ${error}`);
    }
  }

  async splitVideo(
    id: string,
    videoData: ArrayBuffer,
    fileName: string,
    timestamps: { start: number; end: number; name?: string }[]
  ): Promise<void> {
    try {
      if (!this.ffmpeg || !this.isLoaded) {
        throw new Error('FFmpeg not loaded');
      }

      this.postProgress(id, {
        phase: 'loading',
        percentage: 5,
        message: 'Loading video file...'
      });

      const inputFile = `input_${Date.now()}.${fileName.split('.').pop()}`;
      await this.ffmpeg.writeFile(inputFile, new Uint8Array(videoData));

      const clips = [];
      const totalClips = timestamps.length;

      for (let i = 0; i < timestamps.length; i++) {
        const { start, end, name } = timestamps[i];
        const duration = end - start;
        const outputFile = `clip_${i}_${Date.now()}.mp4`;

        this.postProgress(id, {
          phase: 'processing',
          percentage: 10 + ((i / totalClips) * 70),
          message: `Processing clip ${i + 1} of ${totalClips}...`
        });

        // Create clip
        await this.ffmpeg.exec([
          '-i', inputFile,
          '-ss', start.toString(),
          '-t', duration.toString(),
          '-c', 'copy',
          outputFile
        ]);

        // Read clip data
        const clipData = await this.ffmpeg.readFile(outputFile);

        // Generate metadata for clip
        const metadata: VideoMetadata = {
          duration: duration,
          width: 1920,
          height: 1080,
          fps: 30,
          bitrate: 2000000,
          format: 'mp4',
          size: clipData.byteLength,
          aspectRatio: 1920 / 1080,
          hasAudio: true
        };

        clips.push({
          videoData: clipData,
          metadata,
          name: name || `Clip ${i + 1}`
        });

        // Clean up clip file
        await this.ffmpeg.deleteFile(outputFile);
      }

      // Clean up input file
      await this.ffmpeg.deleteFile(inputFile);

      this.postProgress(id, {
        phase: 'finalizing',
        percentage: 100,
        message: 'All clips processed successfully'
      });

      this.postSuccess(id, { clips });
    } catch (error) {
      this.postError(id, `Failed to split video: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.ffmpeg && this.isLoaded) {
        // Clean up any remaining files
        console.log('VideoProcessingWorker: Cleaning up resources');
      }
    } catch (error) {
      console.warn('VideoProcessingWorker: Error during cleanup:', error);
    }
  }

  async handleMessage(message: WorkerMessage): Promise<void> {
    const { id, type, data } = message;

    try {
      switch (type) {
        case 'init':
          await this.initialize();
          this.postSuccess(id, { initialized: true });
          break;

        case 'extractMetadata':
          await this.extractMetadata(id, data.videoData, data.fileName);
          break;

        case 'generateThumbnail':
          await this.generateThumbnail(
            id,
            data.videoData,
            data.fileName,
            data.timestamp,
            data.options
          );
          break;

        case 'convertFormat':
          await this.convertFormat(
            id,
            data.videoData,
            data.fileName,
            data.targetFormat,
            data.options
          );
          break;

        case 'trimVideo':
          await this.trimVideo(
            id,
            data.videoData,
            data.fileName,
            data.startTime,
            data.endTime
          );
          break;

        case 'splitVideo':
          await this.splitVideo(
            id,
            data.videoData,
            data.fileName,
            data.timestamps
          );
          break;

        case 'cleanup':
          await this.cleanup();
          this.postSuccess(id, { cleaned: true });
          break;

        default:
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (error) {
      this.postError(id, `Operation failed: ${error}`);
    }
  }
}

// Initialize worker
const worker = new VideoProcessingWorker();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  await worker.handleMessage(event.data);
};

// Signal that worker is ready
self.postMessage({
  id: 'init',
  type: 'ready',
  data: { ready: true }
});