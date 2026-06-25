---
title: veolms-transcoder
emoji: 🎥
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# VeoLMS Transcoder Daemon

A lightweight Node.js daemon that transcodes uploaded raw video files into multi-bitrate HLS adaptive streaming packages (360p, 480p, 720p, 1080p + `master.m3u8`) using FFmpeg, and uploads the outputs back to Cloudflare R2.

---

## Deployment to Render & Hugging Face

To deploy this service on Hugging Face Spaces (or Render), it must be deployed as a **Docker Web Service** to automatically install `ffmpeg` and configure the environment:

1. Push this folder (`transcoder-daemon`) to a git repository.
2. Go to your Hugging Face space or Render dashboard.
3. Link your git repository.
4. Add the following **Environment Variables** in your space settings:
   - `PORT`: `7860` (Hugging Face default)
   - `DAEMON_SECRET`: A secure random password shared only with the Cloudflare Worker.
   - `R2_ACCOUNT_ID`: Your Cloudflare account ID.
   - `R2_ACCESS_KEY_ID`: Cloudflare R2 access key.
   - `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key.
   - `R2_BUCKET_NAME`: The R2 bucket where videos are stored.
