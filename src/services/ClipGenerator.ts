import { VideoProcessingModule, VideoClip, ConversionOptions } from './VideoProcessingModule';
import { DetectedScene, PlatformPreset, VideoMetadata } from '../types/video';

export interface ClipGenerationOptions {
  preserveAudio: boolean;
  addCaptions: boolean;
  enhanceQuality: boolean;
  smartCropping: boolean;
  batchSize: number;
}

export interface GeneratedClip {
  id: string;
  sceneId: string;
  platform: string;
  blob: Blob;
  metadata: VideoMetadata;
  thumbnail: string;
  qualityScore: number;
  engagementFactors: EngagementFactors;
  cropStrategy: CropStrategy;
  duration: number;
  aspectRatio: number;
  createdAt: Date;
}

export interface EngagementFactors {
  hookStrength: number; // 0-1, how compelling the opening is
  visualAppeal: number; // 0-1, aesthetic quality
  pacing: number; // 0-1, optimal pacing for platform
  contentDensity: number; // 0-1, information per second
  emotionalImpact: number; // 0-1, emotional engagement
  viralPotential: number; // 0-1, likelihood to be shared
}

export interface CropStrategy {
  type: 'center' | 'smart' | 'face-tracking' | 'action-following' | 'speaker-focus';
  focusPoints: { x: number; y: number; weight: number }[];
  zoomLevel: number;
  panDirection?: 'left' | 'right' | 'up' | 'down' | 'none';
  trackingEnabled: boolean;
}

export interface ClipGenerationProgress {
  clipId: string;
  sceneId: string;
  platform: string;
  phase: 'analyzing' | 'cropping' | 'processing' | 'optimizing' | 'finalizing';
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}

export class ClipGenerator {
  private videoProcessor: VideoProcessingModule;
  private isInitialized = false;

  constructor() {
    this.videoProcessor = new VideoProcessingModule();
  }

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      // VideoProcessingModule initializes itself
      this.isInitialized = true;
    }
  }

  /**
   * Generate optimized clips from detected scenes for multiple platforms
   */
  async generateClipsFromScenes(
    videoFile: File | Blob,
    scenes: DetectedScene[],
    platforms: PlatformPreset[],
    options: ClipGenerationOptions = this.getDefaultOptions(),
    onProgress?: (progress: ClipGenerationProgress) => void
  ): Promise<GeneratedClip[]> {
    await this.initialize();

    const generatedClips: GeneratedClip[] = [];
    const totalClips = scenes.length * platforms.length;
    let processedClips = 0;

    // Process clips in batches to manage memory
    const batchSize = Math.min(options.batchSize, totalClips);
    
    for (let i = 0; i < scenes.length; i += batchSize) {
      const sceneBatch = scenes.slice(i, i + batchSize);
      
      const batchPromises = sceneBatch.flatMap(scene =>
        platforms.map(async platform => {
          const clipId = `clip_${scene.id}_${platform.id}_${Date.now()}`;
          
          try {
            onProgress?.({
              clipId,
              sceneId: scene.id,
              platform: platform.id,
              phase: 'analyzing',
              progress: 0,
              message: `Analyzing scene for ${platform.displayName}...`
            });

            // Analyze scene for platform optimization
            const analysis = await this.analyzeSceneForPlatform(scene, platform);
            
            onProgress?.({
              clipId,
              sceneId: scene.id,
              platform: platform.id,
              phase: 'cropping',
              progress: 20,
              message: 'Applying smart cropping...'
            });

            // Generate optimized clip
            const clip = await this.generateOptimizedClip(
              videoFile,
              scene,
              platform,
              analysis,
              options,
              (progress) => {
                onProgress?.({
                  clipId,
                  sceneId: scene.id,
                  platform: platform.id,
                  phase: 'processing',
                  progress: 20 + (progress * 0.6),
                  message: 'Processing video clip...'
                });
              }
            );

            onProgress?.({
              clipId,
              sceneId: scene.id,
              platform: platform.id,
              phase: 'finalizing',
              progress: 100,
              message: 'Clip generated successfully'
            });

            generatedClips.push(clip);
            processedClips++;

            return clip;
          } catch (error) {
            console.error(`Failed to generate clip for scene ${scene.id} on ${platform.id}:`, error);
            throw error;
          }
        })
      );

      // Wait for current batch to complete
      await Promise.all(batchPromises);
    }

    return generatedClips;
  }

  /**
   * Generate a single optimized clip from a scene
   */
  private async generateOptimizedClip(
    videoFile: File | Blob,
    scene: DetectedScene,
    platform: PlatformPreset,
    analysis: SceneAnalysis,
    options: ClipGenerationOptions,
    onProgress?: (progress: number) => void
  ): Promise<GeneratedClip> {
    // Calculate optimal duration for platform
    const optimalDuration = this.calculateOptimalDuration(scene, platform, analysis);
    const startTime = Math.max(0, scene.startTime - 1); // Add 1s buffer
    const endTime = Math.min(scene.endTime + 1, startTime + optimalDuration);

    onProgress?.(10);

    // Trim video to scene boundaries with buffer
    const trimmedClip = await this.videoProcessor.trimVideo(
      videoFile,
      startTime,
      endTime,
      (progress) => onProgress?.(10 + progress.percentage * 0.3)
    );

    onProgress?.(40);

    // Apply platform-specific optimizations
    const optimizedClip = await this.applyPlatformOptimizations(
      trimmedClip.blob,
      platform,
      analysis.cropStrategy,
      options,
      (progress) => onProgress?.(40 + progress.percentage * 0.5)
    );

    onProgress?.(90);

    // Generate thumbnail
    const thumbnail = await this.videoProcessor.generateThumbnail(
      optimizedClip,
      optimalDuration / 2,
      { width: 320, height: 180, quality: 80 }
    );

    onProgress?.(95);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(scene, platform, analysis);

    onProgress?.(100);

    return {
      id: `clip_${scene.id}_${platform.id}_${Date.now()}`,
      sceneId: scene.id,
      platform: platform.id,
      blob: optimizedClip,
      metadata: trimmedClip.metadata,
      thumbnail: URL.createObjectURL(thumbnail),
      qualityScore,
      engagementFactors: analysis.engagementFactors,
      cropStrategy: analysis.cropStrategy,
      duration: optimalDuration,
      aspectRatio: platform.aspectRatio,
      createdAt: new Date()
    };
  }

  /**
   * Analyze scene for platform-specific optimization
   */
  private async analyzeSceneForPlatform(
    scene: DetectedScene,
    platform: PlatformPreset
  ): Promise<SceneAnalysis> {
    // Simulate advanced scene analysis
    const engagementFactors: EngagementFactors = {
      hookStrength: this.calculateHookStrength(scene, platform),
      visualAppeal: this.calculateVisualAppeal(scene),
      pacing: this.calculatePacing(scene, platform),
      contentDensity: this.calculateContentDensity(scene),
      emotionalImpact: scene.viralPotential || 0.5,
      viralPotential: scene.viralPotential || 0.5
    };

    const cropStrategy: CropStrategy = {
      type: platform.cropStrategy,
      focusPoints: this.calculateFocusPoints(scene, platform),
      zoomLevel: this.calculateOptimalZoom(scene, platform),
      panDirection: this.determinePanDirection(scene),
      trackingEnabled: platform.cropStrategy === 'face-tracking' || platform.cropStrategy === 'action-following'
    };

    return {
      engagementFactors,
      cropStrategy,
      optimalDuration: this.calculateOptimalDuration(scene, platform, { engagementFactors, cropStrategy }),
      qualityScore: 0 // Will be calculated later
    };
  }

  /**
   * Apply platform-specific video optimizations
   */
  private async applyPlatformOptimizations(
    videoBlob: Blob,
    platform: PlatformPreset,
    cropStrategy: CropStrategy,
    options: ClipGenerationOptions,
    onProgress?: (progress: { percentage: number }) => void
  ): Promise<Blob> {
    const conversionOptions: ConversionOptions = {
      quality: 'high',
      resolution: { width: platform.width, height: platform.height },
      fps: this.getOptimalFPS(platform),
      bitrate: this.getOptimalBitrate(platform),
      videoCodec: 'libx264',
      audioCodec: platform.audioRequired ? 'aac' : undefined
    };

    // Apply smart cropping and reframing
    if (options.smartCropping && cropStrategy.type !== 'center') {
      conversionOptions.cropFilter = this.generateCropFilter(cropStrategy, platform);
    }

    // Convert to platform format
    return await this.videoProcessor.convertFormat(
      videoBlob,
      'mp4',
      conversionOptions,
      onProgress
    );
  }

  /**
   * Calculate optimal duration based on platform and content
   */
  private calculateOptimalDuration(
    scene: DetectedScene,
    platform: PlatformPreset,
    analysis?: SceneAnalysis
  ): number {
    const baseDuration = scene.duration;
    const platformMax = platform.maxDuration;
    const platformPreferred = platform.contentGuidelines?.preferredLength || platformMax;

    // For high-engagement content, prefer longer clips
    const engagementMultiplier = analysis?.engagementFactors.viralPotential || 0.5;
    const targetDuration = platformPreferred * (0.7 + engagementMultiplier * 0.6);

    // Ensure we don't exceed scene boundaries or platform limits
    return Math.min(
      Math.max(5, targetDuration), // Minimum 5 seconds
      Math.min(baseDuration, platformMax)
    );
  }

  /**
   * Calculate focus points for smart cropping
   */
  private calculateFocusPoints(scene: DetectedScene, platform: PlatformPreset): { x: number; y: number; weight: number }[] {
    const focusPoints: { x: number; y: number; weight: number }[] = [];

    // Center point (always included)
    focusPoints.push({ x: 0.5, y: 0.5, weight: 0.3 });

    // Face detection points (simulated)
    if (scene.speakers && scene.speakers.length > 0) {
      focusPoints.push({ x: 0.5, y: 0.3, weight: 0.8 }); // Upper center for faces
    }

    // Platform-specific focus adjustments
    switch (platform.cropStrategy) {
      case 'face-tracking':
        focusPoints.push({ x: 0.5, y: 0.25, weight: 1.0 });
        break;
      case 'action-following':
        focusPoints.push({ x: 0.6, y: 0.4, weight: 0.7 });
        break;
      case 'speaker-focus':
        focusPoints.push({ x: 0.5, y: 0.35, weight: 0.9 });
        break;
    }

    return focusPoints;
  }

  /**
   * Generate FFmpeg crop filter based on strategy
   */
  private generateCropFilter(cropStrategy: CropStrategy, platform: PlatformPreset): string {
    const { width, height } = platform;
    const aspectRatio = width / height;

    // Calculate crop dimensions based on focus points
    const primaryFocus = cropStrategy.focusPoints.reduce((prev, current) => 
      prev.weight > current.weight ? prev : current
    );

    // Generate crop filter string for FFmpeg
    const cropWidth = Math.round(width / cropStrategy.zoomLevel);
    const cropHeight = Math.round(height / cropStrategy.zoomLevel);
    const cropX = Math.round((1920 - cropWidth) * primaryFocus.x); // Assuming 1920 source width
    const cropY = Math.round((1080 - cropHeight) * primaryFocus.y); // Assuming 1080 source height

    return `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},scale=${width}:${height}`;
  }

  /**
   * Calculate engagement factors
   */
  private calculateHookStrength(scene: DetectedScene, platform: PlatformPreset): number {
    // Higher score for scenes that start with high confidence
    const confidenceScore = scene.confidence;
    
    // Boost for scenes detected by multiple methods
    const methodCount = Object.values(scene.detectionMethods || {}).filter(score => score > 0).length;
    const methodBonus = Math.min(methodCount / 5, 0.3);
    
    // Platform-specific adjustments
    const platformMultiplier = platform.contentGuidelines?.attentionSpan < 10 ? 1.2 : 1.0;
    
    return Math.min(1, (confidenceScore + methodBonus) * platformMultiplier);
  }

  private calculateVisualAppeal(scene: DetectedScene): number {
    // Based on motion level and color diversity
    const motionScore = scene.motionLevel === 'high' ? 0.8 : scene.motionLevel === 'medium' ? 0.6 : 0.4;
    const colorScore = scene.dominantColors ? Math.min(scene.dominantColors.length / 5, 1) : 0.5;
    
    return (motionScore + colorScore) / 2;
  }

  private calculatePacing(scene: DetectedScene, platform: PlatformPreset): number {
    const idealPacing = platform.contentGuidelines?.idealPacing || 'medium';
    const sceneMotion = scene.motionLevel;
    
    // Match scene motion to platform preference
    const pacingMap = {
      'fast': { 'high': 1.0, 'medium': 0.7, 'low': 0.4 },
      'medium': { 'high': 0.8, 'medium': 1.0, 'low': 0.6 },
      'slow': { 'high': 0.5, 'medium': 0.8, 'low': 1.0 }
    };
    
    return pacingMap[idealPacing]?.[sceneMotion] || 0.6;
  }

  private calculateContentDensity(scene: DetectedScene): number {
    // Based on duration and estimated information content
    const durationScore = Math.min(scene.duration / 30, 1); // Normalize to 30 seconds
    const speakerScore = scene.speakers ? Math.min(scene.speakers.length / 3, 1) : 0.5;
    
    return (durationScore + speakerScore) / 2;
  }

  private calculateOptimalZoom(scene: DetectedScene, platform: PlatformPreset): number {
    // Base zoom level
    let zoom = 1.0;
    
    // Increase zoom for vertical formats to focus on content
    if (platform.aspectRatio < 1) {
      zoom *= 1.2;
    }
    
    // Adjust based on speaker count
    if (scene.speakers && scene.speakers.length > 1) {
      zoom *= 0.9; // Zoom out slightly for multiple speakers
    }
    
    return Math.max(1.0, Math.min(2.0, zoom));
  }

  private determinePanDirection(scene: DetectedScene): 'left' | 'right' | 'up' | 'down' | 'none' {
    // Simulate pan direction based on scene characteristics
    if (scene.motionLevel === 'high') {
      return Math.random() > 0.5 ? 'right' : 'left';
    }
    return 'none';
  }

  private calculateQualityScore(
    scene: DetectedScene,
    platform: PlatformPreset,
    analysis: SceneAnalysis
  ): number {
    const factors = analysis.engagementFactors;
    
    // Weighted average of engagement factors
    const weights = {
      hookStrength: 0.25,
      visualAppeal: 0.20,
      pacing: 0.15,
      contentDensity: 0.15,
      emotionalImpact: 0.15,
      viralPotential: 0.10
    };
    
    return Object.entries(factors).reduce((score, [factor, value]) => {
      const weight = weights[factor as keyof EngagementFactors] || 0;
      return score + (value * weight);
    }, 0);
  }

  private getOptimalFPS(platform: PlatformPreset): number {
    // Platform-specific FPS optimization
    switch (platform.id) {
      case 'tiktok':
      case 'instagram-reels':
        return 30; // Smooth for mobile viewing
      case 'youtube-shorts':
        return 60; // Higher quality for YouTube
      case 'linkedin':
        return 24; // Professional, cinematic feel
      default:
        return 30;
    }
  }

  private getOptimalBitrate(platform: PlatformPreset): string {
    // Platform-specific bitrate optimization
    const area = platform.width * platform.height;
    
    if (area >= 1920 * 1080) return '4M'; // 4K/1080p
    if (area >= 1280 * 720) return '2.5M'; // 720p
    return '1.5M'; // Lower resolutions
  }

  private getDefaultOptions(): ClipGenerationOptions {
    return {
      preserveAudio: true,
      addCaptions: false,
      enhanceQuality: true,
      smartCropping: true,
      batchSize: 3
    };
  }

  /**
   * Batch generate clips for multiple videos
   */
  async batchGenerateClips(
    videos: { file: File | Blob; scenes: DetectedScene[] }[],
    platforms: PlatformPreset[],
    options?: ClipGenerationOptions,
    onProgress?: (videoIndex: number, progress: ClipGenerationProgress) => void
  ): Promise<GeneratedClip[][]> {
    const results: GeneratedClip[][] = [];
    
    for (let i = 0; i < videos.length; i++) {
      const { file, scenes } = videos[i];
      
      const clips = await this.generateClipsFromScenes(
        file,
        scenes,
        platforms,
        options,
        (progress) => onProgress?.(i, progress)
      );
      
      results.push(clips);
    }
    
    return results;
  }

  /**
   * Get quality metrics for generated clips
   */
  getClipQualityMetrics(clips: GeneratedClip[]): ClipQualityMetrics {
    const totalClips = clips.length;
    const averageQuality = clips.reduce((sum, clip) => sum + clip.qualityScore, 0) / totalClips;
    const highQualityClips = clips.filter(clip => clip.qualityScore > 0.7).length;
    
    const platformDistribution = clips.reduce((dist, clip) => {
      dist[clip.platform] = (dist[clip.platform] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
    
    return {
      totalClips,
      averageQuality,
      highQualityClips,
      qualityDistribution: {
        excellent: clips.filter(c => c.qualityScore > 0.8).length,
        good: clips.filter(c => c.qualityScore > 0.6 && c.qualityScore <= 0.8).length,
        fair: clips.filter(c => c.qualityScore > 0.4 && c.qualityScore <= 0.6).length,
        poor: clips.filter(c => c.qualityScore <= 0.4).length
      },
      platformDistribution,
      averageDuration: clips.reduce((sum, clip) => sum + clip.duration, 0) / totalClips
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.videoProcessor.cleanup();
    this.isInitialized = false;
  }
}

// Additional interfaces
interface SceneAnalysis {
  engagementFactors: EngagementFactors;
  cropStrategy: CropStrategy;
  optimalDuration?: number;
  qualityScore?: number;
}

interface ClipQualityMetrics {
  totalClips: number;
  averageQuality: number;
  highQualityClips: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  platformDistribution: Record<string, number>;
  averageDuration: number;
}

// Singleton instance
export const clipGenerator = new ClipGenerator();