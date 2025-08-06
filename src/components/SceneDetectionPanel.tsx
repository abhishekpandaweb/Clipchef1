import React, { useState, useCallback } from 'react';
import { 
  Scissors, 
  Settings, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Trash2,
  Plus,
  Eye,
  Download,
  Sliders
} from 'lucide-react';
import { DetectedScene, SceneDetectionConfig, PlatformPreset } from '../types/video';

interface SceneDetectionPanelProps {
  scenes: DetectedScene[];
  onScenesUpdate: (scenes: DetectedScene[]) => void;
  onGenerateClips: (scenes: DetectedScene[], platforms: string[]) => void;
  className?: string;
}

const SceneDetectionPanel: React.FC<SceneDetectionPanelProps> = ({
  scenes,
  onScenesUpdate,
  onGenerateClips,
  className = ''
}) => {
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['tiktok', 'instagram-reels']));
  const [showSettings, setShowSettings] = useState(false);
  const [previewScene, setPreviewScene] = useState<DetectedScene | null>(null);
  const [detectionConfig, setDetectionConfig] = useState<SceneDetectionConfig>({
    sensitivity: 'medium',
    pixelThreshold: 0.3,
    audioThreshold: 0.2,
    minSceneDuration: 5,
    maxScenes: 10
  });

  const platforms: PlatformPreset[] = [
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
    }
  ];

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSceneSelect = (sceneId: string) => {
    const newSelected = new Set(selectedScenes);
    if (newSelected.has(sceneId)) {
      newSelected.delete(sceneId);
    } else {
      newSelected.add(sceneId);
    }
    setSelectedScenes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedScenes.size === scenes.length) {
      setSelectedScenes(new Set());
    } else {
      setSelectedScenes(new Set(scenes.map(s => s.id)));
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platformId)) {
      newSelected.delete(platformId);
    } else {
      newSelected.add(platformId);
    }
    setSelectedPlatforms(newSelected);
  };

  const handleDeleteScene = (sceneId: string) => {
    const updatedScenes = scenes.filter(s => s.id !== sceneId);
    onScenesUpdate(updatedScenes);
    setSelectedScenes(prev => {
      const newSet = new Set(prev);
      newSet.delete(sceneId);
      return newSet;
    });
  };

  const handleGenerateClips = () => {
    const scenesToProcess = selectedScenes.size > 0 
      ? scenes.filter(s => selectedScenes.has(s.id))
      : scenes;
    
    onGenerateClips(scenesToProcess, Array.from(selectedPlatforms));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getDetectionMethodIcon = (method: string) => {
    switch (method) {
      case 'pixel': return '🎬';
      case 'audio': return '🔊';
      case 'histogram': return '🎨';
      case 'motion': return '🏃';
      default: return '🎯';
    }
  };

  if (scenes.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center ${className}`}>
        <Scissors className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Scenes Detected
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Upload and process a video to detect scenes automatically
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Scissors className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Detected Scenes ({scenes.length})
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Detection Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {selectedScenes.size === scenes.length ? 'Deselect All' : 'Select All'}
            </button>
            
            {selectedScenes.size > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedScenes.size} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detection Settings */}
      {showSettings && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Detection Settings
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sensitivity
              </label>
              <select
                value={detectionConfig.sensitivity}
                onChange={(e) => setDetectionConfig(prev => ({
                  ...prev,
                  sensitivity: e.target.value as 'low' | 'medium' | 'high'
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low (fewer scenes)</option>
                <option value="medium">Medium</option>
                <option value="high">High (more scenes)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Scene Duration (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={detectionConfig.minSceneDuration}
                onChange={(e) => setDetectionConfig(prev => ({
                  ...prev,
                  minSceneDuration: parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Scene Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={`relative bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                selectedScenes.has(scene.id)
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleSceneSelect(scene.id)}
            >
              {/* Thumbnail */}
              <div className="relative">
                <img
                  src={scene.thumbnail}
                  alt={`Scene ${scene.id}`}
                  className="w-full h-24 object-cover"
                />
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between text-white text-xs">
                      <span>{formatDuration(scene.startTime)}</span>
                      <span>{formatDuration(scene.duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    selectedScenes.has(scene.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white/80 border-white/80'
                  }`}>
                    {selectedScenes.has(scene.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewScene(scene);
                    }}
                    className="p-1 bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(scene.id);
                    }}
                    className="p-1 bg-black/50 text-white rounded hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Scene Info */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Scene {scene.id.split('_')[1]}
                  </span>
                  <span className="text-xs">
                    {getDetectionMethodIcon(scene.detectionMethod)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(scene.confidence)}`}>
                    {Math.round(scene.confidence * 100)}% confidence
                  </span>
                </div>

                {scene.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                    {scene.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Selection & Generate */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Select Platforms
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformToggle(platform.id)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                    selectedPlatforms.has(platform.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-medium">{platform.displayName}</div>
                    <div className="text-xs opacity-75">
                      {platform.width}×{platform.height}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedScenes.size > 0 
                ? `${selectedScenes.size} scenes × ${selectedPlatforms.size} platforms = ${selectedScenes.size * selectedPlatforms.size} clips`
                : `${scenes.length} scenes × ${selectedPlatforms.size} platforms = ${scenes.length * selectedPlatforms.size} clips`
              }
            </div>
            
            <button
              onClick={handleGenerateClips}
              disabled={selectedPlatforms.size === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <Scissors className="h-4 w-4" />
              <span>Generate Clips</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewScene && (
        <ScenePreviewModal
          scene={previewScene}
          onClose={() => setPreviewScene(null)}
        />
      )}
    </div>
  );
};

// Scene Preview Modal Component
const ScenePreviewModal: React.FC<{
  scene: DetectedScene;
  onClose: () => void;
}> = ({ scene, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                Scene Preview
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Thumbnail */}
              <div className="relative">
                <img
                  src={scene.thumbnail}
                  alt={`Scene ${scene.id}`}
                  className="w-full h-64 object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
                />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8 ml-1" />
                    )}
                  </button>
                </div>
              </div>

              {/* Scene Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Start Time:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {formatDuration(scene.startTime)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Duration:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {formatDuration(scene.duration)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Confidence:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {Math.round(scene.confidence * 100)}%
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Method:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400 capitalize">
                    {scene.detectionMethod}
                  </span>
                </div>
              </div>

              {scene.description && (
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Description:</span>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {scene.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneDetectionPanel;