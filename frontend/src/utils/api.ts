// API configuration utility
export const getApiBaseUrl = (): string => {
  // Use environment variable if available, otherwise default to current origin for production
  return process.env.REACT_APP_API_BASE_URL || window.location.origin;
};

export const getVideoUrl = (videoPath: string): string => {
  const baseUrl = getApiBaseUrl();
  // Ensure the path starts with /static/videos/
  const cleanPath = videoPath.startsWith('/') ? videoPath : `/${videoPath}`;
  return `${baseUrl}${cleanPath}`;
};

// API endpoints
export const API_ENDPOINTS = {
  generateVideo: '/api/generate-video',
  videoStatus: (taskId: string) => `/api/video-status/${taskId}`,
  health: '/health'
};
