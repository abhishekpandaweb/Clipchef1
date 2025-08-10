import React, { useState } from 'react';
import { 
  Smartphone, 
  Instagram, 
  Youtube, 
  Linkedin, 
  Twitter,
  Facebook,
  TrendingUp,
  Target,
  Zap,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share,
  Settings
} from 'lucide-react';
import { PlatformPreset } from '../types/video';

interface PlatformOptimizationPanelProps {
  selectedPlatforms: string[];
  onPlatformToggle: (platformId: string) => void;
  className?: string;
}

const PlatformOptimizationPanel: React.FC<PlatformOptimizationPanelProps> = ({
  selectedPlatforms,
  onPlatformToggle,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const platforms: PlatformPreset[] = [
    {
      id: 'tiktok',
      name: 'tiktok',
      displayName: 'TikTok',
      aspectRatio: 9/16,
      width: 1080,
      height: 1920,
      maxDuration: 60,
      cropStrategy: 'face-tracking',
      audioRequired: true,
      optimizations: {
        hookDuration: 3,
        engagementBoosts: ['auto-captions', 'trending-sounds', 'viral-effects'],
        algorithmFriendly: true,
        trendingFormats: ['quick-tips', 'before-after', 'storytelling'],
        captionStyle: 'trendy'
      },
      contentGuidelines: {
        preferredLength: 30,
        idealPacing: 'fast',
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
      cropStrategy: 'smart',
      audioRequired: true,
      optimizations: {
        hookDuration: 3,
        engagementBoosts: ['trending-audio', 'hashtag-optimization', 'story-integration'],
        algorithmFriendly: true,
        trendingFormats: ['tutorials', 'behind-scenes', 'transformations'],
        captionStyle: 'engaging'
      },
      contentGuidelines: {
        preferredLength: 45,
        idealPacing: 'fast',
        attentionSpan: 10,
        viralElements: ['visual-appeal', 'trending-topics', 'shareability']
      }
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
      audioRequired: false,
      optimizations: {
        hookDuration: 2,
        engagementBoosts: ['aesthetic-thumbnails', 'carousel-potential', 'story-highlights'],
        algorithmFriendly: false,
        trendingFormats: ['educational', 'inspirational', 'lifestyle'],
        captionStyle: 'professional'
      },
      contentGuidelines: {
        preferredLength: 30,
        idealPacing: 'medium',
        attentionSpan: 15,
        viralElements: ['visual-quality', 'relatability', 'value-driven']
      }
    },
    {
      id: 'youtube-shorts',
      name: 'youtube-shorts',
      displayName: 'YouTube Shorts',
      aspectRatio: 9/16,
      width: 1080,
      height: 1920,
      maxDuration: 60,
      cropStrategy: 'action-following',
      audioRequired: true,
      optimizations: {
        hookDuration: 5,
        engagementBoosts: ['seo-titles', 'thumbnail-optimization', 'end-screens'],
        algorithmFriendly: true,
        trendingFormats: ['how-to', 'reactions', 'challenges'],
        captionStyle: 'engaging'
      },
      contentGuidelines: {
        preferredLength: 45,
        idealPacing: 'medium',
        attentionSpan: 12,
        viralElements: ['educational-value', 'entertainment', 'searchability']
      }
    },
    {
      id: 'linkedin',
      name: 'linkedin',
      displayName: 'LinkedIn',
      aspectRatio: 16/9,
      width: 1920,
      height: 1080,
      maxDuration: 600,
      cropStrategy: 'speaker-focus',
      audioRequired: false,
      optimizations: {
        hookDuration: 8,
        engagementBoosts: ['professional-captions', 'thought-leadership', 'industry-insights'],
        algorithmFriendly: false,
        trendingFormats: ['insights', 'case-studies', 'professional-tips'],
        captionStyle: 'professional'
      },
      contentGuidelines: {
        preferredLength: 120,
        idealPacing: 'slow',
        attentionSpan: 30,
        viralElements: ['expertise', 'networking', 'career-growth']
      }
    },
    {
      id: 'twitter',
      name: 'twitter',
      displayName: 'Twitter/X',
      aspectRatio: 16/9,
      width: 1280,
      height: 720,
      maxDuration: 140,
      cropStrategy: 'center',
      audioRequired: false,
      optimizations: {
        hookDuration: 2,
        engagementBoosts: ['trending-hashtags', 'thread-potential', 'retweet-optimization'],
        algorithmFriendly: false,
        trendingFormats: ['news-commentary', 'quick-takes', 'viral-moments'],
        captionStyle: 'minimal'
      },
      contentGuidelines: {
        preferredLength: 45,
        idealPacing: 'fast',
        attentionSpan: 8,
        viralElements: ['timeliness', 'controversy', 'humor']
      }
    }
  ];

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'tiktok': return <Smartphone className="h-5 w-5" />;
      case 'instagram-reels':
      case 'instagram-post': return <Instagram className="h-5 w-5" />;
      case 'youtube-shorts': return <Youtube className="h-5 w-5" />;
      case 'linkedin': return <Linkedin className="h-5 w-5" />;
      case 'twitter': return <Twitter className="h-5 w-5" />;
      case 'facebook': return <Facebook className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getPlatformColor = (platformId: string) => {
    switch (platformId) {
      case 'tiktok': return 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400';
      case 'instagram-reels':
      case 'instagram-post': return 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'youtube-shorts': return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'linkedin': return 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'twitter': return 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400';
      default: return 'border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const selectedCount = selectedPlatforms.length;
  const totalOptimizations = platforms
    .filter(p => selectedPlatforms.includes(p.id))
    .reduce((sum, p) => sum + p.optimizations.engagementBoosts.length, 0);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Platform Optimization
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-powered content optimization for maximum engagement
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCount} platforms • {totalOptimizations} optimizations
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

      {/* Platform Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const isSelected = selectedPlatforms.includes(platform.id);
            return (
              <div
                key={platform.id}
                onClick={() => onPlatformToggle(platform.id)}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? getPlatformColor(platform.id)
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Platform Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getPlatformIcon(platform.id)}
                    <span className="font-medium text-sm">
                      {platform.displayName}
                    </span>
                  </div>
                  
                  {isSelected && (
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                  )}
                </div>

                {/* Platform Specs */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Aspect Ratio:</span>
                    <span className="font-medium">{platform.width}×{platform.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Max Duration:</span>
                    <span className="font-medium">{formatDuration(platform.maxDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Ideal Length:</span>
                    <span className="font-medium">{formatDuration(platform.contentGuidelines.preferredLength)}</span>
                  </div>
                </div>

                {/* Optimization Features */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <div className="flex items-center space-x-1 mb-2">
                      <Zap className="h-3 w-3" />
                      <span className="text-xs font-medium">AI Optimizations</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {platform.optimizations.engagementBoosts.slice(0, 3).map((boost) => (
                        <span
                          key={boost}
                          className="px-2 py-1 text-xs bg-current/10 rounded-full"
                        >
                          {boost.replace('-', ' ')}
                        </span>
                      ))}
                      {platform.optimizations.engagementBoosts.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-current/10 rounded-full">
                          +{platform.optimizations.engagementBoosts.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Performance Indicators */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3" />
                    <span className="capitalize">{platform.contentGuidelines.idealPacing}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{platform.contentGuidelines.attentionSpan}s hook</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && selectedCount > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Advanced Platform Settings
          </h4>
          
          <div className="space-y-4">
            {platforms
              .filter(p => selectedPlatforms.includes(p.id))
              .map((platform) => (
                <div key={platform.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-3">
                    {getPlatformIcon(platform.id)}
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {platform.displayName} Optimization
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Crop Strategy:</span>
                      <p className="text-gray-600 dark:text-gray-400 capitalize">
                        {platform.cropStrategy.replace('-', ' ')}
                      </p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Caption Style:</span>
                      <p className="text-gray-600 dark:text-gray-400 capitalize">
                        {platform.optimizations.captionStyle}
                      </p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Trending Formats:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {platform.optimizations.trendingFormats.join(', ')}
                      </p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Viral Elements:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {platform.contentGuidelines.viralElements.join(', ')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Engagement Metrics */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3 text-blue-600" />
                          <span>Views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3 text-red-600" />
                          <span>Likes</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3 text-green-600" />
                          <span>Comments</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Share className="h-3 w-3 text-purple-600" />
                          <span>Shares</span>
                        </div>
                      </div>
                      
                      {platform.optimizations.algorithmFriendly && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          <span>Algorithm Friendly</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {selectedCount > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-blue-50 dark:bg-blue-900/10">
          <div className="flex items-start space-x-2">
            <Target className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium">Optimization Summary</p>
              <p>
                {selectedCount} platforms selected • 
                {totalOptimizations} AI optimizations active • 
                Estimated {selectedCount * 2} clips per scene
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformOptimizationPanel;