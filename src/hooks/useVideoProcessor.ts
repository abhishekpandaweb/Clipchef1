// useVideoProcessor.ts - React hook for video processing
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  VideoProcessingModule, 
  VideoMetadata, 
  ThumbnailOptions, 
  ConversionOptions, 
  ProgressCallback, 
  VideoClip,
  VideoUtils
} from '../services/VideoProcessingModule';

export interface UseVideoProcessorReturn {
  // State
  isReady: boolean;
  isProcessing: boolean;
  currentOperation: string | null;
  progress: number;
  error: string | null;

  // Methods
  extractMetadata: (file: File | Blob, onProgress?: ProgressCallback) => Promise<VideoMetadata>;
  generateThumbnail: (file: File | Blob, timestamp: number, options?: ThumbnailOptions, onProgress?: ProgressCallback) => Promise<Blob>;
  convertFormat: (file: File | Blob, targetFormat: string, options?: ConversionOptions, onProgress?: ProgressCallback) => Promise<Blob>;
  trimVideo: (file: File | Blob, startTime: number, endTime: number, onProgress?: ProgressCallback) => Promise<VideoClip>;
  splitVideo: (file: File | Blob, timestamps: { start: number; end: number; name?: string }[], onProgress?: ProgressCallback) => Promise<VideoClip[]>;
  getVideoDuration: (file: File | Blob) => Promise<number>;
  cleanup: () => Promise<void>;

  // Utilities
  formatDuration: (seconds: number) => string;
  formatFileSize: (bytes: number) => string;
  isSupportedFormat: (format: string) => boolean;
  getPlatformSettings: (platform: string) => ConversionOptions;
}

export const useVideoProcessor = (): UseVideoProcessorReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processorRef = useRef<VideoProcessingModule | null>(null);

  // Initialize processor
  useEffect(() => {
    const initProcessor = async () => {
      try {
        processorRef.current = new VideoProcessingModule();
        
        // Wait for processor to be ready
        const checkReady = () => {
          if (processorRef.current?.isReady()) {
            setIsReady(true);
            setError(null);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        
        checkReady();
      } catch (err) {
        setError(`Failed to initialize video processor: ${err}`);
        setIsReady(false);
      }
    };

    initProcessor();

    // Cleanup on unmount
    return () => {
      if (processorRef.current) {
        processorRef.current.cleanup();
      }
    };
  }, []);

  // Wrapper function to handle common operation logic
  const executeOperation = useCallback(async <T>(
    operationName: string,
    operation: (onProgress?: ProgressCallback) => Promise<T>,
    onProgress?: ProgressCallback
  ): Promise<T> => {
    if (!processorRef.current || !isReady) {
      throw new Error('Video processor not ready');
    }

    setIsProcessing(true);
    setCurrentOperation(operationName);
    setProgress(0);
    setError(null);

    try {
      const combinedProgressCallback: ProgressCallback = (progressData) => {
        setProgress(progressData.percentage);
        onProgress?.(progressData);
      };

      const result = await operation(combinedProgressCallback);
      
      setProgress(100);
      return result;
    } catch (err) {
      const errorMessage = `${operationName} failed: ${err}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
      setCurrentOperation(null);
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 1000);
    }
  }, [isReady]);

  // Extract metadata
  const extractMetadata = useCallback(async (
    file: File | Blob,
    onProgress?: ProgressCallback
  ): Promise<VideoMetadata> => {
    return executeOperation(
      'Extract Metadata',
      (progressCallback) => processorRef.current!.extractMetadata(file, progressCallback),
      onProgress
    );
  }, [executeOperation]);

  // Generate thumbnail
  const generateThumbnail = useCallback(async (
    file: File | Blob,
    timestamp: number,
    options?: ThumbnailOptions,
    onProgress?: ProgressCallback
  ): Promise<Blob> => {
    return executeOperation(
      'Generate Thumbnail',
      (progressCallback) => processorRef.current!.generateThumbnail(file, timestamp, options, progressCallback),
      onProgress
    );
  }, [executeOperation]);

  // Convert format
  const convertFormat = useCallback(async (
    file: File | Blob,
    targetFormat: string,
    options?: ConversionOptions,
    onProgress?: ProgressCallback
  ): Promise<Blob> => {
    return executeOperation(
      'Convert Format',
      (progressCallback) => processorRef.current!.convertFormat(file, targetFormat, options, progressCallback),
      onProgress
    );
  }, [executeOperation]);

  // Trim video
  const trimVideo = useCallback(async (
    file: File | Blob,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback
  ): Promise<VideoClip> => {
    return executeOperation(
      'Trim Video',
      (progressCallback) => processorRef.current!.trimVideo(file, startTime, endTime, progressCallback),
      onProgress
    );
  }, [executeOperation]);

  // Split video
  const splitVideo = useCallback(async (
    file: File | Blob,
    timestamps: { start: number; end: number; name?: string }[],
    onProgress?: ProgressCallback
  ): Promise<VideoClip[]> => {
    return executeOperation(
      'Split Video',
      (progressCallback) => processorRef.current!.splitVideo(file, timestamps, progressCallback),
      onProgress
    );
  }, [executeOperation]);

  // Get video duration
  const getVideoDuration = useCallback(async (file: File | Blob): Promise<number> => {
    return executeOperation(
      'Get Duration',
      () => processorRef.current!.getVideoDuration(file)
    );
  }, [executeOperation]);

  // Cleanup
  const cleanup = useCallback(async (): Promise<void> => {
    if (processorRef.current) {
      await processorRef.current.cleanup();
      setIsReady(false);
      setIsProcessing(false);
      setCurrentOperation(null);
      setProgress(0);
      setError(null);
    }
  }, []);

  return {
    // State
    isReady,
    isProcessing,
    currentOperation,
    progress,
    error,

    // Methods
    extractMetadata,
    generateThumbnail,
    convertFormat,
    trimVideo,
    splitVideo,
    getVideoDuration,
    cleanup,

    // Utilities
    formatDuration: VideoUtils.formatDuration,
    formatFileSize: VideoUtils.formatFileSize,
    isSupportedFormat: VideoProcessingModule.isSupportedFormat,
    getPlatformSettings: VideoProcessingModule.getPlatformSettings
  };
};