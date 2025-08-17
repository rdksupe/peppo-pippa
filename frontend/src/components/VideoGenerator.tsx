import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { VideoTask, VideoCustomization } from '../App';
import { getApiBaseUrl, getVideoUrl, API_ENDPOINTS } from '../utils/api';

interface VideoGeneratorProps {
  onVideoGenerated: (task: VideoTask) => void;
  onVideoUpdated: (task: VideoTask) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ 
  onVideoGenerated, 
  onVideoUpdated 
}) => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<VideoTask | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useEnhancedPrompt, setUseEnhancedPrompt] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Customization options state
  const [customization, setCustomization] = useState<VideoCustomization>({
    style: '',
    camera_angle: '',
    lighting: '',
    movement: '',
    mood: '',
    color_palette: '',
    quality: '',
    effects: []
  });

  const styleOptions = [
    { value: '', label: 'Default' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'artistic', label: 'Artistic' },
    { value: 'realistic', label: 'Realistic' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'sci-fi', label: 'Sci-Fi' },
    { value: 'documentary', label: 'Documentary' },
    { value: 'animated', label: 'Animated' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'modern', label: 'Modern' }
  ];

  const cameraOptions = [
    { value: '', label: 'Default' },
    { value: 'close-up', label: 'Close-up' },
    { value: 'medium-shot', label: 'Medium Shot' },
    { value: 'wide-shot', label: 'Wide Shot' },
    { value: 'bird-eye', label: "Bird's Eye View" },
    { value: 'ground-level', label: 'Ground Level' },
    { value: 'low-angle', label: 'Low Angle' },
    { value: 'high-angle', label: 'High Angle' },
    { value: 'first-person', label: 'First Person' },
    { value: 'over-shoulder', label: 'Over Shoulder' }
  ];

  const lightingOptions = [
    { value: '', label: 'Default' },
    { value: 'natural', label: 'Natural' },
    { value: 'golden-hour', label: 'Golden Hour' },
    { value: 'blue-hour', label: 'Blue Hour' },
    { value: 'dramatic', label: 'Dramatic' },
    { value: 'soft', label: 'Soft' },
    { value: 'harsh', label: 'Harsh' },
    { value: 'neon', label: 'Neon' },
    { value: 'candlelit', label: 'Candlelit' },
    { value: 'studio', label: 'Studio' }
  ];

  const movementOptions = [
    { value: '', label: 'Default' },
    { value: 'static', label: 'Static' },
    { value: 'slow-motion', label: 'Slow Motion' },
    { value: 'fast-paced', label: 'Fast Paced' },
    { value: 'smooth-pan', label: 'Smooth Pan' },
    { value: 'tracking', label: 'Tracking' },
    { value: 'dolly-zoom', label: 'Dolly Zoom' },
    { value: 'handheld', label: 'Handheld' },
    { value: 'aerial', label: 'Aerial' },
    { value: 'rotation', label: 'Rotation' }
  ];

  const moodOptions = [
    { value: '', label: 'Default' },
    { value: 'peaceful', label: 'Peaceful' },
    { value: 'energetic', label: 'Energetic' },
    { value: 'mysterious', label: 'Mysterious' },
    { value: 'dramatic', label: 'Dramatic' },
    { value: 'romantic', label: 'Romantic' },
    { value: 'suspenseful', label: 'Suspenseful' },
    { value: 'joyful', label: 'Joyful' },
    { value: 'melancholic', label: 'Melancholic' },
    { value: 'epic', label: 'Epic' }
  ];

  const colorOptions = [
    { value: '', label: 'Default' },
    { value: 'warm', label: 'Warm Tones' },
    { value: 'cool', label: 'Cool Tones' },
    { value: 'monochrome', label: 'Monochrome' },
    { value: 'vibrant', label: 'Vibrant' },
    { value: 'muted', label: 'Muted' },
    { value: 'neon', label: 'Neon' },
    { value: 'pastel', label: 'Pastel' },
    { value: 'high-contrast', label: 'High Contrast' },
    { value: 'sepia', label: 'Sepia' }
  ];

  const qualityOptions = [
    { value: '', label: 'Default' },
    { value: 'hd', label: 'HD' },
    { value: '4k', label: '4K' },
    { value: 'ultra-hd', label: 'Ultra HD' },
    { value: 'professional', label: 'Professional' },
    { value: 'broadcast', label: 'Broadcast Quality' }
  ];

  const effectOptions = [
    { value: 'bokeh', label: 'Bokeh' },
    { value: 'lens-flare', label: 'Lens Flare' },
    { value: 'motion-blur', label: 'Motion Blur' },
    { value: 'depth-of-field', label: 'Depth of Field' },
    { value: 'film-grain', label: 'Film Grain' },
    { value: 'vignette', label: 'Vignette' },
    { value: 'chromatic-aberration', label: 'Chromatic Aberration' },
    { value: 'bloom', label: 'Bloom' },
    { value: 'particles', label: 'Particles' },
    { value: 'fog', label: 'Fog/Smoke' }
  ];

  const handleCustomizationChange = (field: keyof VideoCustomization, value: string | string[]) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEffectToggle = (effect: string) => {
    setCustomization(prev => ({
      ...prev,
      effects: prev.effects?.includes(effect)
        ? prev.effects.filter(e => e !== effect)
        : [...(prev.effects || []), effect]
    }));
  };

  const pollVideoStatus = useCallback(async (taskId: string) => {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await axios.get(`${apiUrl}${API_ENDPOINTS.videoStatus(taskId)}`);
      const task: VideoTask = response.data;
      
      setCurrentTask(task);
      onVideoUpdated(task);
      
      if (task.status === 'completed' || task.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error polling video status:', error);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsGenerating(false);
    }
  }, [onVideoUpdated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setCurrentTask(null);

    try {
      // Prepare customization object, removing empty values
      const cleanCustomization: VideoCustomization = {};
      if (customization.style) cleanCustomization.style = customization.style;
      if (customization.camera_angle) cleanCustomization.camera_angle = customization.camera_angle;
      if (customization.lighting) cleanCustomization.lighting = customization.lighting;
      if (customization.movement) cleanCustomization.movement = customization.movement;
      if (customization.mood) cleanCustomization.mood = customization.mood;
      if (customization.color_palette) cleanCustomization.color_palette = customization.color_palette;
      if (customization.quality) cleanCustomization.quality = customization.quality;
      if (customization.effects && customization.effects.length > 0) {
        cleanCustomization.effects = customization.effects;
      }

      const requestData = {
        prompt: prompt.trim(),
        duration,
        use_enhanced_prompt: useEnhancedPrompt,
        ...(Object.keys(cleanCustomization).length > 0 && { customization: cleanCustomization })
      };

      const apiUrl = getApiBaseUrl();
      const response = await axios.post(`${apiUrl}${API_ENDPOINTS.generateVideo}`, requestData);

      const initialTask: VideoTask = {
        task_id: response.data.task_id,
        status: 'queued',
        original_prompt: prompt.trim(),
        created_at: new Date().toISOString(),
        message: response.data.message,
        customization: cleanCustomization
      };

      setCurrentTask(initialTask);
      onVideoGenerated(initialTask);

      // Start polling for status updates
      intervalRef.current = setInterval(() => {
        pollVideoStatus(response.data.task_id);
      }, 2000);

    } catch (error: any) {
      console.error('Error generating video:', error);
      setIsGenerating(false);
      alert(error.response?.data?.detail || 'Failed to generate video');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'status-queued';
      case 'processing': return 'status-processing';
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      default: return 'status-queued';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Your Video</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Video Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate... (e.g., 'A golden retriever playing in a sunny meadow')"
            className="textarea-field"
            rows={4}
            maxLength={500}
            disabled={isGenerating}
          />
          <div className="text-sm text-gray-500 mt-1">
            {prompt.length}/500 characters
          </div>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
            Duration: {duration} seconds
          </label>
          <input
            type="range"
            id="duration"
            min={3}
            max={10}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>3s</span>
            <span>10s</span>
          </div>
        </div>

        {/* Enhanced Prompt Option */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={useEnhancedPrompt}
              onChange={(e) => setUseEnhancedPrompt(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={isGenerating}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Use AI-Enhanced Prompt
              </span>
              <p className="text-xs text-gray-500">
                Let AI improve your prompt for better video generation results
              </p>
            </div>
          </label>
        </div>

        {/* Advanced Options Toggle */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            disabled={isGenerating}
          >
            <span>Advanced Customization Options</span>
            <span className="ml-2">
              {showAdvanced ? '▼' : '▶'}
            </span>
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
              <select
                value={customization.style || ''}
                onChange={(e) => handleCustomizationChange('style', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                {styleOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Camera Angle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Camera Angle</label>
              <select
                value={customization.camera_angle || ''}
                onChange={(e) => handleCustomizationChange('camera_angle', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                {cameraOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Lighting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lighting</label>
              <select
                value={customization.lighting || ''}
                onChange={(e) => handleCustomizationChange('lighting', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                {lightingOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Movement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Movement</label>
              <select
                value={customization.movement || ''}
                onChange={(e) => handleCustomizationChange('movement', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                {movementOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
              <select
                value={customization.mood || ''}
                onChange={(e) => handleCustomizationChange('mood', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                {moodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Color Palette */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color Palette</label>
              <select
                value={customization.color_palette || ''}
                onChange={(e) => handleCustomizationChange('color_palette', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                {colorOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
              <select
                value={customization.quality || ''}
                onChange={(e) => handleCustomizationChange('quality', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={isGenerating}
              >
                {qualityOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Effects */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visual Effects</label>
              <div className="grid grid-cols-2 gap-2">
                {effectOptions.map(effect => (
                  <label key={effect.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customization.effects?.includes(effect.value) || false}
                      onChange={() => handleEffectToggle(effect.value)}
                      className="rounded border-gray-300"
                      disabled={isGenerating}
                    />
                    <span className="text-sm text-gray-700">{effect.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <>
              <div className="loading-spinner"></div>
              <span>Generating...</span>
            </>
          ) : (
            <span>Generate Video</span>
          )}
        </button>
      </form>

      {currentTask && (
        <div className="mt-8 p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Generation Progress</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentTask.status)}`}>
              {formatStatus(currentTask.status)}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">
                <strong>Original Prompt:</strong> {currentTask.original_prompt}
              </p>
              {currentTask.enhanced_prompt && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Enhanced Prompt:</strong> {currentTask.enhanced_prompt}
                  </p>
                </div>
              )}
            </div>

            {currentTask.customization && Object.keys(currentTask.customization).length > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <p className="text-sm font-medium text-gray-700 mb-2">Customizations Applied:</p>
                <div className="text-xs text-gray-600 space-y-1">
                  {currentTask.customization.style && (
                    <div><strong>Style:</strong> {currentTask.customization.style}</div>
                  )}
                  {currentTask.customization.camera_angle && (
                    <div><strong>Camera:</strong> {currentTask.customization.camera_angle}</div>
                  )}
                  {currentTask.customization.lighting && (
                    <div><strong>Lighting:</strong> {currentTask.customization.lighting}</div>
                  )}
                  {currentTask.customization.movement && (
                    <div><strong>Movement:</strong> {currentTask.customization.movement}</div>
                  )}
                  {currentTask.customization.mood && (
                    <div><strong>Mood:</strong> {currentTask.customization.mood}</div>
                  )}
                  {currentTask.customization.color_palette && (
                    <div><strong>Colors:</strong> {currentTask.customization.color_palette}</div>
                  )}
                  {currentTask.customization.quality && (
                    <div><strong>Quality:</strong> {currentTask.customization.quality}</div>
                  )}
                  {currentTask.customization.effects && currentTask.customization.effects.length > 0 && (
                    <div><strong>Effects:</strong> {currentTask.customization.effects.join(', ')}</div>
                  )}
                </div>
              </div>
            )}

            {currentTask.progress !== undefined && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{currentTask.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${currentTask.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {currentTask.message && (
              <p className="text-sm text-gray-600">
                {currentTask.message}
              </p>
            )}

            {currentTask.error && (
              <p className="text-sm text-red-600">
                <strong>Error:</strong> {currentTask.error}
              </p>
            )}

            {currentTask.video_url && currentTask.status === 'completed' && (
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2">Generated Video</h4>
                <div className="video-container">
                  <video controls className="w-full max-w-md">
                    <source src={getVideoUrl(currentTask.video_url)} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-2 flex space-x-2">
                  <a
                    href={getVideoUrl(currentTask.video_url)}
                    download
                    className="btn-secondary text-sm"
                  >
                    Download Video
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
