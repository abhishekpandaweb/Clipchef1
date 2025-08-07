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
            this.workerReady = true;
            resolve();
            return;
          }
          
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('VideoProcessingService: Worker error', error);
          this.workerReady = false;
          reject(error);
        };
        
        this.worker.onmessageerror = (error) => {
          console.error('VideoProcessingService: Worker message error', error);
          reject(error);
        };
        
        // Set a timeout in case worker doesn't respond
        setTimeout(() => {
          if (!this.workerReady) {
            console.log('VideoProcessingService: Worker ready timeout, pinging worker');
            this.worker?.postMessage({ type: 'ping', data: {} });
            
            // Give it another chance
            setTimeout(() => {
              if (!this.workerReady) {
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

  private handleStepComplete(job: VideoProcessingJob, stepId: string | undefined, data: any) {
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
      job.scenes = data.scenes;
    }

    if (data.clip) {
      // Update clip job
      const clipJob = job.clips.find(c => c.id === stepId);
      if (clipJob) {
        clipJob.status = 'completed';
        clipJob.outputUrl = data.clip.url;
        clipJob.thumbnail = data.clip.thumbnail;
        clipJob.completedAt = new Date();
      }
    }

    // Check if job is complete
    const allStepsComplete = job.steps.every(s => s.status === 'completed');
    if (allStepsComplete) {
      console.log('VideoProcessingService: Job completed', job.id);
      job.status = 'completed';
      job.progress = 100;
    } else {
      // Start next step
      this.startNextStep(job);
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
        const config: SceneDetectionConfig = {
          sensitivity: 'medium',
          pixelThreshold: 0.3,
          audioThreshold: 0.2,
          minSceneDuration: 5,
          maxScenes: 10
        };
        this.worker.postMessage({
          type: 'detectScenes',
          data: { 
            videoFile: videoFile, 
            config, 
            jobId: job.id, 
            stepId: step.id,
            metadata: job.metadata
          }
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
    let completedClips = 0;
    
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

        // Start clip generation
        if (this.worker) {
          console.log('VideoProcessingService: Sending generateClip message for', preset.displayName);
          this.worker.postMessage({
            type: 'generateClip',
            data: {
              videoFile: job.videoFile,
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
    
    // Update the generate-clips step progress
    const step = job.steps.find(s => s.id === 'generate-clips');
    if (step) {
      step.status = 'active';
      step.progress = 0;
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
  ): Promise<string> {
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
    this.startNextStep(job);

    return jobId;
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
}

// Singleton instance
export const videoProcessingService = new VideoProcessingService();