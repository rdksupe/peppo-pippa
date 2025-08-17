# # LTX-Video FastAPI Endpoint

# This example creates a persistent FastAPI endpoint for the LTX-Video model
# that can be deployed and accessed via HTTP requests.

import string
import time
import base64
from pathlib import Path
from typing import Optional
from io import BytesIO

import modal
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

app = modal.App("ltx-video-api")

# Container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "accelerate==1.6.0",
        "diffusers==0.33.1",
        "hf_transfer==0.1.9",
        "imageio==2.37.0",
        "imageio-ffmpeg==0.5.1",
        "sentencepiece==0.2.0",
        "torch==2.7.0",
        "transformers==4.51.3",
        "fastapi[standard]==0.115.6",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

# Modal Volumes for storing models and outputs
VOLUME_NAME = "ltx-outputs"
outputs = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)
OUTPUTS_PATH = Path("/outputs")

MODEL_VOLUME_NAME = "ltx-model"
model = modal.Volume.from_name(MODEL_VOLUME_NAME, create_if_missing=True)
MODEL_PATH = Path("/models")
image = image.env({"HF_HOME": str(MODEL_PATH)})

# Pydantic models for API requests and responses
class VideoGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=500, description="Text prompt for video generation")
    negative_prompt: str = Field(default="", max_length=500, description="Negative prompt")
    num_inference_steps: int = Field(default=50, ge=10, le=200, description="Number of inference steps")
    guidance_scale: float = Field(default=4.5, ge=1.0, le=20.0, description="Guidance scale")
    num_frames: int = Field(default=150, ge=16, le=300, description="Number of frames to generate")
    width: int = Field(default=704, ge=256, le=1024, description="Video width")
    height: int = Field(default=480, ge=256, le=1024, description="Video height")

class VideoGenerationResponse(BaseModel):
    success: bool
    message: str
    video_filename: Optional[str] = None
    generation_time: Optional[float] = None
    error: Optional[str] = None

# LTX Video generation class
MINUTES = 60  # seconds

@app.cls(
    image=image,
    volumes={OUTPUTS_PATH: outputs, MODEL_PATH: model},
    gpu="H100",
    timeout=10 * MINUTES,
    container_idle_timeout=15 * MINUTES,  # Keep container warm for 15 minutes
)
class LTX:
    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import DiffusionPipeline

        print("Loading LTX-Video model...")
        self.pipe = DiffusionPipeline.from_pretrained(
            "Lightricks/LTX-Video", torch_dtype=torch.bfloat16
        )
        self.pipe.to("cuda")
        print("Model loaded successfully!")

    @modal.method()
    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        num_inference_steps: int = 50,
        guidance_scale: float = 4.5,
        num_frames: int = 150,
        width: int = 704,
        height: int = 480,
    ):
        from diffusers.utils import export_to_video
        
        start_time = time.time()
        print(f"Generating video for prompt: '{prompt}'")
        
        frames = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            num_frames=num_frames,
            width=width,
            height=height,
        ).frames[0]

        # Save to disk using prompt as filename
        mp4_name = slugify(prompt)
        video_path = Path(OUTPUTS_PATH) / mp4_name
        export_to_video(frames, video_path)
        outputs.commit()
        
        generation_time = time.time() - start_time
        print(f"Video generation completed in {generation_time:.2f} seconds")
        
        return {
            "filename": mp4_name,
            "generation_time": generation_time
        }

# FastAPI application
@app.function(
    image=image,
    volumes={OUTPUTS_PATH: outputs},
    container_idle_timeout=5 * MINUTES,
)
@modal.asgi_app()
def fastapi_app():
    web_app = FastAPI(
        title="LTX Video Generation API",
        description="Generate videos from text prompts using Lightricks LTX-Video model",
        version="1.0.0"
    )
    
    ltx = LTX()

    @web_app.post("/generate", response_model=VideoGenerationResponse)
    async def generate_video(request: VideoGenerationRequest):
        """Generate a video from text prompt"""
        try:
            print(f"Received generation request: {request.prompt}")
            
            result = ltx.generate.remote(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt,
                num_inference_steps=request.num_inference_steps,
                guidance_scale=request.guidance_scale,
                num_frames=request.num_frames,
                width=request.width,
                height=request.height,
            )
            
            return VideoGenerationResponse(
                success=True,
                message="Video generated successfully",
                video_filename=result["filename"],
                generation_time=result["generation_time"]
            )
            
        except Exception as e:
            print(f"Error generating video: {str(e)}")
            return VideoGenerationResponse(
                success=False,
                message="Video generation failed",
                error=str(e)
            )

    @web_app.get("/video/{filename}")
    async def get_video(filename: str):
        """Download a generated video file"""
        try:
            # Reload volume to see latest files
            outputs.reload()
            
            # Check if file exists
            if not filename.endswith('.mp4'):
                filename += '.mp4'
                
            video_data = b"".join(outputs.read_file(filename))
            
            return Response(
                content=video_data,
                media_type="video/mp4",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Video not found: {str(e)}")

    @web_app.get("/video/{filename}/base64")
    async def get_video_base64(filename: str):
        """Get a generated video file as base64"""
        try:
            # Reload volume to see latest files
            outputs.reload()
            
            # Check if file exists
            if not filename.endswith('.mp4'):
                filename += '.mp4'
                
            video_data = b"".join(outputs.read_file(filename))
            video_base64 = base64.b64encode(video_data).decode('utf-8')
            
            return JSONResponse({
                "filename": filename,
                "video_base64": video_base64,
                "size_bytes": len(video_data)
            })
            
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Video not found: {str(e)}")

    @web_app.get("/videos")
    async def list_videos():
        """List all generated videos"""
        try:
            outputs.reload()
            files = []
            
            # List all files in the outputs volume
            for item in outputs.listdir("/"):
                if item.path.endswith('.mp4'):
                    files.append({
                        "filename": item.path,
                        "size": item.size if hasattr(item, 'size') else None
                    })
            
            return JSONResponse({
                "videos": files,
                "count": len(files)
            })
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list videos: {str(e)}")

    @web_app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return JSONResponse({
            "status": "healthy",
            "service": "LTX Video Generation API",
            "timestamp": time.time()
        })

    @web_app.get("/")
    async def root():
        """Root endpoint with API information"""
        return JSONResponse({
            "service": "LTX Video Generation API",
            "version": "1.0.0",
            "endpoints": {
                "generate": "POST /generate - Generate video from text",
                "get_video": "GET /video/{filename} - Download video file",
                "get_video_base64": "GET /video/{filename}/base64 - Get video as base64",
                "list_videos": "GET /videos - List all generated videos",
                "health": "GET /health - Health check",
                "docs": "GET /docs - API documentation"
            }
        })

    return web_app

# Utility function for creating safe filenames
def slugify(prompt):
    """Convert prompt to safe filename"""
    for char in string.punctuation:
        prompt = prompt.replace(char, "")
    prompt = prompt.replace(" ", "_")
    prompt = prompt[:230]  # some OSes limit filenames to <256 chars
    mp4_name = str(int(time.time())) + "_" + prompt + ".mp4"
    return mp4_name
