const express = require('express');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Request Received] Method: ${req.method} | URL: ${req.url} | Headers: ${JSON.stringify(req.headers)}`);
  next();
});

const PORT = process.env.PORT || 7860;

// Initialize S3 Client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Middleware to verify secret from Cloudflare Worker
function verifyWorker(req, res, next) {
  const daemonSecret = req.headers['x-daemon-secret'];
  if (daemonSecret !== process.env.DAEMON_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

app.get('/', (req, res) => {
  res.json({ status: 'online', service: 'VeoLMS Transcoder Daemon' });
});

app.post('/transcode', verifyWorker, async (req, res) => {
  const { lessonId, videoKey, backendUrl, workerSecret } = req.body;

  // 1. Instantly respond 202 Accepted to the Cloudflare Worker
  res.status(202).json({ success: true, message: 'Transcoding job initiated' });

  // 2. Start background transcoding execution
  try {
    console.log(`[Job ${lessonId}] Starting transcoding for: ${videoKey}`);
    
    // Create temporary work directories
    const tempDir = path.join(__dirname, 'temp', lessonId);
    fs.mkdirSync(tempDir, { recursive: true });

    const rawVideoPath = path.join(tempDir, 'raw-input.mp4');
    const outputDir = path.join(tempDir, 'processed');
    fs.mkdirSync(outputDir, { recursive: true });

    // A. Generate a presigned URL to download the raw video from R2
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: videoKey,
    });
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    // B. Download the raw video file
    console.log(`[Job ${lessonId}] Downloading raw video...`);
    const downloadResp = await fetch(downloadUrl);
    if (!downloadResp.ok) {
      throw new Error(`Failed to download raw video: ${downloadResp.statusText}`);
    }
    const arrayBuffer = await downloadResp.arrayBuffer();
    fs.writeFileSync(rawVideoPath, Buffer.from(arrayBuffer));
    console.log(`[Job ${lessonId}] Download complete. size: ${arrayBuffer.byteLength} bytes`);

    // C. Execute FFmpeg Multi-Bitrate HLS encoding command
    console.log(`[Job ${lessonId}] Running FFmpeg multi-quality compression...`);
    
    // Create stream subdirectories for FFmpeg to write segment chunks into
    fs.mkdirSync(path.join(outputDir, 'stream_0'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'stream_1'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'stream_2'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'stream_3'), { recursive: true });

    const ffmpegCmd = `ffmpeg -y -i "${rawVideoPath}" \
      -filter_complex "[0:v]split=4[v1][v2][v3][v4]; \
                       [v1]scale=w=640:h=360[v1out]; \
                       [v2]scale=w=854:h=480[v2out]; \
                       [v3]scale=w=1280:h=720[v3out]; \
                       [v4]scale=w=1920:h=1080[v4out]" \
      -map "[v1out]" -map 0:a -c:v:0 libx264 -b:v:0 800k -maxrate:v:0 856k -bufsize:v:0 1200k \
      -map "[v2out]" -map 0:a -c:v:1 libx264 -b:v:1 1400k -maxrate:v:1 1498k -bufsize:v:1 2100k \
      -map "[v3out]" -map 0:a -c:v:2 libx264 -b:v:2 2800k -maxrate:v:2 2996k -bufsize:v:2 4200k \
      -map "[v4out]" -map 0:a -c:v:3 libx264 -b:v:3 5000k -maxrate:v:3 5350k -bufsize:v:3 7500k \
      -c:a aac -b:a:0 96k -b:a:1 128k -b:a:2 128k -b:a:3 192k \
      -f hls \
      -hls_time 6 \
      -hls_playlist_type event \
      -hls_segment_filename "${outputDir}/stream_%v/%03d.ts" \
      -master_pl_name master.m3u8 \
      "${outputDir}/stream_%v/index.m3u8"`;

    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Job ${lessonId}] FFmpeg error:`, stderr);
          return reject(error);
        }
        console.log(`[Job ${lessonId}] FFmpeg command completed successfully.`);
        resolve();
      });
    });

    // D. Upload the transcoded HLS package to Cloudflare R2
    console.log(`[Job ${lessonId}] Uploading segments to Cloudflare R2...`);
    const filesToUpload = getAllFiles(outputDir);
    
    for (const filePath of filesToUpload) {
      const relativePath = path.relative(outputDir, filePath).replace(/\\/g, '/'); // Unix slashes
      const r2Key = `videos/processed/${lessonId}/${relativePath}`;
      const fileStream = fs.createReadStream(filePath);
      
      let contentType = 'application/octet-stream';
      if (relativePath.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
      if (relativePath.endsWith('.ts')) contentType = 'video/MP2T';

      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: r2Key,
        Body: fileStream,
        ContentType: contentType
      }));
    }
    console.log(`[Job ${lessonId}] Uploaded ${filesToUpload.length} files successfully.`);

    // E. Notify main backend callback
    const hlsKey = `videos/processed/${lessonId}/master.m3u8`;
    console.log(`[Job ${lessonId}] Sending callback to backend...`);
    const callbackResp = await fetch(`${backendUrl}/api/upload/transcode-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Secret': workerSecret,
      },
      body: JSON.stringify({
        lessonId,
        hlsKey,
        status: 'ready',
      }),
    });

    if (callbackResp.ok) {
      console.log(`[Job ${lessonId}] Transcoding cycle complete! Lesson database updated.`);
    } else {
      console.error(`[Job ${lessonId}] Backend callback failed with status: ${callbackResp.status}`);
    }

    // F. Cleanup temp workspace files
    cleanTempFolder(tempDir);

  } catch (error) {
    console.error(`[Job ${lessonId}] Transcoding failed:`, error);
    
    // Notify backend callback of failure
    try {
      await fetch(`${backendUrl}/api/upload/transcode-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Secret': workerSecret,
        },
        body: JSON.stringify({
          lessonId,
          hlsKey: '',
          status: 'error',
        }),
      });
    } catch (err) {
      console.error('Failed to notify backend of error:', err);
    }
  }
});

// Helper: Recursively retrieve all file paths in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

// Helper: Secure cleanup of directories
function cleanTempFolder(folderPath) {
  try {
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`Cleaned up directory: ${folderPath}`);
    }
  } catch (err) {
    console.error(`Failed to clean directory ${folderPath}:`, err);
  }
}

app.listen(PORT, () => {
  console.log(`VeoLMS Transcoder Daemon running on port ${PORT}`);
});
