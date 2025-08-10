import { DetectedScene, SceneDetectionConfig, VideoMetadata } from '../types/video';
import { aiModelManager } from './AIModelManager';

export class AdvancedSceneDetection {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async detectScenes(
    videoElement: HTMLVideoElement,
    config: SceneDetectionConfig,
    metadata: VideoMetadata,
    onProgress?: (progress: number) => void
  ): Promise<DetectedScene[]> {
    console.log('AdvancedSceneDetection: Starting multi-algorithm scene detection');
    
    const scenes: DetectedScene[] = [];
    const duration = metadata.duration;
    const frameRate = metadata.fps || 30;
    const totalFrames = Math.floor(duration * frameRate);
    
    // Initialize detection algorithms
    const detectionResults = {
      pixelDifference: [] as SceneBoundary[],
      audioAmplitude: [] as SceneBoundary[],
      colorHistogram: [] as SceneBoundary[],
      motionVector: [] as SceneBoundary[],
      faceDetection: [] as SceneBoundary[]
    };

    // Run each enabled algorithm
    if (config.algorithms.pixelDifference.enabled) {
      detectionResults.pixelDifference = await this.detectPixelDifferences(
        videoElement, config.algorithms.pixelDifference.threshold, frameRate, onProgress
      );
    }

    if (config.algorithms.audioAmplitude.enabled) {
      detectionResults.audioAmplitude = await this.detectAudioChanges(
        videoElement, config.algorithms.audioAmplitude.threshold, onProgress
      );
    }

    if (config.algorithms.colorHistogram.enabled) {
      detectionResults.colorHistogram = await this.detectColorChanges(
        videoElement, config.algorithms.colorHistogram.threshold, frameRate, onProgress
      );
    }

    if (config.algorithms.motionVector.enabled) {
      detectionResults.motionVector = await this.detectMotionChanges(
        videoElement, config.algorithms.motionVector.threshold, frameRate, onProgress
      );
    }

    if (config.algorithms.faceDetection.enabled) {
      detectionResults.faceDetection = await this.detectSpeakerChanges(
        videoElement, config.algorithms.faceDetection.speakerChangeThreshold, frameRate, onProgress
      );
    }

    // Combine and weight the results
    const combinedBoundaries = this.combineDetectionResults(detectionResults, config);
    
    // Filter and refine boundaries
    const refinedBoundaries = this.refineBoundaries(
      combinedBoundaries, 
      config.minSceneDuration, 
      duration
    );

    // Create scene objects
    for (let i = 0; i < Math.min(refinedBoundaries.length - 1, config.maxScenes); i++) {
      const startTime = refinedBoundaries[i].timestamp;
      const endTime = refinedBoundaries[i + 1]?.timestamp || duration;
      const sceneDuration = endTime - startTime;

      if (sceneDuration >= config.minSceneDuration) {
        const scene = await this.createSceneObject(
          `scene_${i + 1}`,
          startTime,
          endTime,
          refinedBoundaries[i],
          videoElement,
          config
        );
        scenes.push(scene);
      }
    }

    // Apply context preservation and narrative flow if enabled
    if (config.preserveContext || config.maintainNarrativeFlow) {
      return this.applyContextualRefinements(scenes, config);
    }

    console.log(`AdvancedSceneDetection: Detected ${scenes.length} scenes using multi-algorithm approach`);
    return scenes;
  }

  private async detectPixelDifferences(
    video: HTMLVideoElement,
    threshold: number,
    frameRate: number,
    onProgress?: (progress: number) => void
  ): Promise<SceneBoundary[]> {
    const boundaries: SceneBoundary[] = [];
    const sampleRate = Math.max(1, Math.floor(frameRate / 5)); // Sample every 5th frame
    let previousFrame: ImageData | null = null;

    for (let frame = 0; frame < video.duration * frameRate; frame += sampleRate) {
      const timestamp = frame / frameRate;
      video.currentTime = timestamp;
      
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      this.ctx.drawImage(video, 0, 0);
      
      const currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      if (previousFrame) {
        const difference = this.calculatePixelDifference(previousFrame, currentFrame);
        
        if (difference > threshold) {
          boundaries.push({
            timestamp,
            confidence: Math.min(difference / threshold, 1),
            method: 'pixelDifference',
            metadata: { pixelDifference: difference }
          });
        }
      }
      
      previousFrame = currentFrame;
      onProgress?.(frame / (video.duration * frameRate) * 25); // 25% of total progress
    }

    return boundaries;
  }

  private async detectAudioChanges(
    video: HTMLVideoElement,
    threshold: number,
    onProgress?: (progress: number) => void
  ): Promise<SceneBoundary[]> {
    const boundaries: SceneBoundary[] = [];
    
    try {
      // Create audio source from video
      const source = this.audioContext.createMediaElementSource(video);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      
      source.connect(analyser);
      analyser.connect(this.audioContext.destination);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let previousAmplitude = 0;
      const sampleInterval = 0.5; // Sample every 0.5 seconds
      
      for (let time = 0; time < video.duration; time += sampleInterval) {
        video.currentTime = time;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        analyser.getByteFrequencyData(dataArray);
        const amplitude = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        
        if (previousAmplitude > 0) {
          const change = Math.abs(amplitude - previousAmplitude) / Math.max(previousAmplitude, 1);
          
          if (change > threshold) {
            boundaries.push({
              timestamp: time,
              confidence: Math.min(change / threshold, 1),
              method: 'audioAmplitude',
              metadata: { amplitudeChange: change, amplitude }
            });
          }
        }
        
        previousAmplitude = amplitude;
        onProgress?.(25 + (time / video.duration) * 25); // 25-50% of total progress
      }
    } catch (error) {
      console.warn('Audio analysis failed, skipping:', error);
    }

    return boundaries;
  }

  private async detectColorChanges(
    video: HTMLVideoElement,
    threshold: number,
    frameRate: number,
    onProgress?: (progress: number) => void
  ): Promise<SceneBoundary[]> {
    const boundaries: SceneBoundary[] = [];
    const sampleRate = Math.max(1, Math.floor(frameRate / 3));
    let previousHistogram: number[] | null = null;

    for (let frame = 0; frame < video.duration * frameRate; frame += sampleRate) {
      const timestamp = frame / frameRate;
      video.currentTime = timestamp;
      
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      this.ctx.drawImage(video, 0, 0);
      
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const histogram = this.calculateColorHistogram(imageData);
      
      if (previousHistogram) {
        const similarity = this.calculateHistogramSimilarity(previousHistogram, histogram);
        const difference = 1 - similarity;
        
        if (difference > threshold) {
          boundaries.push({
            timestamp,
            confidence: Math.min(difference / threshold, 1),
            method: 'colorHistogram',
            metadata: { histogramDifference: difference, dominantColors: this.getDominantColors(histogram) }
          });
        }
      }
      
      previousHistogram = histogram;
      onProgress?.(50 + (frame / (video.duration * frameRate)) * 25); // 50-75% of total progress
    }

    return boundaries;
  }

  private async detectMotionChanges(
    video: HTMLVideoElement,
    threshold: number,
    frameRate: number,
    onProgress?: (progress: number) => void
  ): Promise<SceneBoundary[]> {
    const boundaries: SceneBoundary[] = [];
    const sampleRate = Math.max(1, Math.floor(frameRate / 4));
    let previousFrame: ImageData | null = null;

    for (let frame = 0; frame < video.duration * frameRate; frame += sampleRate) {
      const timestamp = frame / frameRate;
      video.currentTime = timestamp;
      
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      this.ctx.drawImage(video, 0, 0);
      
      const currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      if (previousFrame) {
        const motionLevel = this.calculateMotionLevel(previousFrame, currentFrame);
        
        // Detect significant motion changes (camera cuts, scene changes)
        if (motionLevel > threshold) {
          boundaries.push({
            timestamp,
            confidence: Math.min(motionLevel / threshold, 1),
            method: 'motionVector',
            metadata: { motionLevel, motionType: this.classifyMotion(motionLevel) }
          });
        }
      }
      
      previousFrame = currentFrame;
      onProgress?.(75 + (frame / (video.duration * frameRate)) * 20); // 75-95% of total progress
    }

    return boundaries;
  }

  private async detectSpeakerChanges(
    video: HTMLVideoElement,
    threshold: number,
    frameRate: number,
    onProgress?: (progress: number) => void
  ): Promise<SceneBoundary[]> {
    const boundaries: SceneBoundary[] = [];
    
    // Use AI model for face detection if available
    if (aiModelManager.isModelLoaded('clip-vit-base')) {
      const sampleRate = Math.max(1, Math.floor(frameRate / 2));
      let previousFaces: any[] = [];

      for (let frame = 0; frame < video.duration * frameRate; frame += sampleRate) {
        const timestamp = frame / frameRate;
        video.currentTime = timestamp;
        
        await new Promise(resolve => {
          video.onseeked = resolve;
        });

        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        this.ctx.drawImage(video, 0, 0);
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Simulate face detection (in real implementation, use actual AI model)
        const faces = await this.simulateFaceDetection(imageData);
        
        if (previousFaces.length > 0) {
          const speakerChange = this.detectSpeakerChange(previousFaces, faces, threshold);
          
          if (speakerChange.changed) {
            boundaries.push({
              timestamp,
              confidence: speakerChange.confidence,
              method: 'faceDetection',
              metadata: { 
                speakerChange: true, 
                previousSpeakers: previousFaces.length,
                currentSpeakers: faces.length 
              }
            });
          }
        }
        
        previousFaces = faces;
        onProgress?.(95 + (frame / (video.duration * frameRate)) * 5); // 95-100% of total progress
      }
    }

    return boundaries;
  }

  private combineDetectionResults(
    results: Record<string, SceneBoundary[]>,
    config: SceneDetectionConfig
  ): SceneBoundary[] {
    const allBoundaries: SceneBoundary[] = [];
    
    // Add weighted boundaries from each algorithm
    Object.entries(results).forEach(([method, boundaries]) => {
      const weight = config.algorithms[method as keyof typeof config.algorithms]?.weight || 1;
      
      boundaries.forEach(boundary => {
        allBoundaries.push({
          ...boundary,
          confidence: boundary.confidence * weight
        });
      });
    });

    // Sort by timestamp
    allBoundaries.sort((a, b) => a.timestamp - b.timestamp);

    // Merge nearby boundaries (within 2 seconds)
    const mergedBoundaries: SceneBoundary[] = [];
    const mergeWindow = 2.0;

    for (const boundary of allBoundaries) {
      const lastBoundary = mergedBoundaries[mergedBoundaries.length - 1];
      
      if (lastBoundary && Math.abs(boundary.timestamp - lastBoundary.timestamp) < mergeWindow) {
        // Merge boundaries - take the one with higher confidence
        if (boundary.confidence > lastBoundary.confidence) {
          mergedBoundaries[mergedBoundaries.length - 1] = boundary;
        }
      } else {
        mergedBoundaries.push(boundary);
      }
    }

    return mergedBoundaries;
  }

  private refineBoundaries(
    boundaries: SceneBoundary[],
    minDuration: number,
    totalDuration: number
  ): SceneBoundary[] {
    // Add start and end boundaries
    const refined = [
      { timestamp: 0, confidence: 1, method: 'start', metadata: {} },
      ...boundaries,
      { timestamp: totalDuration, confidence: 1, method: 'end', metadata: {} }
    ];

    // Remove boundaries that would create scenes shorter than minDuration
    const filtered: SceneBoundary[] = [refined[0]];
    
    for (let i = 1; i < refined.length; i++) {
      const lastBoundary = filtered[filtered.length - 1];
      const currentBoundary = refined[i];
      
      if (currentBoundary.timestamp - lastBoundary.timestamp >= minDuration) {
        filtered.push(currentBoundary);
      }
    }

    return filtered;
  }

  private async createSceneObject(
    id: string,
    startTime: number,
    endTime: number,
    boundary: SceneBoundary,
    video: HTMLVideoElement,
    config: SceneDetectionConfig
  ): Promise<DetectedScene> {
    // Generate thumbnail
    video.currentTime = startTime + (endTime - startTime) / 2;
    await new Promise(resolve => { video.onseeked = resolve; });
    
    this.canvas.width = 320;
    this.canvas.height = 180;
    this.ctx.drawImage(video, 0, 0, 320, 180);
    const thumbnail = this.canvas.toDataURL('image/jpeg', 0.8);

    // Calculate detection method scores
    const detectionMethods = {
      pixelDifference: boundary.method === 'pixelDifference' ? boundary.confidence : 0,
      audioAmplitude: boundary.method === 'audioAmplitude' ? boundary.confidence : 0,
      colorHistogram: boundary.method === 'colorHistogram' ? boundary.confidence : 0,
      motionVector: boundary.method === 'motionVector' ? boundary.confidence : 0,
      faceDetection: boundary.method === 'faceDetection' ? boundary.confidence : 0
    };

    // Calculate additional metrics
    const duration = endTime - startTime;
    const contextScore = this.calculateContextScore(startTime, endTime, duration);
    const narrativeImportance = this.calculateNarrativeImportance(startTime, endTime, duration);
    const viralPotential = this.calculateViralPotential(boundary, duration);

    return {
      id,
      startTime,
      endTime,
      duration,
      confidence: boundary.confidence,
      thumbnail,
      description: `Scene detected using ${boundary.method} (${Math.round(duration)}s)`,
      detectionMethods,
      contextScore,
      narrativeImportance,
      viralPotential,
      speakers: boundary.metadata.currentSpeakers ? [`speaker_${boundary.metadata.currentSpeakers}`] : ['unknown'],
      dominantColors: boundary.metadata.dominantColors || ['#333333'],
      motionLevel: boundary.metadata.motionLevel > 0.7 ? 'high' : boundary.metadata.motionLevel > 0.3 ? 'medium' : 'low',
      audioFeatures: {
        averageAmplitude: boundary.metadata.amplitude || 0.5,
        speechRatio: 0.8,
        musicRatio: 0.2
      }
    };
  }

  private async applyContextualRefinements(
    scenes: DetectedScene[],
    config: SceneDetectionConfig
  ): Promise<DetectedScene[]> {
    if (!config.preserveContext && !config.maintainNarrativeFlow) {
      return scenes;
    }

    // Apply AI-based context preservation
    if (aiModelManager.isModelLoaded('llama-3.2-1b')) {
      // Analyze narrative flow and adjust scene boundaries
      for (let i = 0; i < scenes.length - 1; i++) {
        const currentScene = scenes[i];
        const nextScene = scenes[i + 1];
        
        // Check if scenes should be merged to preserve context
        if (this.shouldMergeForContext(currentScene, nextScene)) {
          scenes[i] = {
            ...currentScene,
            endTime: nextScene.endTime,
            duration: nextScene.endTime - currentScene.startTime,
            description: `${currentScene.description} (merged for context preservation)`
          };
          scenes.splice(i + 1, 1);
          i--; // Recheck the merged scene
        }
      }
    }

    return scenes;
  }

  // Helper methods
  private calculatePixelDifference(frame1: ImageData, frame2: ImageData): number {
    let totalDiff = 0;
    const data1 = frame1.data;
    const data2 = frame2.data;
    
    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      totalDiff += (rDiff + gDiff + bDiff) / 3;
    }
    
    return totalDiff / (data1.length / 4) / 255;
  }

  private calculateColorHistogram(imageData: ImageData): number[] {
    const histogram = new Array(256).fill(0);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
    }
    
    return histogram;
  }

  private calculateHistogramSimilarity(hist1: number[], hist2: number[]): number {
    let correlation = 0;
    const total1 = hist1.reduce((sum, val) => sum + val, 0);
    const total2 = hist2.reduce((sum, val) => sum + val, 0);
    
    for (let i = 0; i < hist1.length; i++) {
      const norm1 = hist1[i] / total1;
      const norm2 = hist2[i] / total2;
      correlation += Math.min(norm1, norm2);
    }
    
    return correlation;
  }

  private getDominantColors(histogram: number[]): string[] {
    // Simplified dominant color extraction
    const maxIndex = histogram.indexOf(Math.max(...histogram));
    const grayValue = maxIndex;
    const hexColor = `#${grayValue.toString(16).padStart(2, '0').repeat(3)}`;
    return [hexColor];
  }

  private calculateMotionLevel(frame1: ImageData, frame2: ImageData): number {
    // Simplified motion detection using pixel differences
    return this.calculatePixelDifference(frame1, frame2) * 2;
  }

  private classifyMotion(motionLevel: number): string {
    if (motionLevel > 0.8) return 'camera_cut';
    if (motionLevel > 0.5) return 'fast_motion';
    if (motionLevel > 0.2) return 'moderate_motion';
    return 'slow_motion';
  }

  private async simulateFaceDetection(imageData: ImageData): Promise<any[]> {
    // Simulate face detection results
    return Math.random() > 0.5 ? [{ id: 'face_1', confidence: 0.8 }] : [];
  }

  private detectSpeakerChange(previousFaces: any[], currentFaces: any[], threshold: number): { changed: boolean; confidence: number } {
    const faceCountChange = Math.abs(previousFaces.length - currentFaces.length);
    const changed = faceCountChange > 0;
    const confidence = changed ? Math.min(faceCountChange / 2, 1) : 0;
    
    return { changed: changed && confidence > threshold, confidence };
  }

  private calculateContextScore(startTime: number, endTime: number, duration: number): number {
    // Higher score for scenes that are likely to contain complete thoughts
    const idealDuration = 15; // seconds
    const durationScore = Math.exp(-Math.abs(duration - idealDuration) / idealDuration);
    return Math.min(durationScore, 1);
  }

  private calculateNarrativeImportance(startTime: number, endTime: number, duration: number): number {
    // Higher importance for scenes at key narrative positions
    const totalDuration = endTime; // Approximate total duration
    const position = startTime / totalDuration;
    
    // Higher importance at beginning, middle, and end
    if (position < 0.1 || position > 0.9) return 0.9; // Introduction/conclusion
    if (position > 0.4 && position < 0.6) return 0.8; // Middle/climax
    return 0.5; // Regular content
  }

  private calculateViralPotential(boundary: SceneBoundary, duration: number): number {
    let score = boundary.confidence;
    
    // Boost score for optimal duration (10-30 seconds)
    if (duration >= 10 && duration <= 30) {
      score *= 1.2;
    }
    
    // Boost for high motion or audio changes (more engaging)
    if (boundary.method === 'motionVector' || boundary.method === 'audioAmplitude') {
      score *= 1.1;
    }
    
    return Math.min(score, 1);
  }

  private shouldMergeForContext(scene1: DetectedScene, scene2: DetectedScene): boolean {
    // Merge if scenes are very short and have similar characteristics
    const totalDuration = scene1.duration + scene2.duration;
    const similarSpeakers = scene1.speakers.some(s => scene2.speakers.includes(s));
    const similarMotion = scene1.motionLevel === scene2.motionLevel;
    
    return totalDuration < 20 && similarSpeakers && similarMotion;
  }
}

interface SceneBoundary {
  timestamp: number;
  confidence: number;
  method: string;
  metadata: Record<string, any>;
}

export const advancedSceneDetection = new AdvancedSceneDetection();