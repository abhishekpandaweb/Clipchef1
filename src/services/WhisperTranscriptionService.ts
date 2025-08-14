// WhisperTranscriptionService.ts - Browser-based transcription with whisper.cpp
import { aiModelManager } from './AIModelManager';

export interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  speakerId?: string;
  language?: string;
  words?: WordTimestamp[];
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SpeakerSegment {
  speakerId: string;
  name?: string;
  segments: TranscriptionSegment[];
  totalDuration: number;
  confidence: number;
  voiceProfile?: VoiceProfile;
}

export interface VoiceProfile {
  pitch: number;
  tone: string;
  gender: 'male' | 'female' | 'unknown';
  accent?: string;
}

export interface TranscriptionOptions {
  modelSize: 'base' | 'small' | 'medium';
  language?: string;
  enableSpeakerDiarization: boolean;
  enableWordTimestamps: boolean;
  customVocabulary?: string[];
  confidenceThreshold: number;
  maxSpeakers?: number;
}

export interface TranscriptionProgress {
  phase: 'loading' | 'processing' | 'diarization' | 'finalizing';
  percentage: number;
  currentTime: number;
  totalTime: number;
  message: string;
  segmentsProcessed?: number;
  totalSegments?: number;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  speakers: SpeakerSegment[];
  language: string;
  languageConfidence: number;
  totalDuration: number;
  wordCount: number;
  averageConfidence: number;
  processingTime: number;
}

export class WhisperTranscriptionService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentModel: string | null = null;
  private pendingOperations = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    progressCallback?: (progress: TranscriptionProgress) => void;
  }>();
  private operationCounter = 0;

  constructor() {
    console.log('WhisperTranscriptionService: Initializing');
  }

  async initialize(modelSize: 'base' | 'small' | 'medium' = 'base'): Promise<void> {
    try {
      console.log('WhisperTranscriptionService: Starting initialization with model:', modelSize);
      
      // Create worker
      this.worker = new Worker(
        new URL('./WhisperWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Initialize whisper model in worker
      await this.sendWorkerMessage('init', { modelSize });
      this.currentModel = modelSize;
      this.isInitialized = true;
      
      console.log('WhisperTranscriptionService: Initialization complete');
    } catch (error) {
      console.error('WhisperTranscriptionService: Initialization failed:', error);
      throw new Error(`Failed to initialize Whisper transcription: ${error}`);
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { id, type, data } = event.data;
    const operation = this.pendingOperations.get(id);

    if (!operation) {
      console.warn('WhisperTranscriptionService: Received message for unknown operation:', id);
      return;
    }

    switch (type) {
      case 'success':
        operation.resolve(data);
        this.pendingOperations.delete(id);
        break;
      case 'error':
        operation.reject(new Error(data.message || 'Transcription failed'));
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
    console.error('WhisperTranscriptionService: Worker error:', error);
    this.pendingOperations.forEach(({ reject }) => {
      reject(new Error('Worker error occurred'));
    });
    this.pendingOperations.clear();
  }

  private async sendWorkerMessage(type: string, data: any, progressCallback?: (progress: TranscriptionProgress) => void): Promise<any> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('Whisper transcription service not initialized');
    }

    const id = `transcription_${++this.operationCounter}`;
    
    return new Promise((resolve, reject) => {
      this.pendingOperations.set(id, { resolve, reject, progressCallback });
      this.worker!.postMessage({ id, type, data });
    });
  }

  async transcribeVideo(
    videoFile: File | Blob,
    options: TranscriptionOptions = this.getDefaultOptions(),
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<TranscriptionResult> {
    try {
      console.log('WhisperTranscriptionService: Starting transcription');
      
      // Extract audio from video
      const audioBuffer = await this.extractAudioFromVideo(videoFile, onProgress);
      
      // Transcribe audio
      const result = await this.sendWorkerMessage('transcribe', {
        audioBuffer,
        options
      }, onProgress);

      // Post-process results
      return this.postProcessTranscription(result, options);
    } catch (error) {
      console.error('WhisperTranscriptionService: Transcription failed:', error);
      throw new Error(`Transcription failed: ${error}`);
    }
  }

  private async extractAudioFromVideo(
    videoFile: File | Blob,
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<ArrayBuffer> {
    onProgress?.({
      phase: 'loading',
      percentage: 10,
      currentTime: 0,
      totalTime: 0,
      message: 'Extracting audio from video...'
    });

    // Create audio context for processing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      // Convert video to audio buffer
      const arrayBuffer = await videoFile.arrayBuffer();
      
      onProgress?.({
        phase: 'loading',
        percentage: 30,
        currentTime: 0,
        totalTime: 0,
        message: 'Processing audio data...'
      });

      // For now, return the raw buffer - in production, you'd use FFmpeg to extract audio
      return arrayBuffer;
    } catch (error) {
      throw new Error(`Failed to extract audio: ${error}`);
    }
  }

  private async postProcessTranscription(
    rawResult: any,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    console.log('WhisperTranscriptionService: Post-processing transcription');
    
    // Apply confidence filtering
    const filteredSegments = rawResult.segments.filter(
      (segment: TranscriptionSegment) => segment.confidence >= options.confidenceThreshold
    );

    // Apply speaker diarization if enabled
    let speakers: SpeakerSegment[] = [];
    if (options.enableSpeakerDiarization) {
      speakers = await this.performSpeakerDiarization(filteredSegments, options.maxSpeakers);
    }

    // Calculate statistics
    const totalDuration = Math.max(...filteredSegments.map(s => s.endTime));
    const wordCount = filteredSegments.reduce((count, segment) => 
      count + segment.text.split(' ').length, 0
    );
    const averageConfidence = filteredSegments.reduce((sum, segment) => 
      sum + segment.confidence, 0) / filteredSegments.length;

    return {
      segments: filteredSegments,
      speakers,
      language: rawResult.language || 'en',
      languageConfidence: rawResult.languageConfidence || 0.9,
      totalDuration,
      wordCount,
      averageConfidence,
      processingTime: rawResult.processingTime || 0
    };
  }

  private async performSpeakerDiarization(
    segments: TranscriptionSegment[],
    maxSpeakers: number = 4
  ): Promise<SpeakerSegment[]> {
    console.log('WhisperTranscriptionService: Performing speaker diarization');
    
    // Simulate speaker diarization - in production, use actual ML models
    const speakers: SpeakerSegment[] = [];
    let currentSpeakerId = 'speaker_1';
    let speakerCount = 1;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Simple heuristic: change speaker every 30 seconds or on long pauses
      const shouldChangeSpeaker = 
        (i > 0 && segment.startTime - segments[i-1].endTime > 2) || // 2+ second pause
        (segment.startTime % 30 < 1 && speakerCount < maxSpeakers); // Every 30 seconds
      
      if (shouldChangeSpeaker && speakerCount < maxSpeakers) {
        speakerCount++;
        currentSpeakerId = `speaker_${speakerCount}`;
      }
      
      segment.speakerId = currentSpeakerId;
      
      // Add to speaker segments
      let speaker = speakers.find(s => s.speakerId === currentSpeakerId);
      if (!speaker) {
        speaker = {
          speakerId: currentSpeakerId,
          name: `Speaker ${speakerCount}`,
          segments: [],
          totalDuration: 0,
          confidence: 0.8,
          voiceProfile: {
            pitch: Math.random() * 100 + 50,
            tone: ['warm', 'professional', 'casual'][Math.floor(Math.random() * 3)],
            gender: Math.random() > 0.5 ? 'male' : 'female'
          }
        };
        speakers.push(speaker);
      }
      
      speaker.segments.push(segment);
      speaker.totalDuration += segment.endTime - segment.startTime;
    }

    return speakers;
  }

  async generateSubtitles(
    transcriptionResult: TranscriptionResult,
    format: 'srt' | 'vtt' | 'ass' = 'srt',
    platform?: string
  ): Promise<string> {
    console.log('WhisperTranscriptionService: Generating subtitles in format:', format);
    
    switch (format) {
      case 'srt':
        return this.generateSRT(transcriptionResult, platform);
      case 'vtt':
        return this.generateVTT(transcriptionResult, platform);
      case 'ass':
        return this.generateASS(transcriptionResult, platform);
      default:
        throw new Error(`Unsupported subtitle format: ${format}`);
    }
  }

  private generateSRT(result: TranscriptionResult, platform?: string): string {
    let srt = '';
    
    result.segments.forEach((segment, index) => {
      const startTime = this.formatSRTTime(segment.startTime);
      const endTime = this.formatSRTTime(segment.endTime);
      
      // Apply platform-specific styling
      let text = segment.text;
      if (platform === 'tiktok') {
        text = text.toUpperCase(); // Bold effect for TikTok
      } else if (platform === 'instagram') {
        text = this.addEmojis(text); // Casual style for Instagram
      }
      
      srt += `${index + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${text}\n\n`;
    });
    
    return srt;
  }

  private generateVTT(result: TranscriptionResult, platform?: string): string {
    let vtt = 'WEBVTT\n\n';
    
    result.segments.forEach((segment) => {
      const startTime = this.formatVTTTime(segment.startTime);
      const endTime = this.formatVTTTime(segment.endTime);
      
      let text = segment.text;
      if (platform === 'linkedin') {
        text = this.formatProfessional(text);
      }
      
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${text}\n\n`;
    });
    
    return vtt;
  }

  private generateASS(result: TranscriptionResult, platform?: string): string {
    const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let events = '';
    result.segments.forEach((segment) => {
      const startTime = this.formatASSTime(segment.startTime);
      const endTime = this.formatASSTime(segment.endTime);
      
      events += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${segment.text}\n`;
    });
    
    return header + events;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`;
  }

  private addEmojis(text: string): string {
    // Simple emoji addition for Instagram casual style
    return text
      .replace(/\b(amazing|awesome|great)\b/gi, '$1 ✨')
      .replace(/\b(love|like)\b/gi, '$1 ❤️')
      .replace(/\b(fire|hot)\b/gi, '$1 🔥');
  }

  private formatProfessional(text: string): string {
    // Professional formatting for LinkedIn
    return text
      .replace(/\bum\b/gi, '')
      .replace(/\buh\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getDefaultOptions(): TranscriptionOptions {
    return {
      modelSize: 'base',
      enableSpeakerDiarization: true,
      enableWordTimestamps: true,
      confidenceThreshold: 0.6,
      maxSpeakers: 4,
      customVocabulary: []
    };
  }

  async detectLanguage(audioBuffer: ArrayBuffer): Promise<{ language: string; confidence: number }> {
    try {
      const result = await this.sendWorkerMessage('detectLanguage', { audioBuffer });
      return result;
    } catch (error) {
      console.warn('Language detection failed, defaulting to English:', error);
      return { language: 'en', confidence: 0.5 };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['base', 'small', 'medium'];
  }

  async switchModel(modelSize: 'base' | 'small' | 'medium'): Promise<void> {
    if (this.currentModel === modelSize) {
      return;
    }

    console.log('WhisperTranscriptionService: Switching to model:', modelSize);
    await this.sendWorkerMessage('switchModel', { modelSize });
    this.currentModel = modelSize;
  }

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
      this.currentModel = null;
      this.pendingOperations.clear();
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }
}

// Singleton instance
export const whisperTranscriptionService = new WhisperTranscriptionService();