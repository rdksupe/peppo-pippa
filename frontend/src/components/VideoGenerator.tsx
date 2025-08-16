import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { VideoTask } from '../App';

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollVideoStatus = useCallback(async (taskId: string) => {
    try {
      const response = await axios.get(`/api/video-status/${taskId}`);
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
      const response = await axios.post('/api/generate-video', {
        prompt: prompt.trim(),
        duration
      });

      const initialTask: VideoTask = {
        task_id: response.data.task_id,
        status: 'queued',
        prompt: prompt.trim(),
        created_at: new Date().toISOString(),
        message: response.data.message
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
            <p className="text-sm text-gray-600">
              <strong>Prompt:</strong> {currentTask.prompt}
            </p>

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
                  <video controls className="w-full">
                    <source src={currentTask.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-2 flex space-x-2">
                  <a
                    href={currentTask.video_url}
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
