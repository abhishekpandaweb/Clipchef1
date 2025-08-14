import { useState, useCallback, useRef } from 'react';
import { 
  WhisperTranscriptionService,
  TranscriptionResult,
  TranscriptionOptions,
  TranscriptionProgress,
  SpeakerSegment,
  TranscriptionSegment
} from '../services/WhisperTranscriptionService';
import { useToast } from '../contexts/ToastContext';

export interface UseWhisperTranscriptionReturn {
  // State
  isReady: boolean;
  isTranscribing: boolean;
  currentModel: string | null;
  progress: TranscriptionProgress | null;
  error: string | null;
  transcriptionResult: TranscriptionResult | null;
  
  // Methods
  initialize: (modelSize?: 'base' | 'small' | 'medium') => Promise<void>;
  transcribeVideo: (videoFile: File | Blob, options?: TranscriptionOptions) => Promise<TranscriptionResult>;
  generateSubtitles: (format?: 'srt' | 'vtt' | 'ass', platform?: string) => Promise<string>;
  detectLanguage: (audioBuffer: ArrayBuffer) => Promise<{ language: string; confidence: number }>;
  switchModel: (modelSize: 'base' | 'small' | 'medium') => Promise<void>;
  downloadSubtitles: (format: 'srt' | 'vtt' | 'ass', filename?: string) => void;
  clearResults: () => void;
  cleanup: () => Promise<void>;
  
  // Utilities
  getAccuracyStats: () => { averageConfidence: number; highConfidenceSegments: number; totalSegments: number } | null;
  getSpeakerStats: () => { totalSpeakers: number; longestSpeaker: SpeakerSegment | null } | null;
  exportTranscriptionData: () => any;
}

export const useWhisperTranscription = (): UseWhisperTranscriptionReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  
  const serviceRef = useRef<WhisperTranscriptionService | null>(null);
  const { addToast } = useToast();

  const initialize = useCallback(async (modelSize: 'base' | 'small' | 'medium' = 'base') => {
    try {
      setError(null);
      console.log('useWhisperTranscription: Initializing with model:', modelSize);
      
      if (!serviceRef.current) {
        serviceRef.current = new WhisperTranscriptionService();
      }
      
      await serviceRef.current.initialize(modelSize);
      setIsReady(true);
      setCurrentModel(modelSize);
      
      addToast({
        type: 'success',
        title: 'Whisper Initialized',
        message: `${modelSize} model loaded successfully`
      });
    } catch (err) {
      const errorMessage = `Failed to initialize Whisper: ${err}`;
      setError(errorMessage);
      setIsReady(false);
      
      addToast({
        type: 'error',
        title: 'Initialization Failed',
        message: errorMessage
      });
      
      throw err;
    }
  }, [addToast]);

  const transcribeVideo = useCallback(async (
    videoFile: File | Blob,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> => {
    if (!serviceRef.current || !isReady) {
      throw new Error('Whisper transcription service not ready');
    }

    try {
      setIsTranscribing(true);
      setError(null);
      setProgress(null);
      
      console.log('useWhisperTranscription: Starting transcription');
      
      const result = await serviceRef.current.transcribeVideo(
        videoFile,
        options,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );
      
      setTranscriptionResult(result);
      
      addToast({
        type: 'success',
        title: 'Transcription Complete',
        message: `Processed ${result.segments.length} segments with ${Math.round(result.averageConfidence * 100)}% average confidence`
      });
      
      return result;
    } catch (err) {
      const errorMessage = `Transcription failed: ${err}`;
      setError(errorMessage);
      
      addToast({
        type: 'error',
        title: 'Transcription Failed',
        message: errorMessage
      });
      
      throw err;
    } finally {
      setIsTranscribing(false);
      setProgress(null);
    }
  }, [isReady, addToast]);

  const generateSubtitles = useCallback(async (
    format: 'srt' | 'vtt' | 'ass' = 'srt',
    platform?: string
  ): Promise<string> => {
    if (!serviceRef.current || !transcriptionResult) {
      throw new Error('No transcription result available');
    }

    try {
      console.log('useWhisperTranscription: Generating subtitles in format:', format);
      
      const subtitles = await serviceRef.current.generateSubtitles(
        transcriptionResult,
        format,
        platform
      );
      
      addToast({
        type: 'success',
        title: 'Subtitles Generated',
        message: `${format.toUpperCase()} subtitles created successfully`
      });
      
      return subtitles;
    } catch (err) {
      const errorMessage = `Failed to generate subtitles: ${err}`;
      setError(errorMessage);
      
      addToast({
        type: 'error',
        title: 'Subtitle Generation Failed',
        message: errorMessage
      });
      
      throw err;
    }
  }, [transcriptionResult, addToast]);

  const detectLanguage = useCallback(async (audioBuffer: ArrayBuffer) => {
    if (!serviceRef.current || !isReady) {
      throw new Error('Whisper transcription service not ready');
    }

    try {
      const result = await serviceRef.current.detectLanguage(audioBuffer);
      
      addToast({
        type: 'info',
        title: 'Language Detected',
        message: `Detected ${result.language} with ${Math.round(result.confidence * 100)}% confidence`
      });
      
      return result;
    } catch (err) {
      const errorMessage = `Language detection failed: ${err}`;
      setError(errorMessage);
      
      addToast({
        type: 'error',
        title: 'Language Detection Failed',
        message: errorMessage
      });
      
      throw err;
    }
  }, [isReady, addToast]);

  const switchModel = useCallback(async (modelSize: 'base' | 'small' | 'medium') => {
    if (!serviceRef.current || !isReady) {
      throw new Error('Whisper transcription service not ready');
    }

    try {
      console.log('useWhisperTranscription: Switching to model:', modelSize);
      
      await serviceRef.current.switchModel(modelSize);
      setCurrentModel(modelSize);
      
      addToast({
        type: 'success',
        title: 'Model Switched',
        message: `Now using ${modelSize} model`
      });
    } catch (err) {
      const errorMessage = `Failed to switch model: ${err}`;
      setError(errorMessage);
      
      addToast({
        type: 'error',
        title: 'Model Switch Failed',
        message: errorMessage
      });
      
      throw err;
    }
  }, [isReady, addToast]);

  const downloadSubtitles = useCallback((
    format: 'srt' | 'vtt' | 'ass',
    filename?: string
  ) => {
    if (!transcriptionResult) {
      addToast({
        type: 'error',
        title: 'No Transcription',
        message: 'Please transcribe a video first'
      });
      return;
    }

    generateSubtitles(format).then(subtitles => {
      const blob = new Blob([subtitles], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `subtitles.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToast({
        type: 'success',
        title: 'Download Started',
        message: `Downloading ${format.toUpperCase()} subtitles`
      });
    }).catch(err => {
      console.error('Failed to download subtitles:', err);
    });
  }, [transcriptionResult, generateSubtitles, addToast]);

  const clearResults = useCallback(() => {
    setTranscriptionResult(null);
    setProgress(null);
    setError(null);
  }, []);

  const cleanup = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.cleanup();
      serviceRef.current = null;
    }
    
    setIsReady(false);
    setIsTranscribing(false);
    setCurrentModel(null);
    setProgress(null);
    setError(null);
    setTranscriptionResult(null);
  }, []);

  const getAccuracyStats = useCallback(() => {
    if (!transcriptionResult) return null;
    
    const { segments, averageConfidence } = transcriptionResult;
    const highConfidenceSegments = segments.filter(s => s.confidence > 0.8).length;
    
    return {
      averageConfidence,
      highConfidenceSegments,
      totalSegments: segments.length
    };
  }, [transcriptionResult]);

  const getSpeakerStats = useCallback(() => {
    if (!transcriptionResult) return null;
    
    const { speakers } = transcriptionResult;
    const longestSpeaker = speakers.reduce((longest, current) => 
      current.totalDuration > longest.totalDuration ? current : longest
    , speakers[0]);
    
    return {
      totalSpeakers: speakers.length,
      longestSpeaker
    };
  }, [transcriptionResult]);

  const exportTranscriptionData = useCallback(() => {
    if (!transcriptionResult) return null;
    
    return {
      ...transcriptionResult,
      exportedAt: new Date().toISOString(),
      modelUsed: currentModel,
      accuracyStats: getAccuracyStats(),
      speakerStats: getSpeakerStats()
    };
  }, [transcriptionResult, currentModel, getAccuracyStats, getSpeakerStats]);

  return {
    // State
    isReady,
    isTranscribing,
    currentModel,
    progress,
    error,
    transcriptionResult,
    
    // Methods
    initialize,
    transcribeVideo,
    generateSubtitles,
    detectLanguage,
    switchModel,
    downloadSubtitles,
    clearResults,
    cleanup,
    
    // Utilities
    getAccuracyStats,
    getSpeakerStats,
    exportTranscriptionData
  };
};