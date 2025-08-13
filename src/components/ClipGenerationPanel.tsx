import React, { useState } from 'react';
import { 
  Scissors, 
  Download, 
  Play, 
  Eye, 
  Star, 
  TrendingUp,
  Clock,
  Target,
  Zap,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useClipGenerator } from '../hooks/useClipGenerator';
import { DetectedScene, PlatformPreset } from '../types/video';
import { GeneratedClip, ClipGenerationOptions } from '../services/ClipGenerator';
import LoadingSpinner from './LoadingSpinner';

interface ClipGenerationPanelProps {
  videoFile: File | Blob | null;
  scenes: DetectedScene[];
  platforms: PlatformPreset[];
  onClipsGenerated?: (clips: GeneratedClip[]) => void;
  className?: string;
}

const ClipGenerationPanel: React.FC<ClipGenerationPanelProps> = ({
  videoFile,
  scenes,
  platforms,
  onClipsGenerated,
  className = ''
}) => {
  const {
    isGenerating,
    generatedClips,
    progress,
    error,
    generateClips,
    clearClips,
    downloadClip,
    getQualityMetrics
  } = useClipGenerator();

  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = useState<ClipGenerationOptions>({
    preserveAudio: true,
    addCaptions: false,
    enhanceQuality: true,
    smartCropping: true,
    batchSize: 3
  });

  const handleGenerateClips = async () => {
    if (!videoFile || scenes.length === 0 || platforms.length === 0) {
      return;
    }

    try {
      const clips = await generateClips(videoFile, scenes, platforms, options);
      onClipsGenerated?.(clips);
    } catch (error) {
      console.error('Failed to generate clips:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
  };

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'tiktok': return '📱';
      case 'instagram-reels': return '📸';
      case 'instagram-post': return '🟦';
      case 'youtube-shorts': return '▶️';
      case 'linkedin': return '💼';
      case 'twitter': return '🐦';
      default: return '🎬';
    }
  };

  const qualityMetrics = getQualityMetrics();
  const canGenerate = videoFile && scenes.length > 0 && platforms.length > 0 && !isGenerating;
  const totalClipsToGenerate = scenes.length * platforms.length;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Scissors className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Intelligent Clip Generation
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-powered platform-optimized video clips
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {qualityMetrics && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {generatedClips.length} clips • Avg quality: {Math.round(qualityMetrics.averageQuality * 100)}%
              </div>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Generation Options
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Preserve Audio</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.preserveAudio}
                    onChange={(e) => setOptions(prev => ({ ...prev, preserveAudio: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Smart Cropping</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.smartCropping}
                    onChange={(e) => setOptions(prev => ({ ...prev, smartCropping: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Enhance Quality</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.enhanceQuality}
                    onChange={(e) => setOptions(prev => ({ ...prev, enhanceQuality: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Batch Size: {options.batchSize}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={options.batchSize}
                  onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Ready to generate {totalClipsToGenerate} clips from {scenes.length} scenes across {platforms.length} platforms
          </div>
          
          <div className="flex space-x-2">
            {generatedClips.length > 0 && (
              <button
                onClick={clearClips}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
            )}
            
            <button
              onClick={handleGenerateClips}
              disabled={!canGenerate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Generate Clips</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Display */}
      {isGenerating && progress.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Generation Progress
          </h4>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {progress.map((item) => (
              <div key={item.clipId} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span>{getPlatformIcon(item.platform)}</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {item.platform} - Scene {item.sceneId}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 w-8">
                    {Math.round(item.progress)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Generation Failed</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      {/* Quality Metrics */}
      {qualityMetrics && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-3">
            <BarChart3 className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Quality Metrics
            </h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(qualityMetrics.averageQuality * 100)}%
              </div>
              <div className="text-gray-500 dark:text-gray-400">Avg Quality</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {qualityMetrics.qualityDistribution.excellent}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Excellent</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {formatDuration(qualityMetrics.averageDuration)}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Avg Duration</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {Object.keys(qualityMetrics.platformDistribution).length}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Platforms</div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Clips */}
      <div className="p-4">
        {generatedClips.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Clips Generated Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Generate clips from your detected scenes to see them here
            </p>
          </div>
        ) : (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              Generated Clips ({generatedClips.length})
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedClips.map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  onDownload={() => downloadClip(clip)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Clip Card Component
const ClipCard: React.FC<{
  clip: GeneratedClip;
  onDownload: () => void;
}> = ({ clip, onDownload }) => {
  const [showPreview, setShowPreview] = useState(false);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
  };

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'tiktok': return '📱';
      case 'instagram-reels': return '📸';
      case 'instagram-post': return '🟦';
      case 'youtube-shorts': return '▶️';
      case 'linkedin': return '💼';
      case 'twitter': return '🐦';
      default: return '🎬';
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      {/* Thumbnail */}
      <div className="relative mb-3">
        <img
          src={clip.thumbnail}
          alt={`${clip.platform} clip`}
          className="w-full h-32 object-cover rounded bg-gray-100 dark:bg-gray-600"
        />
        
        <div className="absolute top-2 left-2 flex items-center space-x-1">
          <span className="text-lg">{getPlatformIcon(clip.platform)}</span>
          <span className="text-xs bg-black/70 text-white px-2 py-1 rounded">
            {clip.platform}
          </span>
        </div>
        
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(clip.duration)}
        </div>
      </div>

      {/* Clip Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Scene {clip.sceneId}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getQualityColor(clip.qualityScore)}`}>
            {Math.round(clip.qualityScore * 100)}% quality
          </span>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {clip.metadata.width}×{clip.metadata.height} • {Math.round(clip.aspectRatio * 100) / 100}:1
        </div>
        
        {/* Engagement Factors */}
        <div className="flex flex-wrap gap-1">
          {Object.entries(clip.engagementFactors)
            .filter(([_, value]) => value > 0.7)
            .slice(0, 2)
            .map(([factor, value]) => (
              <span
                key={factor}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full"
              >
                {factor.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </span>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
        >
          <Eye className="h-3 w-3" />
          <span>Preview</span>
        </button>
        
        <button
          onClick={onDownload}
          className="flex items-center space-x-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
        >
          <Download className="h-3 w-3" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};

export default ClipGenerationPanel;