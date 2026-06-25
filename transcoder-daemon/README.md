# VeoLMS Transcoder Daemon

A lightweight Node.js daemon that transcodes uploaded raw video files into multi-bitrate HLS adaptive streaming packages (360p, 480p, 720p, 1080p + `master.m3u8`) using FFmpeg, and uploads the outputs back to Cloudflare R2.

---

## Deployment to Render

To deploy this service on Render, it must be deployed as a **Docker Web Service** to automatically install `ffmpeg` and configure the environment:

1. Push this folder (`transcoder-daemon`) to a git repository (GitHub, GitLab, etc.).
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Link your git repository.
4. Set the following options:
   - **Name**: `veolms-transcoder-daemon`
   - **Runtime**: `Docker` (automatically detected from the `Dockerfile`)
   - **Instance Type**: Select **Starter** or higher (minimum **1 CPU / 2 GB RAM** recommended to prevent out-of-memory errors on large transcoding tasks).
5. Add the following **Environment Variables** in Render's dashboard:
   - `PORT`: `8080` (or leave empty, Dockerfile configures it)
   - `DAEMON_SECRET`: A secure random password shared only with the Cloudflare Worker.
   - `R2_ACCOUNT_ID`: Your Cloudflare account ID.
   - `R2_ACCESS_KEY_ID`: Cloudflare R2 access key.
   - `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key.
   - `R2_BUCKET_NAME`: The R2 bucket where videos are stored.
6. Click **Deploy Web Service**.

Once deployed, copy the service URL (e.g. `https://veolms-transcoder-daemon.onrender.com`) and paste it as the `VPS_DAEMON_URL` in your **Cloudflare Worker**'s variables.
