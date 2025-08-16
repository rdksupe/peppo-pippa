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
from huggingface_hub import InferenceClient

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

class HuggingFaceVideoService:
    def __init__(self):
        self.hf_token = os.getenv("HF_TOKEN")
        self.client = None
        if self.hf_token:
            self.client = InferenceClient(
                provider="replicate",
                api_key=self.hf_token,
            )
        
    async def generate_video(self, prompt: str, duration: int = 5) -> Dict[str, Any]:
        """Generate video using Hugging Face Inference API"""
        if not self.hf_token:
            raise Exception("Hugging Face token not configured")
        
        if not self.client:
            raise Exception("Hugging Face client not initialized")
            
        try:
            # Use the Hugging Face text-to-video API
            video_result = self.client.text_to_video(
                prompt,
                model="Wan-AI/Wan2.2-TI2V-5B",
            )
            
            # The result should contain video data or URL
            return {
                "status": "completed",
                "video_data": video_result,
                "video_url": getattr(video_result, 'url', None) if hasattr(video_result, 'url') else None
            }
            
        except Exception as e:
            raise Exception(f"Video generation failed: {str(e)}")
    
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
    async def generate_image_from_text(self, prompt: str) -> Dict[str, Any]:
        """Generate image from text using Hugging Face API"""
        headers = {
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "promptText": prompt,
            "model": "gen4_image",
            "ratio": "1280:720"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/text_to_image",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code != 200:
                    raise Exception(f"Image generation API error: {response.status_code} - {response.text}")
                    
                return response.json()
                
            except httpx.TimeoutException:
                raise Exception("Image generation API request timeout")
            except Exception as e:
                raise Exception(f"Image generation failed: {str(e)}")
        
    async def generate_video_from_image(self, image_url: str, prompt: str, duration: int = 5) -> Dict[str, Any]:
        """Generate video from image using Runway ML API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Runway-Version": "2024-11-06"
        }
        
        payload = {
            "promptImage": image_url,
            "promptText": prompt,
            "model": "gen3a_turbo",
            "duration": duration,
            "ratio": "1280:720"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/image_to_video",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code != 200:
                    raise Exception(f"Video generation API error: {response.status_code} - {response.text}")
                    
                return response.json()
                
            except httpx.TimeoutException:
                raise Exception("Video generation API request timeout")
            except Exception as e:
                raise Exception(f"Video generation failed: {str(e)}")

    async def check_video_status(self, task_id: str) -> Dict[str, Any]:
        """Check task status using Runway ML API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Runway-Version": "2024-11-06"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    f"{self.base_url}/tasks/{task_id}",
                    headers=headers
                )
                
                if response.status_code != 200:
                    raise Exception(f"Status check failed: {response.status_code} - {response.text}")
                    
                return response.json()
                
            except Exception as e:
                raise Exception(f"Status check failed: {str(e)}")
    
    async def wait_for_task_completion(self, task_id: str, max_wait_time: int = 300) -> Dict[str, Any]:
        """Wait for a task to complete with timeout"""
        start_time = asyncio.get_event_loop().time()
        
        while True:
            current_time = asyncio.get_event_loop().time()
            if current_time - start_time > max_wait_time:
                raise Exception(f"Task {task_id} timed out after {max_wait_time} seconds")
            
            status_result = await self.check_video_status(task_id)
            
            if status_result.get("status") == "SUCCEEDED":
                return status_result
            elif status_result.get("status") == "FAILED":
                error_msg = status_result.get("failure", {}).get("message", "Unknown error")
                raise Exception(f"Task failed: {error_msg}")
            
            # Wait before next check
            await asyncio.sleep(3)
            
        return status_result

# Initialize video service
video_service = HuggingFaceVideoService()

async def process_video_generation(task_id: str, prompt: str, duration: int):
    """Background task to process video generation"""
    try:
        # Update status to processing
        video_tasks[task_id]["status"] = "processing"
        video_tasks[task_id]["progress"] = 10
        
        # For demo purposes, if no API key is available, create a mock response
        if not os.getenv("HF_TOKEN"):
            # Simulate processing time
            await asyncio.sleep(3)
            video_tasks[task_id]["progress"] = 50
            video_tasks[task_id]["message"] = "Generating video (mock mode)..."
            await asyncio.sleep(2)
            video_tasks[task_id]["progress"] = 90
            await asyncio.sleep(1)
            
            # Mock successful completion
            video_tasks[task_id]["status"] = "completed"
            video_tasks[task_id]["progress"] = 100
            video_tasks[task_id]["video_url"] = f"/static/videos/mock_video_{task_id}.mp4"
            video_tasks[task_id]["message"] = "Video generated successfully (mock mode - HF token not configured)"
            return
        
        # Real API call using Hugging Face
        video_tasks[task_id]["message"] = "Generating video with AI..."
        video_tasks[task_id]["progress"] = 30
        
        # Generate video directly from text
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
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "api_configured": bool(os.getenv("HF_TOKEN"))
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
