import React, { useState } from 'react';
import { 
  Brain, 
  Sliders, 
  Eye, 
  Mic, 
  Palette, 
  Move, 
  Users,
  Settings,
  Info,
  Zap
} from 'lucide-react';
import { SceneDetectionConfig } from '../types/video';

interface AdvancedSceneDetectionPanelProps {
  config: SceneDetectionConfig;
  onConfigChange: (config: SceneDetectionConfig) => void;
  className?: string;
}

const AdvancedSceneDetectionPanel: React.FC<AdvancedSceneDetectionPanelProps> = ({
  config,
  onConfigChange,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAlgorithmToggle = (algorithm: keyof SceneDetectionConfig['algorithms']) => {
    const newConfig = {
      ...config,
      algorithms: {
        ...config.algorithms,
        [algorithm]: {
          ...config.algorithms[algorithm],
          enabled: !config.algorithms[algorithm].enabled
        }
      }
    };
    onConfigChange(newConfig);
  };

  const handleAlgorithmChange = (
    algorithm: keyof SceneDetectionConfig['algorithms'],
    property: string,
    value: number
  ) => {
    const newConfig = {
      ...config,
      algorithms: {
        ...config.algorithms,
        [algorithm]: {
          ...config.algorithms[algorithm],
          [property]: value
        }
      }
    };
    onConfigChange(newConfig);
  };

  const algorithmInfo = {
    pixelDifference: {
      icon: <Eye className="h-4 w-4" />,
      name: 'Pixel Difference',
      description: 'Detects visual changes between frames',
      color: 'text-blue-600'
    },
    audioAmplitude: {
      icon: <Mic className="h-4 w-4" />,
      name: 'Audio Analysis',
      description: 'Identifies audio level changes and silence',
      color: 'text-green-600'
    },
    colorHistogram: {
      icon: <Palette className="h-4 w-4" />,
      name: 'Color Histogram',
      description: 'Analyzes color distribution changes',
      color: 'text-purple-600'
    },
    motionVector: {
      icon: <Move className="h-4 w-4" />,
      name: 'Motion Detection',
      description: 'Tracks camera movement and object motion',
      color: 'text-orange-600'
    },
    faceDetection: {
      icon: <Users className="h-4 w-4" />,
      name: 'Speaker Detection',
      description: 'Identifies speaker changes and face transitions',
      color: 'text-red-600'
    }
  };

  const enabledCount = Object.values(config.algorithms).filter(alg => alg.enabled).length;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Scene Detection
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Multi-algorithm intelligent scene boundary detection
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {enabledCount}/5 algorithms active
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detection Sensitivity
            </label>
            <select
              value={config.sensitivity}
              onChange={(e) => onConfigChange({
                ...config,
                sensitivity: e.target.value as 'low' | 'medium' | 'high'
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="low">Low (Fewer scenes)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="high">High (More scenes)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min Scene Duration (s)
            </label>
            <input
              type="number"
              min="3"
              max="60"
              value={config.minSceneDuration}
              onChange={(e) => onConfigChange({
                ...config,
                minSceneDuration: parseInt(e.target.value)
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Scenes
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={config.maxScenes}
              onChange={(e) => onConfigChange({
                ...config,
                maxScenes: parseInt(e.target.value)
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Algorithm Selection */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Detection Algorithms
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(algorithmInfo).map(([key, info]) => {
            const algorithm = config.algorithms[key as keyof typeof config.algorithms];
            return (
              <div
                key={key}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  algorithm.enabled
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={info.color}>
                      {info.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {info.name}
                    </span>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={algorithm.enabled}
                      onChange={() => handleAlgorithmToggle(key as keyof SceneDetectionConfig['algorithms'])}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {info.description}
                </p>
                
                {algorithm.enabled && showAdvanced && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Threshold: {algorithm.threshold}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={algorithm.threshold}
                        onChange={(e) => handleAlgorithmChange(
                          key as keyof SceneDetectionConfig['algorithms'],
                          'threshold',
                          parseFloat(e.target.value)
                        )}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Weight: {algorithm.weight}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={algorithm.weight}
                        onChange={(e) => handleAlgorithmChange(
                          key as keyof SceneDetectionConfig['algorithms'],
                          'weight',
                          parseFloat(e.target.value)
                        )}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Enhancement Options */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center space-x-2">
          <Zap className="h-4 w-4 text-yellow-600" />
          <span>AI Enhancements</span>
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Preserve Context</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maintain speaker context across scene boundaries
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.preserveContext}
                onChange={(e) => onConfigChange({
                  ...config,
                  preserveContext: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Maintain Narrative Flow</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ensure scenes follow logical story progression
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.maintainNarrativeFlow}
                onChange={(e) => onConfigChange({
                  ...config,
                  maintainNarrativeFlow: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Performance Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-400">
            <p className="font-medium">Processing Performance</p>
            <p>
              {enabledCount} algorithms active • 
              Estimated processing time: {Math.round(enabledCount * 2.5)}x video duration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSceneDetectionPanel;