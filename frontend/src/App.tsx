import React, { useState, useCallback } from 'react';
import VideoGenerator from './components/VideoGenerator';
import VideoHistory from './components/VideoHistory';
import Header from './components/Header';
import Footer from './components/Footer';

export interface VideoTask {
  task_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  prompt: string;
  video_url?: string;
  error?: string;
  created_at: string;
  message?: string;
}

function App() {
  const [videoTasks, setVideoTasks] = useState<VideoTask[]>([]);

  const handleVideoGenerated = useCallback((task: VideoTask) => {
    setVideoTasks(prev => [task, ...prev]);
  }, []);

  const handleVideoUpdated = useCallback((updatedTask: VideoTask) => {
    setVideoTasks(prev => 
      prev.map(task => 
        task.task_id === updatedTask.task_id ? updatedTask : task
      )
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              AI Video Generator
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Transform your ideas into stunning videos with AI
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                5-10 second videos
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                AI-powered generation
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                High quality output
              </span>
            </div>
          </div>

          {/* Video Generator */}
          <div className="mb-12">
            <VideoGenerator 
              onVideoGenerated={handleVideoGenerated}
              onVideoUpdated={handleVideoUpdated}
            />
          </div>

          {/* Video History */}
          {videoTasks.length > 0 && (
            <VideoHistory tasks={videoTasks} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
