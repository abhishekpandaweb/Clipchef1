import { 
  VideoFile, 
  VideoProcessingJob, 
  ProcessingStep, 
  SceneDetectionConfig, 
  PlatformPreset,
  ClipGenerationJob,
  WorkerMessage
} from '../types/video';

export class VideoProcessingService {
  private worker: Worker | null = null;
  private jobs = new Map<string, VideoProcessingJob>();
  private callbacks = new Map<string, (job: VideoProcessingJob) => void>();
  private workerReady = false;
  private workerReadyPromise: Promise<void> | null = null;
  private workerReadyResolved = false;

  constructor() {
    console.log('VideoProcessingService: Constructor called');
    this.initializeWorker();
  }

  private initializeWorker(): Promise<void> {
    if (this.workerReadyPromise) {
      return this.workerReadyPromise;
    }

    console.log('VideoProcessingService: Initializing worker');
    
    this.workerReadyPromise = new Promise((resolve, reject) => {
      try {
        // Create worker using Vite's worker import
        this.worker = new Worker(
          new URL('./VideoProcessingWorker.ts', import.meta.url),
          { type: 'module' }
        );
        
        console.log('VideoProcessingService: Worker created successfully');

        this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          console.log('VideoProcessingService: Received worker message', event.data);
          
          // Handle worker ready signal
          if (event.data.type === 'ready' || event.data.type === 'pong') {
            console.log('VideoProcessingService: Worker is ready');
            if (!this.workerReadyResolved) {
              this.workerReady = true;
              this.workerReadyResolved = true;
              resolve();
            }
            return;
          }
          
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('VideoProcessingService: Worker error', error);
          if (!this.workerReadyResolved) {
            this.workerReady = false;
            reject(error);
          }
        };
        
        this.worker.onmessageerror = (error) => {
          console.error('VideoProcessingService: Worker message error', error);
          if (!this.workerReadyResolved) {
            reject(error);
          }
        };
        
        // Set a timeout in case worker doesn't respond
        setTimeout(() => {
          if (!this.workerReady && !this.workerReadyResolved) {
            console.log('VideoProcessingService: Worker ready timeout, pinging worker');
            this.worker?.postMessage({ type: 'ping', data: {} });
            
            // Give it another chance
            setTimeout(() => {
              if (!this.workerReady && !this.workerReadyResolved) {
                this.workerReadyResolved = true;
                reject(new Error('Worker initialization timeout'));
              }
            }, 2000);
          }
        }, 1000);
        
      } catch (error) {
        console.error('VideoProcessingService: Failed to create worker', error);
        reject(error);
      }
    });

    return this.workerReadyPromise;
  }

  private handleWorkerMessage(message: WorkerMessage) {
    console.log('VideoProcessingService: Handling worker message', message.type, message.jobId);
    const job = this.jobs.get(message.jobId);
    if (!job) {
      console.warn('VideoProcessingService: Job not found for message', message.jobId);
      return;
    }

    switch (message.type) {
      case 'progress':
        this.updateJobProgress(job, message.stepId, message.data);
        break;
      case 'complete':
        this.handleStepComplete(job, message.stepId, message.data);
        break;
      case 'error':
        this.handleStepError(job, message.stepId, message.data);
        break;
      case 'log':
        console.log(`[Worker ${message.jobId}]:`, message.data.message);
        break;
    }

    // Notify callback
    const callback = this.callbacks.get(message.jobId);
    if (callback) {
      callback(job);
    }
  }

  private updateJobProgress(job: VideoProcessingJob, stepId: string | undefined, data: any) {
    console.log('VideoProcessingService: Updating job progress', job.id, stepId, data);
    if (stepId) {
      const step = job.steps.find(s => s.id === stepId);
      if (step) {
        step.progress = data.progress;
        step.status = 'active';
      }
    }

    // Calculate overall job progress
    const totalSteps = job.steps.length;
    const completedSteps = job.steps.filter(s => s.status === 'completed').length;
    const activeStep = job.steps.find(s => s.status === 'active');
    
    if (activeStep) {
      job.progress = ((completedSteps + (activeStep.progress / 100)) / totalSteps) * 100;
    } else {
      job.progress = (completedSteps / totalSteps) * 100;
    }

    job.updatedAt = new Date();
  }

  private async handleStepComplete(job: VideoProcessingJob, stepId: string | undefined, data: any) {
    console.log('VideoProcessingService: Step completed', job.id, stepId, data);
    if (stepId) {
      const step = job.steps.find(s => s.id === stepId);
      if (step) {
        step.status = 'completed';
        step.progress = 100;
        step.endTime = new Date();
      }
    }

    // Handle specific step completions
    if (data.metadata) {
      job.metadata = data.metadata;
      job.videoFile.metadata = data.metadata;
    }

    if (data.scenes) {
      console.log('VideoProcessingService: Processing', data.scenes.length, 'scenes');
      
      // Filter out invalid scenes
      const validScenes = data.scenes.filter((scene: any) => {
        const isValid = scene && 
          typeof scene.startTime === 'number' && 
          typeof scene.endTime === 'number' && 
          typeof scene.duration === 'number' &&
          !isNaN(scene.startTime) && 
          !isNaN(scene.endTime) && 
          !isNaN(scene.duration) &&
          scene.startTime >= 0 &&
          scene.endTime > scene.startTime &&
          scene.duration > 0;
        
        if (!isValid) {
          console.warn('VideoProcessingService: Filtering out invalid scene', scene);
        }
        
        return isValid;
      });
      
      console.log('VideoProcessingService: Valid scenes after filtering:', validScenes.length);
      
      // Generate thumbnails for scenes on main thread
      const scenesWithThumbnails = await Promise.all(
        validScenes.map(async (scene: DetectedScene) => {
          const thumbnailTime = scene.startTime + (scene.duration / 2);
          try {
            const thumbnail = await this.generateThumbnailFromVideo(job.videoFile.url, thumbnailTime);
            return { ...scene, thumbnail };
          } catch (error) {
            console.warn('VideoProcessingService: Failed to generate thumbnail for scene', scene.id, error);
            // Return scene without thumbnail
            return { ...scene, thumbnail: '' };
          }
        })
      );
      job.scenes = scenesWithThumbnails;
      console.log('VideoProcessingService: Updated job with', scenesWithThumbnails.length, 'scenes with thumbnails');
    }

    if (data.clip) {
      // Update clip job
      const clipJob = job.clips.find(c => c.id === stepId);
      if (clipJob) {
        console.log('VideoProcessingService: Updating clip job', clipJob.id, 'with output');
        // Create blob URL from raw data
        const clipBlob = new Blob([data.clip.data], { type: data.clip.mimeType });
        const clipUrl = URL.createObjectURL(clipBlob);
        
        // Generate thumbnail for the clip
        const thumbnail = await this.generateThumbnailFromVideo(clipUrl, 0);
        
        clipJob.status = 'completed';
        clipJob.outputUrl = clipUrl;
        clipJob.thumbnail = thumbnail;
        clipJob.completedAt = new Date();
        clipJob.progress = 100;
      }
    }

    // Check if all clips are complete for generate-clips step
    if (stepId && stepId.startsWith('clip_')) {
      const allClipsComplete = job.clips.every(c => c.status === 'completed');
      if (allClipsComplete && job.clips.length > 0) {
        console.log('VideoProcessingService: All clips completed, marking generate-clips step as complete');
        const generateClipsStep = job.steps.find(s => s.id === 'generate-clips');
        if (generateClipsStep) {
          generateClipsStep.status = 'completed';
          generateClipsStep.progress = 100;
          generateClipsStep.endTime = new Date();
        }
      }
    }

    // Check if all main steps are complete
    const allMainStepsComplete = job.steps.every(s => s.status === 'completed');
    if (allMainStepsComplete) {
      console.log('VideoProcessingService: Job completed', job.id);
      job.status = 'completed';
      job.progress = 100;
    } else {
      // Start next step
      this.startNextStep(job);
      
      // Update progress for generate-clips step based on completed clips
      const generateClipsStep = job.steps.find(s => s.id === 'generate-clips' && s.status === 'active');
      if (generateClipsStep && job.clips.length > 0) {
        const completedClips = job.clips.filter(c => c.status === 'completed').length;
        generateClipsStep.progress = (completedClips / job.clips.length) * 100;
        console.log('VideoProcessingService: Updated generate-clips progress:', generateClipsStep.progress);
      }
    }

    job.updatedAt = new Date();
  }

  private handleStepError(job: VideoProcessingJob, stepId: string | undefined, data: any) {
    console.error('VideoProcessingService: Step failed', job.id, stepId, data);
    if (stepId) {
      const step = job.steps.find(s => s.id === stepId);
      if (step) {
        step.status = 'failed';
        step.error = data.error;
        step.endTime = new Date();
      }
    }

    job.status = 'failed';
    job.error = data.error;
    job.updatedAt = new Date();
  }

  private startNextStep(job: VideoProcessingJob) {
    console.log('VideoProcessingService: Starting next step for job', job.id);
    const nextStep = job.steps.find(s => s.status === 'pending');
    if (!nextStep) {
      console.log('VideoProcessingService: No more steps for job', job.id);
      return;
    }

    nextStep.status = 'active';
    nextStep.startTime = new Date();
    job.currentStep = nextStep.id;

    // Execute step based on its ID
    this.executeStep(job, nextStep);
  }

  private executeStep(job: VideoProcessingJob, step: ProcessingStep) {
    console.log('VideoProcessingService: Executing step', step.id, 'for job', job.id);
    if (!this.worker || !this.workerReady) {
      console.error('VideoProcessingService: Worker not available for step execution');
      this.handleStepError(job, step.id, { error: 'Worker not available' });
      return;
    }

    const videoFile = job.videoFile;

    switch (step.id) {

      case 'detect-scenes':
        console.log('VideoProcessingService: Sending detectScenes message');
        const advancedConfig: SceneDetectionConfig = {
          sensitivity: 'medium',
          algorithms: {
            pixelDifference: {
              enabled: true,
              threshold: 0.3,
              weight: 1.0
            },
            audioAmplitude: {
              enabled: true,
              threshold: 0.2,
              weight: 0.8
            },
            colorHistogram: {
              enabled: true,
              threshold: 0.4,
              weight: 0.7
            },
            motionVector: {
              enabled: true,
              threshold: 0.5,
              weight: 0.9
            },
            faceDetection: {
              enabled: true,
              speakerChangeThreshold: 0.6,
              weight: 1.2
            }
          },
          minSceneDuration: 5,
          maxScenes: 15,
          preserveContext: true,
          maintainNarrativeFlow: true
        };
        
        // Convert video file to array buffer for worker
        fetch(videoFile.url)
          .then(response => response.arrayBuffer())
          .then(data => {
            this.worker!.postMessage({
              type: 'detectScenes',
              data: { 
                videoFile: { data, type: videoFile.format }, 
                config: advancedConfig, 
                jobId: job.id, 
                stepId: step.id,
                metadata: job.metadata
              }
            });
          })
          .catch(error => {
            this.handleStepError(job, step.id, { error: `Failed to read video file: ${error}` });
          });
        break;

      case 'generate-clips':
        console.log('VideoProcessingService: Starting clip generation');
        this.generateClipsForAllPlatforms(job);
        break;
      
      default:
        console.error('VideoProcessingService: Unknown step', step.id);
        this.handleStepError(job, step.id, { error: `Unknown step: ${step.id}` });
    }
  }

  private generateClipsForAllPlatforms(job: VideoProcessingJob) {
    console.log('VideoProcessingService: Generating clips for all platforms', job.scenes.length, 'scenes');
    
    if (job.scenes.length === 0) {
      console.warn('VideoProcessingService: No scenes available for clip generation');
      // Mark the generate-clips step as completed even without scenes
      const step = job.steps.find(s => s.id === 'generate-clips');
      if (step) {
        step.status = 'completed';
        step.progress = 100;
        step.endTime = new Date();
      }
      job.status = 'completed';
      job.progress = 100;
      job.updatedAt = new Date();
      
      const callback = this.callbacks.get(job.id);
      if (callback) {
        callback(job);
      }
      return;
    }
    
    const platforms = this.getPlatformPresets();
    let totalClips = 0;
    
    job.scenes.forEach(scene => {
      platforms.forEach(preset => {
        const clipJob: ClipGenerationJob = {
          id: `clip_${scene.id}_${preset.id}`,
          videoId: job.videoFile.id,
          sceneId: scene.id,
          platform: preset.id,
          preset,
          status: 'pending',
          progress: 0,
          createdAt: new Date()
        };

        job.clips.push(clipJob);
        totalClips++;

        // Mark clip as processing
        clipJob.status = 'processing';

        // Start clip generation
        if (this.worker) {
          console.log('VideoProcessingService: Sending generateClip message for', preset.displayName);
          
          // Convert video file to array buffer for worker
          fetch(job.videoFile.url)
            .then(response => response.arrayBuffer())
            .then(data => {
              this.worker!.postMessage({
                type: 'generateClip',
                data: {
                  scene,
                  preset,
                  jobId: clipJob.id,
                  stepId: clipJob.id,
                  videoFile: { data, type: job.videoFile.format }
                }
              });
            })
            .catch(error => {
              console.error('VideoProcessingService: Failed to read video file for clip generation', error);
            });
        }
      });
    });
    
    console.log('VideoProcessingService: Started generation of', totalClips, 'clips');
    
    // Update the generate-clips step progress
    const step = job.steps.find(s => s.id === 'generate-clips');
    if (step) {
      step.status = 'active';
      step.progress = 0;
    }

    // Update job progress
    job.updatedAt = new Date();
    const callback = this.callbacks.get(job.id);
    if (callback) {
      callback(job);
    }
  }

  private getPlatformPresets(): PlatformPreset[] {
    return [
      {
        id: 'tiktok',
        name: 'tiktok',
        displayName: 'TikTok',
        aspectRatio: 9/16,
        width: 1080,
        height: 1920,
        maxDuration: 60,
        cropStrategy: 'smart',
        audioRequired: true
      },
      {
        id: 'instagram-reels',
        name: 'instagram-reels',
        displayName: 'Instagram Reels',
        aspectRatio: 9/16,
        width: 1080,
        height: 1920,
        maxDuration: 90,
        cropStrategy: 'smart',
        audioRequired: true
      },
      {
        id: 'instagram-post',
        name: 'instagram-post',
        displayName: 'Instagram Post',
        aspectRatio: 1,
        width: 1080,
        height: 1080,
        maxDuration: 60,
        cropStrategy: 'center',
        audioRequired: false
      },
      {
        id: 'youtube-shorts',
        name: 'youtube-shorts',
        displayName: 'YouTube Shorts',
        aspectRatio: 9/16,
        width: 1080,
        height: 1920,
        maxDuration: 60,
        cropStrategy: 'smart',
        audioRequired: true
      },
      {
        id: 'linkedin',
        name: 'linkedin',
        displayName: 'LinkedIn',
        aspectRatio: 16/9,
        width: 1920,
        height: 1080,
        maxDuration: 600,
        cropStrategy: 'center',
        audioRequired: false
      },
      {
        id: 'twitter',
        name: 'twitter',
        displayName: 'Twitter',
        aspectRatio: 16/9,
        width: 1280,
        height: 720,
        maxDuration: 140,
        cropStrategy: 'center',
        audioRequired: false
      }
    ];
  }

  async processVideo(
    videoFile: VideoFile, 
    callback: (job: VideoProcessingJob) => void
  ): Promise<VideoProcessingJob> {
    console.log('VideoProcessingService: Starting video processing for', videoFile.name);
    
    // Ensure worker is ready before processing
    try {
      await this.initializeWorker();
    } catch (error) {
      console.error('VideoProcessingService: Worker not initialized, reinitializing...');
      throw new Error('Failed to initialize video processing worker');
    }
    
    if (!this.worker || !this.workerReady) {
      throw new Error('Worker not available after initialization');
    }
    
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: VideoProcessingJob = {
      id: jobId,
      videoFile,
      status: 'queued',
      steps: [
        {
          id: 'detect-scenes',
          name: 'Detect Scenes',
          description: 'Finding optimal clip boundaries...',
          progress: 0,
          status: 'pending'
        },
        {
          id: 'generate-clips',
          name: 'Generate Clips',
          description: 'Creating platform-specific clips...',
          progress: 0,
          status: 'pending'
        }
      ],
      scenes: [],
      clips: [],
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: videoFile.metadata
    };

    this.jobs.set(jobId, job);
    this.callbacks.set(jobId, callback);

    // Start processing
    job.status = 'processing';
    console.log('VideoProcessingService: Job created and starting processing', jobId);
    
    // Notify callback immediately with the created job
    callback(job);
    
    this.startNextStep(job);

    return job;
  }

  getJob(jobId: string): VideoProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.updatedAt = new Date();
      
      // Notify callback
      const callback = this.callbacks.get(jobId);
      if (callback) {
        callback(job);
      }
    }
  }

  retryJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'failed') {
      // Reset failed steps
      job.steps.forEach(step => {
        if (step.status === 'failed') {
          step.status = 'pending';
          step.progress = 0;
          step.error = undefined;
          step.startTime = undefined;
          step.endTime = undefined;
        }
      });

      job.status = 'processing';
      job.error = undefined;
      job.progress = 0;
      job.updatedAt = new Date();

      this.startNextStep(job);
    }
  }

  cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.jobs.clear();
    this.callbacks.clear();
  }

  private async generateThumbnailFromVideo(videoUrl: string, timeInSeconds: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate input parameters
      if (!videoUrl || typeof timeInSeconds !== 'number' || isNaN(timeInSeconds) || timeInSeconds < 0) {
        reject(new Error('Invalid parameters for thumbnail generation'));
        return;
      }
      
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // Ensure video can play without user interaction
      
      video.onloadedmetadata = () => {
        // Validate video dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          reject(new Error('Invalid video dimensions'));
          return;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Ensure time is within video bounds
        const seekTime = Math.min(Math.max(0, timeInSeconds), video.duration || 0);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          // Cleanup
          video.src = '';
          video.load();
          
          resolve(dataUrl);
        } catch (error) {
          console.error('VideoProcessingService: Error drawing video frame', error);
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for thumbnail generation'));
      };
      
      video.ontimeupdate = () => {
        // Fallback if onseeked doesn't fire
        if (Math.abs(video.currentTime - timeInSeconds) < 0.1) {
          video.ontimeupdate = null;
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Cleanup
            video.src = '';
            video.load();
            
            resolve(dataUrl);
          } catch (error) {
            reject(error);
          }
        }
      };

      video.src = videoUrl;
    });
  }

  generateClipsForJob(jobId: string, scenes: DetectedScene[], platforms: string[]): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('VideoProcessingService: Job not found for clip generation', jobId);
      return;
    }

    console.log('VideoProcessingService: Starting clip generation for job', jobId, scenes.length, 'scenes');
    
    // Validate scenes before processing
    const validScenes = scenes.filter(scene => {
      const isValid = scene && 
        typeof scene.startTime === 'number' && 
        typeof scene.endTime === 'number' && 
        typeof scene.duration === 'number' &&
        !isNaN(scene.startTime) && 
        !isNaN(scene.endTime) && 
        !isNaN(scene.duration) &&
        scene.startTime >= 0 &&
        scene.endTime > scene.startTime &&
        scene.duration > 0;
      
      if (!isValid) {
        console.warn('VideoProcessingService: Skipping invalid scene for clip generation', scene);
      }
      
      return isValid;
    });
    
    if (validScenes.length === 0) {
      console.error('VideoProcessingService: No valid scenes for clip generation');
      return;
    }
    
    // Update job with new scenes
    job.scenes = validScenes;
    job.clips = [];
    
    // Filter platforms to only include selected ones
    const allPresets = this.getPlatformPresets();
    const selectedPresets = allPresets.filter(preset => platforms.includes(preset.id));
    
    if (selectedPresets.length === 0) {
      console.error('VideoProcessingService: No valid platforms selected');
      return;
    }
    
    // Generate clips for selected platforms only
    this.generateClipsForPlatforms(job, selectedPresets);
  }

  private generateClipsForPlatforms(job: VideoProcessingJob, platforms: PlatformPreset[]) {
    console.log('VideoProcessingService: Generating clips for selected platforms', platforms.map(p => p.displayName));
    
    if (job.scenes.length === 0) {
      console.warn('VideoProcessingService: No scenes available for clip generation');
      return;
    }
    
    let totalClips = 0;
    
    job.scenes.forEach(scene => {
      platforms.forEach(preset => {
        const clipJob: ClipGenerationJob = {
          id: `clip_${scene.id}_${preset.id}`,
          videoId: job.videoFile.id,
          sceneId: scene.id,
          platform: preset.id,
          preset,
          status: 'pending',
          progress: 0,
          createdAt: new Date()
        };

        job.clips.push(clipJob);
        totalClips++;

        // Mark clip as processing
        clipJob.status = 'processing';

        // Start clip generation
        if (this.worker) {
          console.log('VideoProcessingService: Sending generateClip message for', preset.displayName);
          this.worker.postMessage({
            type: 'generateClip',
            data: {
              scene,
              preset,
              jobId: clipJob.id,
              stepId: clipJob.id
            }
          });
        }
      });
    });
    
    console.log('VideoProcessingService: Started generation of', totalClips, 'clips');
    
    // Update the generate-clips step
    const step = job.steps.find(s => s.id === 'generate-clips');
    if (step) {
      step.status = 'active';
      step.progress = 0;
      step.startTime = new Date();
    }

    // Update job progress and notify callback
    job.updatedAt = new Date();
    const callback = this.callbacks.get(job.id);
    if (callback) {
      callback(job);
    }
  }
}

// Singleton instance
export const videoProcessingService = new VideoProcessingService();