import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Download, 
  Trash2, 
  Settings, 
  Wifi, 
  WifiOff,
  HardDrive,
  Shield,
  Zap,
  Eye
} from 'lucide-react';
import { AIModel, AIProcessingConfig } from '../types/ai';
import { aiModelManager } from '../services/AIModelManager';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from './LoadingSpinner';

interface AIModelPanelProps {
  className?: string;
}

const AIModelPanel: React.FC<AIModelPanelProps> = ({ className = '' }) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [config, setConfig] = useState<AIProcessingConfig>();
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 5000 });
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadModelsData();
    const interval = setInterval(loadModelsData, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadModelsData = () => {
    setModels(aiModelManager.getAllModels());
    setConfig(aiModelManager.getConfig());
    setStorageUsage(aiModelManager.getStorageUsage());
  };

  const handleLoadModel = async (modelId: string) => {
    try {
      setIsLoading(true);
      await aiModelManager.loadModel(modelId);
      addToast({
        type: 'success',
        title: 'Model Loaded',
        message: `AI model loaded successfully and ready for use`
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Loading Failed',
        message: `Failed to load model: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAllModels = async () => {
    try {
      setIsLoading(true);
      await aiModelManager.loadAllModels();
      addToast({
        type: 'success',
        title: 'All Models Loaded',
        message: 'All AI models are now ready for offline processing'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Loading Failed',
        message: `Failed to load models: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearModels = async () => {
    try {
      await aiModelManager.clearModels();
      addToast({
        type: 'info',
        title: 'Models Cleared',
        message: 'All AI models have been removed from storage'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Clear Failed',
        message: `Failed to clear models: ${error}`
      });
    }
  };

  const handleConfigChange = (newConfig: Partial<AIProcessingConfig>) => {
    aiModelManager.updateConfig(newConfig);
    setConfig(aiModelManager.getConfig());
    addToast({
      type: 'info',
      title: 'Settings Updated',
      message: 'AI processing configuration has been updated'
    });
  };

  const formatFileSize = (mb: number): string => {
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getModelIcon = (type: string) => {
    switch (type) {
      case 'llm': return <Brain className="h-5 w-5 text-purple-600" />;
      case 'whisper': return <Zap className="h-5 w-5 text-blue-600" />;
      case 'vision': return <Eye className="h-5 w-5 text-green-600" />;
      default: return <Brain className="h-5 w-5 text-gray-600" />;
    }
  };

  const loadedModels = models.filter(m => m.loaded);
  const unloadedModels = models.filter(m => !m.loaded);
  const totalSize = models.reduce((sum, m) => sum + (m.loaded ? m.size : 0), 0);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Models
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Zero-server local processing • Complete privacy
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {config?.enableOfflineMode ? (
              <div className="flex items-center space-x-1 text-green-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs font-medium">Offline Ready</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-blue-600">
                <Wifi className="h-4 w-4" />
                <span className="text-xs font-medium">Online</span>
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

        {/* Storage Usage */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span>Storage Usage</span>
            </div>
            <span>{formatFileSize(storageUsage.used)} / {formatFileSize(storageUsage.total)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(storageUsage.used / storageUsage.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            AI Processing Settings
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Privacy Mode</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config?.privacyMode}
                  onChange={(e) => handleConfigChange({ privacyMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Offline Mode</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config?.enableOfflineMode}
                  onChange={(e) => handleConfigChange({ enableOfflineMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Model Quality
              </label>
              <select
                value={config?.modelQuality}
                onChange={(e) => handleConfigChange({ modelQuality: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="fast">Fast (Lower accuracy, faster processing)</option>
                <option value="balanced">Balanced (Good accuracy and speed)</option>
                <option value="high">High (Best accuracy, slower processing)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loadedModels.length} of {models.length} models loaded
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleLoadAllModels}
              disabled={isLoading || loadedModels.length === models.length}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-1"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : <Download className="h-3 w-3" />}
              <span>Load All</span>
            </button>
            
            {loadedModels.length > 0 && (
              <button
                onClick={handleClearModels}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Model List */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {models.map((model) => (
          <div key={model.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getModelIcon(model.type)}
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {model.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatFileSize(model.size)} • {model.capabilities.join(', ')}
                  </p>
                  
                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {model.capabilities.map((capability) => (
                      <span
                        key={capability}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full"
                      >
                        {capability.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {model.loaded ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium">Ready</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleLoadModel(model.id)}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-1"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : <Download className="h-3 w-3" />}
                    <span>Load</span>
                  </button>
                )}
              </div>
            </div>

            {/* Download Progress */}
            {model.downloadProgress > 0 && model.downloadProgress < 100 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Downloading...</span>
                  <span>{Math.round(model.downloadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                  <div
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${model.downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Privacy Notice */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/10">
        <div className="flex items-start space-x-2">
          <Shield className="h-4 w-4 text-green-600 mt-0.5" />
          <div className="text-xs text-green-700 dark:text-green-400">
            <p className="font-medium">100% Private Processing</p>
            <p>All AI operations run locally in your browser. Your videos never leave your device.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModelPanel;