import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVideoProcessing } from '../hooks/useVideoProcessing';
import { useToast } from '../contexts/ToastContext';
import { VideoFile, DetectedScene } from '../types/video';
import AdvancedFileUpload from '../components/AdvancedFileUpload';
import VideoProcessingQueue from '../components/VideoProcessingQueue';
import SceneDetectionPanel from '../components/SceneDetectionPanel';
import Breadcrumb from '../components/Breadcrumb';
import { 
  Upload, 
  Video, 
  Scissors, 
  Download, 
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { processVideo, jobs, activeJobs, completedJobs, failedJobs, isProcessing } = useVideoProcessing();
  const { addToast } = useToast();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (files: VideoFile[]) => {
    console.log('Dashboard: handleFileUpload called with', files.length, 'files');
    try {
      for (const file of files) {
        console.log('Dashboard: Processing file', file.name);
        await processVideo(file);
        console.log('Dashboard: processVideo completed for', file.name);
      }
    } catch (error) {
      console.error('Dashboard: Error in handleFileUpload', error);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to start processing videos',
        duration: 5000
      });
    }
  }, [processVideo, addToast]);

  const handleScenesUpdate = useCallback((scenes: DetectedScene[]) => {
    // Update scenes in the selected job
    if (selectedJob) {
      // This would typically update the job in the processing service
      console.log('Updating scenes for job:', selectedJob, scenes);
    }
  }, [selectedJob]);

  const handleGenerateClips = useCallback((scenes: DetectedScene[], platforms: string[]) => {
    if (!selectedJobData) {
      addToast({
        type: 'error',
        title: 'No Job Selected',
        message: 'Please select a job to generate clips for',
        duration: 3000
      });
      return;
    }

    // Update the job with new scenes and trigger clip generation
    const updatedJob = {
      ...selectedJobData,
      scenes: scenes,
      clips: [] // Reset clips to regenerate
    };

    // Start clip generation by updating the job and triggering the generate-clips step
    const { generateClipsForJob } = useVideoProcessing();
    generateClipsForJob(updatedJob.id, scenes, platforms);

    addToast({
      type: 'info',
      title: 'Generating Clips',
      message: `Creating ${scenes.length * platforms.length} clips for ${platforms.length} platforms`,
      duration: 3000
    });
  }, [selectedJobData, generateClipsForJob, addToast]);
  }, [addToast]);

  const stats = [
    {
      name: 'Videos Processed',
      value: completedJobs.length,
      icon: Video,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
    },
    {
      name: 'Active Jobs',
      value: activeJobs.length,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
    },
    {
      name: 'Clips Generated',
      value: completedJobs.reduce((sum, job) => sum + job.clips.filter(c => c.status === 'completed').length, 0),
      icon: Scissors,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/20'
    },
    {
      name: 'Failed Jobs',
      value: failedJobs.length,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/20'
    }
  ];

  const selectedJobData = selectedJob ? jobs.find(j => j.id === selectedJob) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Dashboard' }
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Transform your videos into engaging clips for social media platforms
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Queue */}
          <div className="lg:col-span-2 space-y-8">
            {/* File Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Upload className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Upload Videos
                </h2>
              </div>
              
              <AdvancedFileUpload
                onFileUpload={handleFileUpload}
                maxFileSize={500}
                acceptedFormats={['mp4', 'mov', 'avi', 'webm', 'mkv']}
              />
            </div>

            {/* Processing Queue */}
            <VideoProcessingQueue />
          </div>

          {/* Right Column - Scene Detection */}
          <div className="space-y-8">
            {/* Job Selection */}
            {jobs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Select Job for Scene Editing
                </h3>
                <select
                  value={selectedJob || ''}
                  onChange={(e) => setSelectedJob(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a job...</option>
                  {jobs
                    .filter(job => job.scenes.length > 0)
                    .map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.videoFile.name} ({job.scenes.length} scenes)
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Scene Detection Panel */}
            <SceneDetectionPanel
              scenes={selectedJobData?.scenes || []}
              onScenesUpdate={handleScenesUpdate}
              onGenerateClips={handleGenerateClips}
            />
          </div>
        </div>

        {/* Recent Activity */}
        {jobs.length > 0 && (
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Recent Activity
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={job.videoFile.thumbnail}
                        alt={job.videoFile.name}
                        className="w-12 h-9 object-cover rounded bg-gray-100 dark:bg-gray-600"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {job.videoFile.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {job.scenes.length} scenes • {job.clips.filter(c => c.status === 'completed').length} clips generated
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : job.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : job.status === 'processing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </div>
                      
                      {job.status === 'completed' && (
                        <button
                          onClick={() => setSelectedJob(job.id)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          View Clips
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {jobs.length === 0 && (
          <div className="mt-8 text-center py-12">
            <Video className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No videos uploaded yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Upload your first video to start creating engaging clips for social media
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;