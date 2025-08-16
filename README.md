# AI Video Generation Web App

A minimal AI video generation web app that takes user prompts and generates short videos using AI models.

## Features

- 🎬 Text-to-video generation using Hugging Face Inference API
- 🚀 Fast and responsive React frontend
- ⚡ FastAPI backend with async processing
- 🔒 Secure API key management
- 🌐 Ready for cloud deployment
- 📱 Mobile-responsive design

## Live Demo

🔗 **[Live App](https://your-deployed-app-url.com)** *(Will be updated after deployment)*

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python)
- **AI Model**: Wan-AI/Wan2.2-TI2V-5B via Hugging Face
- **Deployment**: Railway/Render (cloud-ready)

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Hugging Face API token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rdksupe/peppo-pippa.git
   cd peppo-pippa
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Hugging Face token to .env file
   ```

3. **Install backend dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. **Run the application**
   ```bash
   # Start backend (from root directory)
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

   # Start frontend (in new terminal)
   cd frontend
   npm start
   ```

6. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Environment Variables

Create a `.env` file in the root directory:

```env
HF_TOKEN=your_huggingface_token_here
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Getting Hugging Face API Token

1. Sign up at [Hugging Face](https://huggingface.co/)
2. Go to your profile settings
3. Navigate to "Access Tokens"
4. Create a new token with read permissions
5. Add it to your `.env` file

## API Endpoints

- `POST /api/generate-video` - Generate video from text prompt
- `GET /api/video-status/{task_id}` - Check video generation status
- `GET /health` - Health check endpoint

## Deployment

### Railway Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy with automatic builds

### Render Deployment

1. Connect repository to Render
2. Configure build and start commands
3. Set environment variables
4. Deploy

### Manual Deployment

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Start production server
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Project Structure

```
peppo-pippa/
├── main.py                 # FastAPI backend
├── models/                 # Pydantic models
├── services/              # AI service integration
├── static/                # Static files
├── frontend/              # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
└── README.md
```

## Features & Enhancements

### Core Features
- ✅ Text-to-video generation
- ✅ Real-time generation status
- ✅ Video preview and download
- ✅ Responsive design

### Enhancements
- 🎨 Advanced prompt engineering
- 💾 Video caching system
- 📊 Generation history
- 🔄 Retry mechanism for failed generations
- 🎛️ Customizable video parameters (duration, style)

## Security

- API keys stored in environment variables
- CORS protection configured
- Input validation and sanitization
- Rate limiting (production ready)

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure your Runway ML API key is valid
   - Check API key permissions

2. **CORS Errors**
   - Verify FRONTEND_URL in environment variables
   - Check CORS configuration in main.py

3. **Deployment Issues**
   - Ensure all environment variables are set
   - Check build logs for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please open a GitHub issue or contact the development team.

---

Built with ❤️ for the Peppo AI Engineering Internship Challenge