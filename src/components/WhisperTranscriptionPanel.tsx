import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Settings,
  Users,
  Clock,
  Target,
  Brain,
  FileText,
  Languages,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useWhisperTranscription } from '../hooks/useWhisperTranscription';
import { TranscriptionOptions, TranscriptionSegment, SpeakerSegment } from '../services/WhisperTranscriptionService';
import LoadingSpinner from './LoadingSpinner';

interface WhisperTranscriptionPanelProps {
  videoFile: File | Blob | null;
  onTranscriptionComplete?: (result: any) => void;
  className?: string;
}

const WhisperTranscriptionPanel: React.FC<WhisperTranscriptionPanelProps> = ({
  videoFile,
  onTranscriptionComplete,
  className = ''
}) => {
  const {
    isReady,
    isTranscribing,
    currentModel,
    progress,
    error,
    transcriptionResult,
    initialize,
    transcribeVideo,
    generateSubtitles,
    switchModel,
    downloadSubtitles,
    clearResults,
    getAccuracyStats,
    getSpeakerStats
  } = useWhisperTranscription();

  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = useState<TranscriptionOptions>({
    modelSize: 'base',
    enableSpeakerDiarization: true,
    enableWordTimestamps: true,
    confidenceThreshold: 0.6,
    maxSpeakers: 4,
    customVocabulary: []
  });
  const [selectedSegment, setSelectedSegment] = useState<TranscriptionSegment | null>(null);
  const [playingSegment, setPlayingSegment] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) {
      initialize(options.modelSize);
    }
  }, [isReady, initialize, options.modelSize]);

  useEffect(() => {
    if (transcriptionResult && onTranscriptionComplete) {
      onTranscriptionComplete(transcriptionResult);
    }
  }, [transcriptionResult, onTranscriptionComplete]);

  const handleTranscribe = async () => {
    if (!videoFile) return;

    try {
      await transcribeVideo(videoFile, options);
    } catch (error) {
      console.error('Transcription failed:', error);
    }
  };

  const handleModelChange = async (modelSize: 'base' | 'small' | 'medium') => {
    try {
      await switchModel(modelSize);
      setOptions(prev => ({ ...prev, modelSize }));
    } catch (error) {
      console.error('Model switch failed:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
  };

  const accuracyStats = getAccuracyStats();
  const speakerStats = getSpeakerStats();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mic className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Transcription & Captions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Whisper.cpp powered transcription with speaker diarization
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isReady && (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">{currentModel} ready</span>
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
            Transcription Settings
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Model Size
              </label>
              <select
                value={options.modelSize}
                onChange={(e) => handleModelChange(e.target.value as any)}
                disabled={isTranscribing}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="base">Base (74MB) - Fast</option>
                <option value="small">Small (244MB) - Balanced</option>
                <option value="medium">Medium (769MB) - Accurate</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Confidence Threshold
              </label>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.1"
                value={options.confidenceThreshold}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  confidenceThreshold: parseFloat(e.target.value) 
                }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.round(options.confidenceThreshold * 100)}%
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Speaker Diarization</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.enableSpeakerDiarization}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    enableSpeakerDiarization: e.target.checked 
                  }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Word Timestamps</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.enableWordTimestamps}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    enableWordTimestamps: e.target.checked 
                  }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Transcription Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {videoFile ? 'Ready to transcribe' : 'Upload a video to start transcription'}
          </div>
          
          <button
            onClick={handleTranscribe}
            disabled={!videoFile || !isReady || isTranscribing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            {isTranscribing ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                <span>Start Transcription</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Display */}
      {isTranscribing && progress && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {progress.message}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progress.percentage)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          
          {progress.segmentsProcessed && progress.totalSegments && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Processing segment {progress.segmentsProcessed} of {progress.totalSegments}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Transcription Failed</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {transcriptionResult && (
        <div className="p-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {transcriptionResult.segments.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Segments</div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(transcriptionResult.averageConfidence * 100)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {transcriptionResult.speakers.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Speakers</div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {transcriptionResult.wordCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Words</div>
            </div>
          </div>

          {/* Download Options */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Export Subtitles
            </h4>
            <div className="flex space-x-2">
              {['srt', 'vtt', 'ass'].map((format) => (
                <button
                  key={format}
                  onClick={() => downloadSubtitles(format as any)}
                  className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>{format.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transcription Segments */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Transcription Results
            </h4>
            
            {transcriptionResult.segments.map((segment) => (
              <div
                key={segment.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSegment?.id === segment.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSelectedSegment(segment)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDuration(segment.startTime)} - {formatDuration(segment.endTime)}
                    </span>
                    {segment.speakerId && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-full">
                        {segment.speakerId}
                      </span>
                    )}
                  </div>
                  
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(segment.confidence)}`}>
                    {Math.round(segment.confidence * 100)}%
                  </span>
                </div>
                
                <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                  {segment.text}
                </p>
                
                {segment.words && segment.words.length > 0 && selectedSegment?.id === segment.id && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {segment.words.map((word, index) => (
                        <span
                          key={index}
                          className={`text-xs px-1 py-0.5 rounded ${getConfidenceColor(word.confidence)}`}
                          title={`${word.confidence.toFixed(2)} confidence`}
                        >
                          {word.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Speaker Information */}
          {transcriptionResult.speakers.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Speaker Analysis
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transcriptionResult.speakers.map((speaker) => (
                  <div key={speaker.speakerId} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {speaker.name || speaker.speakerId}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDuration(speaker.totalDuration)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {speaker.segments.length} segments • {Math.round(speaker.confidence * 100)}% confidence
                    </div>
                    
                    {speaker.voiceProfile && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {speaker.voiceProfile.gender} • {speaker.voiceProfile.tone} tone
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!transcriptionResult && !isTranscribing && (
        <div className="p-8 text-center">
          <Mic className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Ready for AI Transcription
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Upload a video to generate accurate transcriptions with speaker identification
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="font-medium text-blue-900 dark:text-blue-400">🎯 95%+ Accuracy</div>
              <div className="text-blue-700 dark:text-blue-300">Whisper.cpp powered</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="font-medium text-purple-900 dark:text-purple-400">👥 Speaker ID</div>
              <div className="text-purple-700 dark:text-purple-300">Auto diarization</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="font-medium text-green-900 dark:text-green-400">📝 Multi-Format</div>
              <div className="text-green-700 dark:text-green-300">SRT, VTT, ASS</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhisperTranscriptionPanel;