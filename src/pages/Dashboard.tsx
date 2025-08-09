import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVideoProcessing } from '../hooks/useVideoProcessing';
import AdvancedFileUpload from '../components/AdvancedFileUpload';
import { VideoProcessingQueue } from '../components/VideoProcessingQueue';
import { SceneDetectionPanel } from '../components/SceneDetectionPanel';
import { Breadcrumb } from '../components/Breadcrumb';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { VideoProcessingJob } from '../types';
import { Video, Upload, Scissors } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    jobs,
    isProcessing,
    processVideo,
    generateClipsForJob,
    error
  } = useVideoProcessing();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedJob = selectedJobId ? jobs.find(job => job.id === selectedJobId) : null;

  useEffect(() => {
    if (error) {
      console.error('Dashboard: Error in useVideoProcessing:', error);
      showToast('An error occurred during video processing', 'error');
    }
  }, [error, showToast]);

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      console.log('Dashboard: Starting file upload for:', file.name);
      
      const job = await processVideo(file);
      console.log('Dashboard: Video processing started, job:', job);
      
      setSelectedJobId(job.id);
      showToast('Video uploaded successfully! Processing started.', 'success');
    } catch (error) {
      console.error('Dashboard: Error in handleFileUpload:', error);
      showToast('Failed to upload video. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateClips = async (sceneIds: string[], platforms: string[]) => {
    if (!selectedJob) {
      showToast('Please select a video job first', 'error');
      return;
    }

    try {
      console.log('Dashboard: Generating clips for scenes:', sceneIds, 'platforms:', platforms);
      await generateClipsForJob(selectedJob.id, sceneIds, platforms);
      showToast('Clip generation started!', 'success');
    } catch (error) {
      console.error('Dashboard: Error generating clips:', error);
      showToast('Failed to generate clips. Please try again.', 'error');
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.email}
          </h1>
          <p className="text-gray-600">
            Upload videos and generate clips for social media platforms
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Upload className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Upload Video</h2>
              </div>
              <AdvancedFileUpload
                onFileUpload={handleFileUpload}
                isProcessing={isProcessing}
                accept="video/*"
                maxSize={500 * 1024 * 1024} // 500MB
              />
            </div>

            {/* Processing Queue */}
            {jobs.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Video className="w-5 h-5 text-green-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Processing Queue</h2>
                </div>
                <VideoProcessingQueue
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onJobSelect={setSelectedJobId}
                />
              </div>
            )}
          </div>

          {/* Scene Detection and Clips */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Scissors className="w-5 h-5 text-purple-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Scene Detection & Clips</h2>
                </div>
                <SceneDetectionPanel
                  job={selectedJob}
                  onGenerateClips={handleGenerateClips}
                />
              </div>
            ) : (
              <EmptyState
                icon={Video}
                title="No video selected"
                description="Upload a video or select one from the processing queue to view scenes and generate clips."
                action={{
                  label: "Upload Video",
                  onClick: () => {
                    // Focus on upload area
                    const uploadElement = document.querySelector('[data-testid="file-upload"]');
                    if (uploadElement) {
                      uploadElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};