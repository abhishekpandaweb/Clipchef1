import { useState, useCallback, useRef } from 'react';
import { 
  ClipGenerator, 
  GeneratedClip, 
  ClipGenerationOptions, 
  ClipGenerationProgress 
} from '../services/ClipGenerator';
import { DetectedScene, PlatformPreset } from '../types/video';
import { useToast } from '../contexts/ToastContext';

export interface UseClipGeneratorReturn {
  // State
  isGenerating: boolean;
  generatedClips: GeneratedClip[];
  progress: ClipGenerationProgress[];
  error: string | null;
  
  // Methods
  generateClips: (
    videoFile: File | Blob,
    scenes: DetectedScene[],
    platforms: PlatformPreset[],
    options?: ClipGenerationOptions
  ) => Promise<GeneratedClip[]>;
  
  batchGenerateClips: (
    videos: { file: File | Blob; scenes: DetectedScene[] }[],
    platforms: PlatformPreset[],
    options?: ClipGenerationOptions
  ) => Promise<GeneratedClip[][]>;
  
  clearClips: () => void;
  downloadClip: (clip: GeneratedClip) => void;
  getQualityMetrics: () => any;
  cleanup: () => Promise<void>;
}

export const useClipGenerator = (): UseClipGeneratorReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedClips, setGeneratedClips] = useState<GeneratedClip[]>([]);
  const [progress, setProgress] = useState<ClipGenerationProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const clipGeneratorRef = useRef<ClipGenerator | null>(null);
  const { addToast } = useToast();

  // Initialize clip generator
  const getClipGenerator = useCallback(async (): Promise<ClipGenerator> => {
    if (!clipGeneratorRef.current) {
      clipGeneratorRef.current = new ClipGenerator();
      await clipGeneratorRef.current.initialize();
    }
    return clipGeneratorRef.current;
  }, []);

  const generateClips = useCallback(async (
    videoFile: File | Blob,
    scenes: DetectedScene[],
    platforms: PlatformPreset[],
    options?: ClipGenerationOptions
  ): Promise<GeneratedClip[]> => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress([]);
      
      const clipGenerator = await getClipGenerator();
      
      const clips = await clipGenerator.generateClipsFromScenes(
        videoFile,
        scenes,
        platforms,
        options,
        (progressUpdate) => {
          setProgress(prev => {
            const existing = prev.find(p => p.clipId === progressUpdate.clipId);
            if (existing) {
              return prev.map(p => p.clipId === progressUpdate.clipId ? progressUpdate : p);
            }
            return [...prev, progressUpdate];
          });
        }
      );
      
      setGeneratedClips(prev => [...prev, ...clips]);
      
      addToast({
        type: 'success',
        title: 'Clips Generated Successfully',
        message: `Generated ${clips.length} optimized clips for ${platforms.length} platforms`
      });
      
      return clips;
    } catch (err) {
      const errorMessage = `Failed to generate clips: ${err}`;
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Clip Generation Failed',
        message: errorMessage
      });
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [getClipGenerator, addToast]);

  const batchGenerateClips = useCallback(async (
    videos: { file: File | Blob; scenes: DetectedScene[] }[],
    platforms: PlatformPreset[],
    options?: ClipGenerationOptions
  ): Promise<GeneratedClip[][]> => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress([]);
      
      const clipGenerator = await getClipGenerator();
      
      const results = await clipGenerator.batchGenerateClips(
        videos,
        platforms,
        options,
        (videoIndex, progressUpdate) => {
          const clipId = `${videoIndex}_${progressUpdate.clipId}`;
          setProgress(prev => {
            const existing = prev.find(p => p.clipId === clipId);
            const updatedProgress = { ...progressUpdate, clipId };
            
            if (existing) {
              return prev.map(p => p.clipId === clipId ? updatedProgress : p);
            }
            return [...prev, updatedProgress];
          });
        }
      );
      
      const allClips = results.flat();
      setGeneratedClips(prev => [...prev, ...allClips]);
      
      addToast({
        type: 'success',
        title: 'Batch Generation Complete',
        message: `Generated ${allClips.length} clips from ${videos.length} videos`
      });
      
      return results;
    } catch (err) {
      const errorMessage = `Failed to batch generate clips: ${err}`;
      setError(errorMessage);
      addToast({
        type: 'error',
        title: 'Batch Generation Failed',
        message: errorMessage
      });
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [getClipGenerator, addToast]);

  const clearClips = useCallback(() => {
    // Revoke blob URLs to free memory
    generatedClips.forEach(clip => {
      if (clip.thumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(clip.thumbnail);
      }
    });
    
    setGeneratedClips([]);
    setProgress([]);
    setError(null);
  }, [generatedClips]);

  const downloadClip = useCallback((clip: GeneratedClip) => {
    try {
      const url = URL.createObjectURL(clip.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clip.platform}_${clip.sceneId}_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToast({
        type: 'success',
        title: 'Download Started',
        message: `Downloading ${clip.platform} clip`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: `Failed to download clip: ${err}`
      });
    }
  }, [addToast]);

  const getQualityMetrics = useCallback(() => {
    if (!clipGeneratorRef.current || generatedClips.length === 0) {
      return null;
    }
    
    return clipGeneratorRef.current.getClipQualityMetrics(generatedClips);
  }, [generatedClips]);

  const cleanup = useCallback(async () => {
    if (clipGeneratorRef.current) {
      await clipGeneratorRef.current.cleanup();
      clipGeneratorRef.current = null;
    }
    clearClips();
  }, [clearClips]);

  return {
    isGenerating,
    generatedClips,
    progress,
    error,
    generateClips,
    batchGenerateClips,
    clearClips,
    downloadClip,
    getQualityMetrics,
    cleanup
  };
};