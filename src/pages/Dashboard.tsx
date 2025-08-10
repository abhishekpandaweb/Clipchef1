import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVideoProcessing } from '../hooks/useVideoProcessing';
import AdvancedFileUpload from '../components/AdvancedFileUpload';
import VideoProcessingQueue from '../components/VideoProcessingQueue';
import SceneDetectionPanel from '../components/SceneDetectionPanel';
import AIModelPanel from '../components/AIModelPanel';
import AdvancedSceneDetectionPanel from '../components/AdvancedSceneDetectionPanel';
import PlatformOptimizationPanel from '../components/PlatformOptimizationPanel';
import Breadcrumb from '../components/Breadcrumb';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { VideoProcessingJob, VideoFile, DetectedScene, SceneDetectionConfig } from '../types';
import { Video, Upload, Scissors, Brain, Target, Zap } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const {
    jobs,
    isProcessing,
    processVideo,
    generateClipsForJob,
    error
  } = useVideoProcessing();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'instagram-reels']);
  const [sceneConfig, setSceneConfig] = useState<SceneDetectionConfig>({
    sensitivity: 'medium',
    algorithms: {
      pixelDifference: { enabled: true, threshold: 0.3, weight: 1.0 },
      audioAmplitude: { enabled: true, threshold: 0.2, weight: 0.8 },
      colorHistogram: { enabled: true, threshold: 0.4, weight: 0.7 },
      motionVector: { enabled: true, threshold: 0.5, weight: 0.9 },
      faceDetection: { enabled: true, speakerChangeThreshold: 0.6, weight: 1.2 }
    },
    minSceneDuration: 5,
    maxScenes: 15,
    preserveContext: true,
    maintainNarrativeFlow: true
  });

  const selectedJob = selectedJobId ? jobs.find(job => job.id === selectedJobId) : null;

  useEffect(() => {
    if (error) {
      console.error('Dashboard: Error in useVideoProcessing:', error);
      addToast('An error occurred during video processing', 'error');
    }
  }, [error, addToast]);

  const handleFileUpload = async (files: VideoFile[]) => {
    try {
      setIsLoading(true);
      console.log('Dashboard: Starting file upload for:', files.length, 'files');
      
      // Process the first file
      const file = files[0];
      if (file) {
        const job = await processVideo(file);
        console.log('Dashboard: Video processing started, job:', job);
        
        setSelectedJobId(job.id);
        addToast('Video uploaded successfully! Processing started.', 'success');
      }
      
    } catch (error) {
      console.error('Dashboard: Error in handleFileUpload:', error);
      addToast('Failed to upload video. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateClips = async (scenes: DetectedScene[], platforms: string[]) => {
    if (!selectedJob) {
      addToast('Please select a video job first', 'error');
      return;
    }

    try {
      const sceneIds = scenes.filter(s => s != null && s.id != null).map(scene => scene.id);
      console.log('Dashboard: Generating clips for scenes:', sceneIds, 'platforms:', platforms);
      await generateClipsForJob(selectedJob.id, sceneIds, platforms);
      addToast('Clip generation started!', 'success');
    } catch (error) {
      console.error('Dashboard: Error generating clips:', error);
      addToast('Failed to generate clips. Please try again.', 'error');
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to ClipChef AI
          </h1>
          <p className="text-gray-600">
            Revolutionary browser-based AI video editing • Zero-server processing • Complete privacy
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Upload Section */}
          <div className="xl:col-span-1 space-y-6">
            {/* AI Models */}
            <AIModelPanel />
            
            {/* Upload */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Upload className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Upload Video</h2>
              </div>
              <AdvancedFileUpload
                onFileUpload={handleFileUpload}
                acceptedFormats={['mp4', 'mov', 'avi', 'webm', 'mkv']}
                maxFileSize={500}
              />
            </div>
          </div>

          {/* AI Configuration */}
          <div className="xl:col-span-1 space-y-6">
            {/* Advanced Scene Detection */}
            <AdvancedSceneDetectionPanel
              config={sceneConfig}
              onConfigChange={setSceneConfig}
            />
            
            {/* Platform Optimization */}
            <PlatformOptimizationPanel
              selectedPlatforms={selectedPlatforms}
              onPlatformToggle={handlePlatformToggle}
            />
          </div>

          {/* Processing & Results */}
          <div className="xl:col-span-2 space-y-6">
            {/* Processing Queue */}
            {jobs.length > 0 && (
              <VideoProcessingQueue />
            )}
            
            {/* Scene Detection Results */}
            {selectedJob ? (
              <SceneDetectionPanel
                scenes={selectedJob.scenes || []}
                onGenerateClips={(scenes) => handleGenerateClips(scenes, selectedPlatforms)}
                onScenesUpdate={() => {}}
              />
            ) : (
              <EmptyState
                icon={Brain}
                title="Ready for AI Processing"
                description="Upload a video to start the revolutionary AI-powered scene detection and clip generation process. All processing happens locally in your browser for complete privacy."
                actionText="Upload Your First Video"
                onAction={() => {
                  // Focus on upload area
                  const uploadElement = document.querySelector('[data-testid="file-upload"]');
                  if (uploadElement) {
                    uploadElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
            )}
          </div>
        </div>
        
        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Zero-Server AI
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Complete browser-based processing with WebLLM and Whisper.cpp. Your videos never leave your device.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Zap className="h-8 w-8 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Multi-Algorithm Detection
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              5 advanced algorithms working together: pixel analysis, audio detection, color histograms, motion vectors, and face recognition.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Target className="h-8 w-8 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Platform Optimization
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              AI-powered optimization for TikTok, Instagram, YouTube Shorts, LinkedIn, and more with viral potential scoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};