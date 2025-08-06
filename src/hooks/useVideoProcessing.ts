import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoFile, VideoProcessingJob, SceneDetectionConfig } from '../types/video';
import { videoProcessingService } from '../services/VideoProcessingService';
import { useToast } from '../contexts/ToastContext';

export interface UseVideoProcessingReturn {
  jobs: VideoProcessingJob[];
  activeJobs: VideoProcessingJob[];
  completedJobs: VideoProcessingJob[];
  failedJobs: VideoProcessingJob[];
  isProcessing: boolean;
  processVideo: (videoFile: VideoFile) => Promise<string>;
  cancelJob: (jobId: string) => void;
  retryJob: (jobId: string) => void;
  getJob: (jobId: string) => VideoProcessingJob | undefined;
  clearCompletedJobs: () => void;
  totalProgress: number;
}

export const useVideoProcessing = (): UseVideoProcessingReturn => {
  const [jobs, setJobs] = useState<VideoProcessingJob[]>([]);
  const jobsRef = useRef<Map<string, VideoProcessingJob>>(new Map());
  const { addToast } = useToast();

  const updateJob = useCallback((updatedJob: VideoProcessingJob) => {
    jobsRef.current.set(updatedJob.id, updatedJob);
    setJobs(Array.from(jobsRef.current.values()));

    // Show toast notifications for status changes
    if (updatedJob.status === 'completed') {
      addToast({
        type: 'success',
        title: 'Processing Complete',
        message: `${updatedJob.videoFile.name} has been processed successfully`,
        duration: 5000
      });
    } else if (updatedJob.status === 'failed') {
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: `Failed to process ${updatedJob.videoFile.name}: ${updatedJob.error}`,
        duration: 8000
      });
    }
  }, [addToast]);

  const processVideo = useCallback(async (videoFile: VideoFile): Promise<string> => {
    try {
      const jobId = await videoProcessingService.processVideo(videoFile, updateJob);
      
      addToast({
        type: 'info',
        title: 'Processing Started',
        message: `Started processing ${videoFile.name}`,
        duration: 3000
      });

      return jobId;
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Processing Error',
        message: `Failed to start processing: ${error}`,
        duration: 5000
      });
      throw error;
    }
  }, [updateJob, addToast]);

  const cancelJob = useCallback((jobId: string) => {
    videoProcessingService.cancelJob(jobId);
    addToast({
      type: 'warning',
      title: 'Job Cancelled',
      message: 'Processing has been cancelled',
      duration: 3000
    });
  }, [addToast]);

  const retryJob = useCallback((jobId: string) => {
    videoProcessingService.retryJob(jobId);
    addToast({
      type: 'info',
      title: 'Retrying Processing',
      message: 'Attempting to process the video again',
      duration: 3000
    });
  }, [addToast]);

  const getJob = useCallback((jobId: string): VideoProcessingJob | undefined => {
    return jobsRef.current.get(jobId);
  }, []);

  const clearCompletedJobs = useCallback(() => {
    const completedJobIds = Array.from(jobsRef.current.values())
      .filter(job => job.status === 'completed')
      .map(job => job.id);

    completedJobIds.forEach(id => jobsRef.current.delete(id));
    setJobs(Array.from(jobsRef.current.values()));

    addToast({
      type: 'info',
      title: 'Jobs Cleared',
      message: `Cleared ${completedJobIds.length} completed jobs`,
      duration: 3000
    });
  }, [addToast]);

  // Computed values
  const activeJobs = jobs.filter(job => 
    job.status === 'processing' || job.status === 'queued'
  );
  
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');
  const isProcessing = activeJobs.length > 0;

  const totalProgress = jobs.length > 0 
    ? jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length 
    : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoProcessingService.cleanup();
    };
  }, []);

  return {
    jobs,
    activeJobs,
    completedJobs,
    failedJobs,
    isProcessing,
    processVideo,
    cancelJob,
    retryJob,
    getJob,
    clearCompletedJobs,
    totalProgress
  };
};