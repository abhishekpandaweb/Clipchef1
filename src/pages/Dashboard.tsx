import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVideoProcessing } from '../hooks/useVideoProcessing';
import AdvancedFileUpload from '../components/AdvancedFileUpload';
import VideoProcessingQueue from '../components/VideoProcessingQueue';
import SceneDetectionPanel from '../components/SceneDetectionPanel';
import AIModelPanel from '../components/AIModelPanel';
import AdvancedSceneDetectionPanel from '../components/AdvancedSceneDetectionPanel';
import PlatformOptimizationPanel from '../components/PlatformOptimizationPanel';
import ClipGenerationPanel from '../components/ClipGenerationPanel';
import Breadcrumb from '../components/Breadcrumb';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { VideoProcessingJob, VideoFile, DetectedScene, SceneDetectionConfig } from '../types';
import { GeneratedClip } from '../services/ClipGenerator';
import { Video, Upload, Scissors, Brain, Target, Zap, X, Settings, CheckCircle } from 'lucide-react';

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
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'process' | 'results'>('upload');
  const [generatedClips, setGeneratedClips] = useState<GeneratedClip[]>([]);
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
      const validScenes = scenes.filter(s => s != null && s.id != null);
      console.log('Dashboard: Generating clips for scenes:', validScenes.map(s => s.id), 'platforms:', platforms);
      await generateClipsForJob(selectedJob.id, validScenes, platforms);
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

  const handleClipsGenerated = (clips: GeneratedClip[]) => {
    setGeneratedClips(prev => [...prev, ...clips]);
    setCurrentStep('results');
    addToast({
      type: 'success',
      title: 'Clips Generated Successfully',
      message: `Generated ${clips.length} optimized clips`
    });
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
        
        {/* Welcome Section */}
        {showWelcome && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white relative overflow-hidden">
            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-4">
                Welcome to ClipChef AI 🚀
              </h1>
              <p className="text-xl mb-6 text-blue-100">
                Transform your long-form videos into viral clips with revolutionary AI technology
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <Brain className="h-8 w-8 mb-2" />
                  <h3 className="font-semibold mb-1">Zero-Server AI</h3>
                  <p className="text-sm text-blue-100">Complete privacy - videos never leave your device</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <Zap className="h-8 w-8 mb-2" />
                  <h3 className="font-semibold mb-1">Multi-Algorithm Detection</h3>
                  <p className="text-sm text-blue-100">5 AI algorithms working together for perfect scenes</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <Target className="h-8 w-8 mb-2" />
                  <h3 className="font-semibold mb-1">Platform Optimization</h3>
                  <p className="text-sm text-blue-100">Optimized for TikTok, Instagram, YouTube & more</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setShowWelcome(false);
                    setCurrentStep('upload');
                  }}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Get Started
                </button>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="text-white/80 hover:text-white px-6 py-3 rounded-lg border border-white/20 hover:border-white/40 transition-colors"
                >
                  Skip Tour
                </button>
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full"></div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Create Viral Clips in 3 Steps
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep === 'upload' ? '1' : currentStep === 'configure' ? '2' : '3'} of 3
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            {[
              { id: 'upload', label: 'Upload Video', icon: Upload },
              { id: 'configure', label: 'Configure AI', icon: Settings },
              { id: 'process', label: 'Generate Clips', icon: Scissors }
            ].map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = 
                (step.id === 'upload' && jobs.length > 0) ||
                (step.id === 'configure' && selectedJob?.scenes.length > 0) ||
                (step.id === 'process' && selectedJob?.clips.length > 0);
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : isCompleted
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <step.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                    {isCompleted && <CheckCircle className="h-4 w-4" />}
                  </div>
                  {index < 2 && (
                    <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="space-y-6">
            {/* AI Models */}
            <AIModelPanel />
            
            {/* Upload */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 p-6 transition-colors ${
              currentStep === 'upload' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center mb-4">
                <Upload className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Step 1: Upload Your Video
                </h2>
              </div>
              
              {jobs.length === 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    💡 <strong>Tip:</strong> Upload podcasts, interviews, tutorials, or any long-form content to get started!
                  </p>
                </div>
              )}
              
              <AdvancedFileUpload
                onFileUpload={(files) => {
                  handleFileUpload(files);
                  setCurrentStep('configure');
                }}
                acceptedFormats={['mp4', 'mov', 'avi', 'webm', 'mkv']}
                maxFileSize={500}
              />
              
              {jobs.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Video uploaded successfully!</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-6">
            {/* Advanced Scene Detection */}
            <div className={`transition-colors ${
              currentStep === 'configure' ? 'ring-2 ring-blue-200 dark:ring-blue-800 rounded-lg' : ''
            }`}>
              <AdvancedSceneDetectionPanel
                config={sceneConfig}
                onConfigChange={(config) => {
                  setSceneConfig(config);
                  if (currentStep === 'configure') {
                    setCurrentStep('process');
                  }
                }}
              />
            </div>
            
            {/* Platform Optimization */}
            <div className={`transition-colors ${
              currentStep === 'process' ? 'ring-2 ring-blue-200 dark:ring-blue-800 rounded-lg' : ''
            }`}>
              <PlatformOptimizationPanel
                selectedPlatforms={selectedPlatforms}
                onPlatformToggle={handlePlatformToggle}
              />
            </div>
          </div>

          {/* Processing & Results */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {selectedJob && selectedJob.scenes.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  🎉 Scenes Detected Successfully!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Found {selectedJob.scenes.length} potential clips. Ready to generate platform-optimized videos?
                </p>
                
                {/* Intelligent Clip Generation */}
                <ClipGenerationPanel
                  videoFile={selectedJob.videoFile.url ? await fetch(selectedJob.videoFile.url).then(r => r.blob()) : null}
                  scenes={selectedJob.scenes}
                  platforms={allPresets.filter(preset => selectedPlatforms.includes(preset.id))}
                  onClipsGenerated={handleClipsGenerated}
                />
              </div>
            )}
            
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
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="max-w-md mx-auto">
                  <Brain className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Ready for AI Magic ✨
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Upload a video to start the revolutionary AI-powered scene detection and clip generation process. 
                    All processing happens locally in your browser for complete privacy.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="font-medium text-blue-900 dark:text-blue-400">🔒 Private</div>
                      <div className="text-blue-700 dark:text-blue-300">Videos never leave your device</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="font-medium text-purple-900 dark:text-purple-400">🚀 Fast</div>
                      <div className="text-purple-700 dark:text-purple-300">AI processing in your browser</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generated Clips Results */}
        {generatedClips.length > 0 && (
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🎬 Generated Clips ({generatedClips.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedClips.map((clip) => (
                <div key={clip.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <img
                    src={clip.thumbnail}
                    alt={`${clip.platform} clip`}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {clip.platform.charAt(0).toUpperCase() + clip.platform.slice(1)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                        {Math.round(clip.qualityScore * 100)}% quality
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(clip.duration)}s • {clip.metadata.width}×{clip.metadata.height}
                    </div>
                    
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(clip.blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${clip.platform}_clip_${Date.now()}.mp4`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Download Clip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Help Section */}
        <div className="mt-12 bg-gray-100 dark:bg-gray-800 rounded-xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Need Help Getting Started? 🤔
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">📹 Best Video Types</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Podcasts & interviews</li>
                <li>• Educational content</li>
                <li>• Webinars & presentations</li>
                <li>• Long-form tutorials</li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">⚡ Quick Tips</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Upload videos up to 500MB</li>
                <li>• AI works best with clear audio</li>
                <li>• Processing happens locally</li>
                <li>• No internet needed after setup</li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">🎯 Platform Tips</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• TikTok: 15-30s clips work best</li>
                <li>• Instagram: Square format for posts</li>
                <li>• YouTube: Vertical for Shorts</li>
                <li>• LinkedIn: Professional tone</li>
              </ul>
            </div>
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

  // Helper function to get all platform presets
  const allPresets = [
    {
      id: 'tiktok',
      name: 'tiktok',
      displayName: 'TikTok',
      aspectRatio: 9/16,
      width: 1080,
      height: 1920,
      maxDuration: 60,
      cropStrategy: 'face-tracking' as const,
      audioRequired: true,
      optimizations: {
        hookDuration: 3,
        engagementBoosts: ['auto-captions', 'trending-sounds', 'viral-effects'],
        algorithmFriendly: true,
        trendingFormats: ['quick-tips', 'before-after', 'storytelling'],
        captionStyle: 'trendy' as const
      },
      contentGuidelines: {
        preferredLength: 30,
        idealPacing: 'fast' as const,
        attentionSpan: 8,
        viralElements: ['hooks', 'surprises', 'call-to-action']
      }
    },
    {
      id: 'instagram-reels',
      name: 'instagram-reels',
      displayName: 'Instagram Reels',
      aspectRatio: 9/16,
      width: 1080,
      height: 1920,
      maxDuration: 90,
      cropStrategy: 'smart' as const,
      audioRequired: true,
      optimizations: {
        hookDuration: 3,
        engagementBoosts: ['trending-audio', 'hashtag-optimization', 'story-integration'],
        algorithmFriendly: true,
        trendingFormats: ['tutorials', 'behind-scenes', 'transformations'],
        captionStyle: 'engaging' as const
      },
      contentGuidelines: {
        preferredLength: 45,
        idealPacing: 'fast' as const,
        attentionSpan: 10,
        viralElements: ['visual-appeal', 'trending-topics', 'shareability']
      }
    }
    // Add other presets as needed
  ];
};