import React from 'react';
import { VideoTask } from '../App';
import { getVideoUrl } from '../utils/api';

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
                  {task.original_prompt || task.enhanced_prompt || 'No prompt available'}
                </p>
                {task.enhanced_prompt && task.original_prompt !== task.enhanced_prompt && (
                  <p className="text-xs text-blue-600 mb-1">
                    Enhanced by AI
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {formatDate(task.created_at)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                {formatStatus(task.status)}
              </span>
            </div>

            {task.customization && Object.keys(task.customization).length > 0 && (
              <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                <strong className="text-gray-700">Customizations:</strong>
                <div className="mt-1 text-gray-600">
                  {Object.entries(task.customization).map(([key, value]) => {
                    if (!value) return null;
                    const label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const displayValue = Array.isArray(value) ? value.join(', ') : value;
                    return (
                      <span key={key} className="inline-block mr-3">
                        {label}: {displayValue}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {task.enhanced_prompt && task.original_prompt && task.enhanced_prompt !== task.original_prompt && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-700 font-medium">
                    View Enhanced Prompt
                  </summary>
                  <p className="mt-2 text-blue-800">{task.enhanced_prompt}</p>
                </details>
              </div>
            )}

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
                  <video controls className="w-full rounded">
                    <source src={getVideoUrl(task.video_url)} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-3 flex space-x-2">
                  <a
                    href={getVideoUrl(task.video_url)}
                    download
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Video
                  </a>
                  <button
                    onClick={() => {
                      if (task.video_url) {
                        const fullVideoUrl = getVideoUrl(task.video_url);
                        if (navigator.share) {
                          navigator.share({
                            title: 'AI Generated Video',
                            text: `Check out this AI-generated video: ${task.original_prompt}`,
                            url: fullVideoUrl
                          }).catch(console.error);
                        } else {
                          // Fallback - copy URL to clipboard
                          navigator.clipboard.writeText(fullVideoUrl);
                          alert('Video URL copied to clipboard!');
                        }
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share
                  </button>
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
