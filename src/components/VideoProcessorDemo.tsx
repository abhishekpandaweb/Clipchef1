// VideoProcessorDemo.tsx - Demo component showcasing the video processor
import React, { useState, useRef } from 'react';
import { useVideoProcessor } from '../hooks/useVideoProcessor';
import { VideoMetadata, ThumbnailOptions, ConversionOptions } from '../services/VideoProcessingModule';
import { 
  Upload, 
  Play, 
  Scissors, 
  Download, 
  Image, 
  RefreshCw,
  FileVideo,
  Clock,
  Monitor,
  Zap
} from 'lucide-react';

const VideoProcessorDemo: React.FC = () => {
  const {
    isReady,
    isProcessing,
    currentOperation,
    progress,
    error,
    extractMetadata,
    generateThumbnail,
    convertFormat,
    trimVideo,
    splitVideo,
    formatDuration,
    formatFileSize,
    isSupportedFormat
  } = useVideoProcessor();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [thumbnails, setThumbnails] = useState<{ timestamp: number; blob: Blob }[]>([]);
  const [processedVideos, setProcessedVideos] = useState<{ name: string; blob: Blob }[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (isSupportedFormat(file.name.split('.').pop() || '')) {
        setSelectedFile(file);
        setMetadata(null);
        setThumbnails([]);
        setProcessedVideos([]);
      } else {
        alert('Unsupported video format');
      }
    }
  };

  const handleExtractMetadata = async () => {
    if (!selectedFile) return;

    try {
      const meta = await extractMetadata(selectedFile, (progress) => {
        console.log('Metadata extraction progress:', progress);
      });
      setMetadata(meta);
      setTrimEnd(Math.min(30, meta.duration));
    } catch (err) {
      console.error('Failed to extract metadata:', err);
    }
  };

  const handleGenerateThumbnails = async () => {
    if (!selectedFile || !metadata) return;

    try {
      const timestamps = [0, metadata.duration * 0.25, metadata.duration * 0.5, metadata.duration * 0.75];
      const newThumbnails = [];

      for (const timestamp of timestamps) {
        const options: ThumbnailOptions = {
          width: 160,
          height: 90,
          quality: 80,
          format: 'jpeg'
        };

        const blob = await generateThumbnail(selectedFile, timestamp, options);
        newThumbnails.push({ timestamp, blob });
      }

      setThumbnails(newThumbnails);
    } catch (err) {
      console.error('Failed to generate thumbnails:', err);
    }
  };

  const handleConvertFormat = async (targetFormat: string) => {
    if (!selectedFile) return;

    try {
      const options: ConversionOptions = {
        quality: 'medium',
        resolution: { width: 1280, height: 720 }
      };

      const blob = await convertFormat(selectedFile, targetFormat, options);
      setProcessedVideos(prev => [...prev, { 
        name: `converted.${targetFormat}`, 
        blob 
      }]);
    } catch (err) {
      console.error('Failed to convert format:', err);
    }
  };

  const handleTrimVideo = async () => {
    if (!selectedFile) return;

    try {
      const clip = await trimVideo(selectedFile, trimStart, trimEnd);
      setProcessedVideos(prev => [...prev, { 
        name: `trimmed_${trimStart}s-${trimEnd}s.mp4`, 
        blob: clip.blob 
      }]);
    } catch (err) {
      console.error('Failed to trim video:', err);
    }
  };

  const handleSplitVideo = async () => {
    if (!selectedFile || !metadata) return;

    try {
      const timestamps = [
        { start: 0, end: metadata.duration * 0.33, name: 'Part 1' },
        { start: metadata.duration * 0.33, end: metadata.duration * 0.66, name: 'Part 2' },
        { start: metadata.duration * 0.66, end: metadata.duration, name: 'Part 3' }
      ];

      const clips = await splitVideo(selectedFile, timestamps);
      
      clips.forEach((clip, index) => {
        setProcessedVideos(prev => [...prev, { 
          name: `${timestamps[index].name}.mp4`, 
          blob: clip.blob 
        }]);
      });
    } catch (err) {
      console.error('Failed to split video:', err);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Video Processor Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Powered by FFmpeg.wasm - All processing happens in your browser
        </p>
        
        <div className="flex items-center justify-center space-x-4 mt-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>{isReady ? 'Ready' : 'Initializing...'}</span>
          </div>
          
          {isProcessing && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{currentOperation} ({Math.round(progress)}%)</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* File Upload */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Upload Video
        </h2>
        
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          {selectedFile && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Extraction */}
      {selectedFile && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <FileVideo className="w-5 h-5 mr-2" />
            Video Information
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={handleExtractMetadata}
              disabled={!isReady || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Extract Metadata
            </button>
            
            {metadata && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                    <Clock className="w-4 h-4 mr-1" />
                    <span className="text-xs">Duration</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatDuration(metadata.duration)}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                    <Monitor className="w-4 h-4 mr-1" />
                    <span className="text-xs">Resolution</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {metadata.width}×{metadata.height}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                    <Zap className="w-4 h-4 mr-1" />
                    <span className="text-xs">FPS</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {metadata.fps}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                    <FileVideo className="w-4 h-4 mr-1" />
                    <span className="text-xs">Format</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {metadata.format.toUpperCase()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail Generation */}
      {metadata && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Image className="w-5 h-5 mr-2" />
            Thumbnails
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={handleGenerateThumbnails}
              disabled={!isReady || isProcessing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Generate Thumbnails
            </button>
            
            {thumbnails.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {thumbnails.map(({ timestamp, blob }, index) => (
                  <div key={index} className="space-y-2">
                    <img
                      src={URL.createObjectURL(blob)}
                      alt={`Thumbnail at ${formatDuration(timestamp)}`}
                      className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      {formatDuration(timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Operations */}
      {metadata && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Format Conversion */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Format Conversion
            </h3>
            
            <div className="space-y-2">
              {['webm', 'avi', 'mov'].map(format => (
                <button
                  key={format}
                  onClick={() => handleConvertFormat(format)}
                  disabled={!isReady || isProcessing}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Convert to {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Video Trimming */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Scissors className="w-4 h-4 mr-2" />
              Trim Video
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={metadata.duration}
                    value={trimStart}
                    onChange={(e) => setTrimStart(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End (seconds)
                  </label>
                  <input
                    type="number"
                    min={trimStart + 1}
                    max={metadata.duration}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              
              <button
                onClick={handleTrimVideo}
                disabled={!isReady || isProcessing || trimEnd <= trimStart}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Trim Video ({formatDuration(trimEnd - trimStart)})
              </button>
              
              <button
                onClick={handleSplitVideo}
                disabled={!isReady || isProcessing}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Split into 3 Parts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processed Videos */}
      {processedVideos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Processed Videos
          </h2>
          
          <div className="space-y-3">
            {processedVideos.map((video, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {video.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(video.blob.size)}
                  </p>
                </div>
                
                <button
                  onClick={() => downloadBlob(video.blob, video.name)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg min-w-80">
          <div className="flex items-center space-x-3 mb-2">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {currentOperation}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoProcessorDemo;