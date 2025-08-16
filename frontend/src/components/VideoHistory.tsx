import React from 'react';
import { VideoTask } from '../App';

interface VideoHistoryProps {
  tasks: VideoTask[];
}

const VideoHistory: React.FC<VideoHistoryProps> = ({ tasks }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Generation History</h2>
      
      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.task_id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {task.prompt}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(task.created_at)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                {formatStatus(task.status)}
              </span>
            </div>

            {task.progress !== undefined && task.status === 'processing' && (
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {task.error && (
              <p className="text-sm text-red-600 mb-3">
                <strong>Error:</strong> {task.error}
              </p>
            )}

            {task.video_url && task.status === 'completed' && (
              <div className="mt-3">
                <div className="video-container max-w-md">
                  <video controls className="w-full">
                    <source src={task.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-2">
                  <a
                    href={task.video_url}
                    download
                    className="btn-secondary text-sm"
                  >
                    Download Video
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoHistory;
