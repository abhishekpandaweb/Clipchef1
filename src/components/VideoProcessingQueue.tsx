import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Loader,
  ChevronDown,
  ChevronRight,
  Download,
  Eye
} from 'lucide-react';
import { VideoProcessingJob, ProcessingStep, ClipGenerationJob } from '../types/video';
import { useVideoProcessing } from '../hooks/useVideoProcessing';
import LoadingSpinner from './LoadingSpinner';

interface VideoProcessingQueueProps {
  className?: string;
}

const VideoProcessingQueue: React.FC<VideoProcessingQueueProps> = ({ className = '' }) => {
  const {
    jobs,
    activeJobs,
    completedJobs,
    failedJobs,
    isProcessing,
    cancelJob,
    retryJob,
    clearCompletedJobs,
    totalProgress
  } = useVideoProcessing();

  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed' | 'failed'>('active');

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'active':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getJobsForTab = () => {
    switch (selectedTab) {
      case 'active':
        return activeJobs;
      case 'completed':
        return completedJobs;
      case 'failed':
        return failedJobs;
      default:
        return activeJobs;
    }
  };

  const renderJobCard = (job: VideoProcessingJob) => {
    const isExpanded = expandedJobs.has(job.id);
    const currentStep = job.steps.find(s => s.status === 'active');

    return (
      <div key={job.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        {/* Job Header */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleJobExpansion(job.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              
              <div className="flex-shrink-0">
                <img
                  src={job.videoFile.thumbnail}
                  alt={job.videoFile.name}
                  className="w-12 h-9 object-cover rounded bg-gray-100 dark:bg-gray-700"
                />
              </div>
              
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {job.videoFile.name}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(job.videoFile.size)}</span>
                  <span>•</span>
                  <span>{job.videoFile.format.toUpperCase()}</span>
                  {job.metadata && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(job.metadata.duration)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Status Badge */}
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                job.status === 'completed' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : job.status === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : job.status === 'processing'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
              }`}>
                {job.status === 'processing' && currentStep 
                  ? currentStep.name 
                  : job.status.charAt(0).toUpperCase() + job.status.slice(1)
                }
              </div>

              {/* Action Buttons */}
              {job.status === 'processing' && (
                <button
                  onClick={() => cancelJob(job.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              
              {job.status === 'failed' && (
                <button
                  onClick={() => retryJob(job.id)}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  title="Retry"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {(job.status === 'processing' || job.status === 'queued') && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{currentStep?.description || 'Queued...'}</span>
                <span>{Math.round(job.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            {/* Processing Steps */}
            <div className="p-4">
              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Processing Steps
              </h5>
              <div className="space-y-2">
                {job.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    {getStepIcon(step)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {step.name}
                        </span>
                        {step.status === 'active' && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round(step.progress)}%
                          </span>
                        )}
                      </div>
                      {step.status === 'active' && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      )}
                      {step.error && (
                        <p className="text-xs text-red-500 mt-1">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Clips */}
            {job.clips.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Generated Clips ({job.clips.filter(c => c.status === 'completed').length}/{job.clips.length})
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {job.clips.map((clip) => (
                    <ClipCard key={clip.id} clip={clip} />
                  ))}
                </div>
              </div>
            )}

            {/* Detected Scenes */}
            {job.scenes.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Detected Scenes ({job.scenes.length})
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {job.scenes.map((scene) => (
                    <div key={scene.id} className="relative">
                      <img
                        src={scene.thumbnail}
                        alt={`Scene ${scene.id}`}
                        className="w-full h-20 object-cover rounded bg-gray-100 dark:bg-gray-700"
                      />
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                        {formatDuration(scene.startTime)}
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                        {Math.round(scene.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (jobs.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <Loader className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Processing Jobs
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Upload videos to start processing them into clips
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Processing Queue
          </h3>
          
          {isProcessing && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <LoadingSpinner size="sm" />
              <span>Processing {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Overall Progress */}
        {isProcessing && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(totalProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-4">
          {[
            { id: 'active', label: 'Active', count: activeJobs.length },
            { id: 'completed', label: 'Completed', count: completedJobs.length },
            { id: 'failed', label: 'Failed', count: failedJobs.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Actions */}
      {selectedTab === 'completed' && completedJobs.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={clearCompletedJobs}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Clear All Completed
          </button>
        </div>
      )}

      {/* Job List */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {getJobsForTab().map(renderJobCard)}
      </div>
    </div>
  );
};

// Clip Card Component
const ClipCard: React.FC<{ clip: ClipGenerationJob }> = ({ clip }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="relative bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {clip.preset.displayName}
        </span>
        <div className={`w-2 h-2 rounded-full ${
          clip.status === 'completed' 
            ? 'bg-green-500' 
            : clip.status === 'failed'
            ? 'bg-red-500'
            : 'bg-blue-500'
        }`} />
      </div>
      
      {clip.thumbnail && (
        <img
          src={clip.thumbnail}
          alt={`${clip.preset.displayName} clip`}
          className="w-full h-16 object-cover rounded bg-gray-100 dark:bg-gray-600"
        />
      )}
      
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {clip.preset.width}×{clip.preset.height}
        </span>
        
        {clip.status === 'completed' && clip.outputUrl && (
          <div className="flex space-x-1">
            <button
              onClick={() => setShowPreview(true)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Preview"
            >
              <Eye className="h-3 w-3" />
            </button>
            <a
              href={clip.outputUrl}
              download
              className="text-gray-400 hover:text-green-500 transition-colors"
              title="Download"
            >
              <Download className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
      
      {clip.status === 'processing' && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${clip.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoProcessingQueue;