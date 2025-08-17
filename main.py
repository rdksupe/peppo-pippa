import os
import uuid
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
from dotenv import load_dotenv
import modal

# Load environment variables
load_dotenv()

app = FastAPI(
    title="AI Video Generation API",
    description="Generate videos from text prompts using AI",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create static directory for serving videos
os.makedirs("static/videos", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory storage for video generation tasks
video_tasks: Dict[str, Dict[str, Any]] = {}

class VideoGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=500, description="Text prompt for video generation")
    duration: Optional[int] = Field(default=5, ge=3, le=10, description="Video duration in seconds")
    
class VideoGenerationResponse(BaseModel):
    task_id: str
    status: str
    message: str

class VideoStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: Optional[int] = None
    video_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str

class ModalVideoService:
    def __init__(self):
        # Use the specific deployed FastAPI endpoint URL
        self.base_url = "https://rdksupe--ltx-video-api-fastapi-app.modal.run"
        
    def get_api_url(self):
        """Get the deployed FastAPI endpoint URL"""
        return self.base_url

    async def generate_video(self, prompt: str, duration: int = 5) -> Dict[str, Any]:
        """Generate video using Modal LTX FastAPI endpoint"""
        try:
            api_url = self.get_api_url()
            
            # Convert duration to num_frames (assuming 15 fps)
            num_frames = duration * 30
            
            # Prepare request payload
            payload = {
                "prompt": prompt,
                "num_frames": num_frames,
                "num_inference_steps": 50,  # Good quality/speed balance
                "guidance_scale": 4.5
            }
            
            # Make API request to generate video
            async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minute timeout
                response = await client.post(
                    f"{api_url}/generate",
                    json=payload
                )
                
                if response.status_code != 200:
                    raise Exception(f"API request failed: {response.status_code} - {response.text}")
                
                result = response.json()
                
                if not result.get("success"):
                    raise Exception(f"Generation failed: {result.get('error', 'Unknown error')}")
                
                # Download the generated video
                filename = result["video_filename"]
                video_response = await client.get(f"{api_url}/video/{filename}")
                
                if video_response.status_code != 200:
                    raise Exception(f"Failed to download video: {video_response.status_code}")
                
                video_data = video_response.content
                
                return {
                    "status": "completed",
                    "video_data": video_data,
                    "video_url": None,  # Will be set after saving locally
                    "generation_time": result.get("generation_time")
                }
                
        except Exception as e:
            raise Exception(f"Modal LTX API video generation failed: {str(e)}")
    
    async def save_video_locally(self, video_data: Any, task_id: str) -> str:
        """Save video data to local file and return URL"""
        try:
            # Create filename
            filename = f"video_{task_id}.mp4"
            filepath = f"static/videos/{filename}"
            
            # Ensure directory exists
            os.makedirs("static/videos", exist_ok=True)
            
            # If video_data is bytes, write directly
            if isinstance(video_data, bytes):
                with open(filepath, "wb") as f:
                    f.write(video_data)
            # If it's a file-like object
            elif hasattr(video_data, 'read'):
                with open(filepath, "wb") as f:
                    f.write(video_data.read())
            # If it's a URL, download it
            elif isinstance(video_data, str) and video_data.startswith(('http://', 'https://')):
                async with httpx.AsyncClient() as client:
                    response = await client.get(video_data)
                    response.raise_for_status()
                    with open(filepath, "wb") as f:
                        f.write(response.content)
            else:
                # Try to convert to bytes
                video_bytes = bytes(video_data)
                with open(filepath, "wb") as f:
                    f.write(video_bytes)
            
            return f"/static/videos/{filename}"
            
        except Exception as e:
            raise Exception(f"Failed to save video: {str(e)}")

# Initialize video service
video_service = ModalVideoService()

async def process_video_generation(task_id: str, prompt: str, duration: int):
    """Background task to process video generation"""
    try:
        # Update status to processing
        video_tasks[task_id]["status"] = "processing"
        video_tasks[task_id]["progress"] = 10
        
        
        # Real API call using Modal LTX
        video_tasks[task_id]["message"] = "Generating video with Modal LTX API..."
        video_tasks[task_id]["progress"] = 30
        
        # Generate video directly from text using Modal
        result = await video_service.generate_video(prompt, duration)
        
        video_tasks[task_id]["progress"] = 70
        video_tasks[task_id]["message"] = "Processing video output..."
        
        # Handle the result
        if result.get("status") == "completed":
            video_data = result.get("video_data")
            video_url = result.get("video_url")
            
            # If we have video data but no URL, save it locally
            if video_data and not video_url:
                video_url = await video_service.save_video_locally(video_data, task_id)
            
            if video_url:
                video_tasks[task_id]["status"] = "completed"
                video_tasks[task_id]["progress"] = 100
                video_tasks[task_id]["video_url"] = video_url
                video_tasks[task_id]["message"] = "Video generated successfully"
                return
            else:
                raise Exception("No video URL or data received")
        else:
            raise Exception("Video generation failed")
            
    except Exception as e:
        video_tasks[task_id]["status"] = "failed"
        video_tasks[task_id]["error"] = str(e)
        video_tasks[task_id]["message"] = f"Generation failed: {str(e)}"

@app.post("/api/generate-video", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks
):
    """Generate a video from text prompt"""
    try:
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Initialize task tracking
        video_tasks[task_id] = {
            "task_id": task_id,
            "status": "queued",
            "progress": 0,
            "prompt": request.prompt,
            "duration": request.duration,
            "created_at": datetime.now().isoformat(),
            "video_url": None,
            "error": None,
            "message": "Video generation queued"
        }
        
        # Start background processing
        background_tasks.add_task(
            process_video_generation,
            task_id,
            request.prompt,
            request.duration
        )
        
        return VideoGenerationResponse(
            task_id=task_id,
            status="queued",
            message="Video generation started. Check status using the task ID."
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start video generation: {str(e)}")

@app.get("/api/video-status/{task_id}", response_model=VideoStatusResponse)
async def get_video_status(task_id: str):
    """Get video generation status"""
    if task_id not in video_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = video_tasks[task_id]
    return VideoStatusResponse(**task)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    modal_configured = bool(os.getenv("MODAL_TOKEN_ID") and os.getenv("MODAL_TOKEN_SECRET"))
    
    # Test connection to the LTX API endpoint
    ltx_api_status = "unknown"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://rdksupe--ltx-video-api-fastapi-app.modal.run/health")
            if response.status_code == 200:
                ltx_api_status = "healthy"
            else:
                ltx_api_status = f"error: {response.status_code}"
    except Exception as e:
        ltx_api_status = f"unreachable: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "modal_configured": modal_configured,
        "ltx_api_status": ltx_api_status,
        "ltx_api_endpoint": "https://rdksupe--ltx-video-api-fastapi-app.modal.run"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Video Generation API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
