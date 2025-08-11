import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { VideoFile, UploadProgress } from '../types';
import { useToast } from '../contexts/ToastContext';

interface AdvancedFileUploadProps {
  onFileUpload: (files: VideoFile[]) => void;
  maxFileSize?: number; // in MB
  acceptedFormats?: string[];
}

const AdvancedFileUpload: React.FC<AdvancedFileUploadProps> = ({
  onFileUpload,
  maxFileSize = 500,
  acceptedFormats = ['mp4', 'mov', 'avi', 'webm', 'mkv']
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<VideoFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const validateFile = (file: File): string | null => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      return `Unsupported format. Please use: ${acceptedFormats.join(', ')}`;
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File too large. Maximum size is ${maxFileSize}MB`;
    }
    
    return null;
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = 320;
        canvas.height = (video.videoHeight / video.videoWidth) * 320;
        video.currentTime = Math.min(5, video.duration / 2); // Thumbnail at 5s or middle
      };
      
      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const simulateUpload = (videoFile: VideoFile) => {
    const progressId = videoFile.id;
    let progress = 0;
    const startTime = Date.now();
    
    const updateProgress = () => {
      progress += Math.random() * 15;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = (progress / 100) * videoFile.size / elapsed; // bytes per second
      const timeRemaining = ((100 - progress) / progress) * elapsed;
      
      setUploadProgress(prev => ({
        ...prev,
        [progressId]: {
          fileId: progressId,
          progress: Math.min(progress, 100),
          speed,
          timeRemaining,
          status: progress >= 100 ? 'processing' : 'uploading'
        }
      }));
      
      if (progress < 100) {
        setTimeout(updateProgress, 200 + Math.random() * 300);
      } else {
        // Simulate processing
        setTimeout(() => {
          setUploadProgress(prev => ({
            ...prev,
            [progressId]: {
              ...prev[progressId],
              status: 'completed',
              progress: 100
            }
          }));
          
          setUploadQueue(prev => 
            prev.map(file => 
              file.id === progressId 
                ? { ...file, status: 'completed' }
                : file
            )
          );
          
          // Don't show completion toast here - let the processing service handle it
          console.log('Upload simulation completed for:', videoFile.name);
        }, 2000);
      }
    };
    
    updateProgress();
  };

  const processFiles = useCallback(async (files: File[]) => {
    const validFiles: VideoFile[] = [];
    
    for (const file of files) {
      const error = validateFile(file);
      
      if (error) {
        addToast({
          type: 'error',
          title: 'Upload Error',
          message: `${file.name}: ${error}`
        });
        continue;
      }
      
      try {
        console.log('AdvancedFileUpload: Processing file', file.name);
        
        // Extract metadata on main thread
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        video.src = url;
        
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          setTimeout(() => reject(new Error('Metadata loading timeout')), 10000);
        });
        
        // Generate thumbnail on main thread
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = (video.videoHeight / video.videoWidth) * 320;
        video.currentTime = Math.min(5, video.duration / 2);
        
        await new Promise((resolve) => {
          video.onseeked = resolve;
        });
        
        let thumbnail = '';
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        }
        
        // Clean up
        URL.revokeObjectURL(url);
        
        const videoFile: VideoFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          originalName: file.name,
          size: file.size,
          duration: video.duration || 0,
          format: file.name.split('.').pop()?.toLowerCase() || '',
          thumbnail,
          url: URL.createObjectURL(file),
          uploadedAt: new Date(),
          status: 'uploading',
          progress: 0,
          metadata: {
            duration: video.duration || 0,
            width: video.videoWidth || 1920,
            height: video.videoHeight || 1080,
            fps: 30,
            bitrate: Math.round(file.size * 8 / (video.duration || 1)),
            format: file.name.split('.').pop() || 'mp4',
            size: file.size,
            aspectRatio: (video.videoWidth || 16) / (video.videoHeight || 9)
          }
        };
        
        validFiles.push(videoFile);
        console.log('AdvancedFileUpload: Created VideoFile object', videoFile.id);
      } catch (error) {
        console.error('AdvancedFileUpload: Thumbnail generation failed', error);
        addToast({
          type: 'error',
          title: 'Thumbnail Generation Failed',
          message: `Could not generate thumbnail for ${file.name}`
        });
      }
    }
    
    if (validFiles.length > 0) {
      console.log('AdvancedFileUpload: Adding files to upload queue', validFiles.length);
      setUploadQueue(prev => [...prev, ...validFiles]);
      
      // Start upload simulation for each file
      validFiles.forEach(simulateUpload);
      
      // Trigger actual video processing
      console.log('AdvancedFileUpload: Triggering video processing');
      onFileUpload(validFiles);
      
      console.log('AdvancedFileUpload: Processing initiated for', validFiles.length, 'files');
    }
  }, [addToast, onFileUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const removeFromQueue = (fileId: string) => {
    setUploadQueue(prev => prev.filter(file => file.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const retryUpload = (fileId: string) => {
    const file = uploadQueue.find(f => f.id === fileId);
    if (file) {
      setUploadQueue(prev => 
        prev.map(f => f.id === fileId ? { ...f, status: 'uploading' } : f)
      );
      simulateUpload(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="file-upload"
      >
        <div className="flex flex-col items-center">
          <div className={`p-4 rounded-full mb-4 transition-all ${
            isDragOver ? 'text-blue-500' : 'text-gray-400'
          } ${isDragOver ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Upload className="h-12 w-12" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {isDragOver ? 'Drop your videos here' : 'Upload your videos'}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-lg text-center">
            <strong>Drag and drop</strong> your video files here, or click the button below to browse. 
            <br />
            <span className="text-sm">
              Supports {acceptedFormats.join(', ').toUpperCase()} formats • Up to {maxFileSize}MB • Complete privacy
            </span>
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-3"
          >
            <Upload className="h-5 w-5" />
            <span>Choose Video Files</span>
          </button>
          
          <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>100% Private</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>AI Powered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Upload Queue ({uploadQueue.length})
          </h4>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadQueue.map((file) => {
              const progress = uploadProgress[file.id];
              
              return (
                <div key={file.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start space-x-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <img
                        src={file.thumbnail}
                        alt={file.name}
                        className="w-16 h-12 object-cover rounded bg-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {file.name}
                        </h5>
                        
                        <div className="flex items-center space-x-2">
                          {file.status === 'completed' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {file.status === 'failed' && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          {(file.status === 'uploading' || file.status === 'processing') && (
                            <Loader className="h-5 w-5 text-blue-500 animate-spin" />
                          )}
                          
                          <button
                            onClick={() => removeFromQueue(file.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>{formatFileSize(file.size)} • {file.format.toUpperCase()}</span>
                        <span className="capitalize">{file.status}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      {progress && (
                        <div className="space-y-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{Math.round(progress.progress)}%</span>
                            {progress.status === 'uploading' && (
                              <span>
                                {formatSpeed(progress.speed)} • {formatTime(progress.timeRemaining)} remaining
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Retry Button for Failed Uploads */}
                      {file.status === 'failed' && (
                        <button
                          onClick={() => retryUpload(file.id)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Retry Upload
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFileUpload;