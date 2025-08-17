# peppo-pippa

This was done as a part of an internship application and was prototyped in a constrained timeline of 24 hrs.

## System Architecture

The task was quite interesting to me mainly because of dearth of hobbyist/free access to most major proprietrary image-video or text-video models. Hence , I was forced to consider alternate options which led me to Modal labs which surprisingly have a generous 30 USD / month free tier and have a per request pricing model where the deployed models are treated like serverless instances and charged accordingly , hence I ended up using it for the model deployment part for the other standard deployment I utilised google cloud run mainly because its the only major cloud company which offers near instantaneous cold starts , as opposed to the atrocious onrender limits. Other than that I experimented with various prompt parameteres and found out that adding very specific camera angles , lightnning effects etc also greatly affects the final model output however as I was highly resourse contrained with regards with my compute availability I was not able to realise the complete potential out of the LTX model.

### Inference Pipeline

The application implements a multi-stage inference pipeline that processes user inputs through several AI models:

1. **Prompt Enhancement Stage** (Optional)
   - Uses Groq's Llama-4-Scout-17B model to enhance user prompts
   - Adds cinematic details, camera movements, lighting, and atmospheric elements
   - Incorporates user customization preferences (style, camera angle, lighting, mood, etc.)
   - Fallback mechanism reverts to original prompt if enhancement fails

2. **Video Generation Stage**
   - Leverages Lightricks' LTX Video model deployed on Modal Labs infrastructure
   - Processes enhanced prompts with configurable parameters:
     - Frame count: 90-300 frames (3-10 seconds at 30 FPS)
     - Inference steps: 50 (optimized for quality/speed balance)
     - Guidance scale: 4.5 (controls adherence to prompt)
   - Returns high-quality MP4 videos ready for web consumption

3. **Video Processing Stage**
   - Downloads generated videos from Modal's endpoint
   - Stores videos locally in the static directory
   - Serves videos through FastAPI's static file serving
   - Provides direct download links with proper CORS headers

### Model Details

**Primary Video Generation Model**: Lightricks LTX Video
- Architecture: Transformer-based video diffusion model
- Input: Text prompts up to 500 characters
- Output: MP4 videos at 768x512 resolution
- Frame rate: 30 FPS
- Duration: 3-10 seconds configurable

**Prompt Enhancement Model**: Meta Llama-4-Scout-17B-16E-Instruct
- Hosted on Groq's inference platform
- Specialized for creative and cinematic prompt enhancement
- Temperature: 0.7 for balanced creativity and coherence
- Max tokens: 500 for comprehensive enhancements


### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/rdksupe/peppo-pippa.git
   cd peppo-pippa
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Install dependencies**
   ```bash
   # Backend dependencies
   pip install -r requirements.txt
   
   # Frontend dependencies
   cd frontend && npm install && cd ..
   ```

4. **Start development servers**
   ```bash
   # Backend server (terminal 1)
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend server (terminal 2)
   cd frontend && npm start
   ```

5. **Access the application**
   - Web Interface: http://localhost:3000
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

## Configuration

### Required Environment Variables

```env
# AI Service API Keys
GROQ_API_KEY=your_groq_api_key_here
# Application Configuration
PORT=8080
FRONTEND_URL=https://your-frontend-domain.com
APP_URL=https://your-app-domain.com
```

### API Key Setup

**Groq API Key**
1. Register at https://console.groq.com/
2. Navigate to API Keys section
3. Generate a new API key with appropriate permissions
4. Add to environment variables
## API Endpoints

### Video Generation
- `POST /api/generate-video` - Initiate video generation
- `GET /api/video-status/{task_id}` - Poll generation status
- `GET /static/videos/{filename}` - Serve generated videos

### System Endpoints
- `GET /health` - Application health check
- `GET /api` - API information endpoint
- `GET /docs` - Interactive API documentation

### Request/Response Schema

**Video Generation Request**
```json
{
  "prompt": "A cat playing with a ball of yarn",
  "duration": 5,
  "use_enhanced_prompt": true,
  "customization": {
    "style": "cinematic",
    "camera_angle": "close-up",
    "lighting": "natural",
    "movement": "slow-motion",
    "mood": "peaceful"
  }
}
```

**Status Response**
```json
{
  "task_id": "uuid-string",
  "status": "completed",
  "progress": 100,
  "video_url": "/static/videos/video_uuid.mp4",
  "original_prompt": "Original user input",
  "enhanced_prompt": "AI-enhanced version",
  "created_at": "ISO datetime"
}
```

