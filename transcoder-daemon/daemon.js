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
  requestChecksumCalculation: 'WHEN_REQUIRED',
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
    
    // Check if the input video file contains an audio stream
    const hasAudio = await new Promise((resolve) => {
      exec(`ffprobe -loglevel error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${rawVideoPath}"`, (err, stdout) => {
        if (err) {
          console.warn(`[Job ${lessonId}] ffprobe failed to detect audio, assuming no audio:`, err);
          resolve(false);
        } else {
          resolve(stdout.trim().includes('audio'));
        }
      });
    });
    console.log(`[Job ${lessonId}] Input video has audio stream: ${hasAudio}`);

    // Detect the input video resolution to avoid upscaling
    const dimensions = await new Promise((resolve) => {
      exec(`ffprobe -loglevel error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${rawVideoPath}"`, (err, stdout) => {
        if (err) {
          console.warn(`[Job ${lessonId}] ffprobe failed to get dimensions, assuming 1920x1080:`, err);
          resolve({ width: 1920, height: 1080 });
        } else {
          const parts = stdout.trim().split('x');
          const width = parseInt(parts[0], 10) || 1920;
          const height = parseInt(parts[1], 10) || 1080;
          resolve({ width, height });
        }
      });
    });
    console.log(`[Job ${lessonId}] Input video dimensions: ${dimensions.width}x${dimensions.height}`);

    // Define standard quality levels (skipping 480p to reduce CPU overhead by 25%)
    const allTargets = [
      { name: '360p', width: 640, height: 360, vBitrate: '800k', vMaxrate: '856k', vBufsize: '1200k', aBitrate: '96k' },
      { name: '720p', width: 1280, height: 720, vBitrate: '2500k', vMaxrate: '2675k', vBufsize: '3750k', aBitrate: '128k' },
      { name: '1080p', width: 1920, height: 1080, vBitrate: '5000k', vMaxrate: '5350k', vBufsize: '7500k', aBitrate: '192k' }
    ];

    // Filter targets to prevent upscaling
    const targets = allTargets.filter(t => t.height <= dimensions.height);
    if (targets.length === 0) {
      targets.push(allTargets[0]); // fallback to 360p if height is extremely small
    }
    console.log(`[Job ${lessonId}] Target qualities to generate: ${targets.map(t => t.name).join(', ')}`);

    // Create stream subdirectories dynamically
    for (let i = 0; i < targets.length; i++) {
      fs.mkdirSync(path.join(outputDir, `stream_${i}`), { recursive: true });
    }

    // Build filter_complex with fast_bilinear scaling
    let filterComplex = '';
    const outputNames = [];
    if (targets.length === 1) {
      const t = targets[0];
      filterComplex = `[0:v]scale=w=${t.width}:h=${t.height}:flags=fast_bilinear[v1out]`;
      outputNames.push('v1out');
    } else {
      filterComplex = `[0:v]split=${targets.length}`;
      for (let i = 0; i < targets.length; i++) {
        filterComplex += `[v${i + 1}]`;
        outputNames.push(`v${i + 1}out`);
      }
      filterComplex += ';';
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        filterComplex += `[v${i + 1}]scale=w=${t.width}:h=${t.height}:flags=fast_bilinear[${outputNames[i]}];`;
      }
      if (filterComplex.endsWith(';')) {
        filterComplex = filterComplex.slice(0, -1);
      }
    }

    // Construct FFmpeg command dynamically
    let ffmpegCmd = `ffmpeg -y -i "${rawVideoPath}" -filter_complex "${filterComplex}" `;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      ffmpegCmd += `-map "[${outputNames[i]}]" `;
      if (hasAudio) {
        ffmpegCmd += `-map 0:a `;
      }
      // Using 'superfast' preset for a huge CPU speedup on Hugging Face while maintaining decent compression
      // Enforce 30fps frame rate and a keyframe interval of 60 frames (2 seconds) to guarantee clean HLS segment boundary splitting
      ffmpegCmd += `-c:v:${i} libx264 -preset:v:${i} superfast -b:v:${i} ${t.vBitrate} -maxrate:v:${i} ${t.vMaxrate} -bufsize:v:${i} ${t.vBufsize} -r 30 -g 60 -keyint_min 60 -sc_threshold 0 `;
    }

    if (hasAudio) {
      ffmpegCmd += `-c:a aac `;
      for (let i = 0; i < targets.length; i++) {
        ffmpegCmd += `-b:a:${i} ${targets[i].aBitrate} `;
      }
    }

    const varStreamMap = targets.map((_, i) => hasAudio ? `v:${i},a:${i}` : `v:${i}`).join(' ');

    // Use VOD playlist type, a 4-second segment duration, and mark segments as independent to prevent player pre-buffer limitations and playback lag
    ffmpegCmd += `-f hls -hls_time 4 -hls_playlist_type vod -hls_flags independent_segments -hls_segment_filename "${outputDir}/stream_%v/%03d.ts" -master_pl_name master.m3u8 -var_stream_map "${varStreamMap}" "${outputDir}/stream_%v/index.m3u8"`;

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

    // Run Whisper Transcription to generate English WebVTT subtitles
    const localVttPath = path.join(outputDir, 'subtitles_en.vtt');
    console.log(`[Job ${lessonId}] Generating AI subtitles using Whisper...`);
    try {
      await new Promise((resolve, reject) => {
        // Run Whisper using python3 in the virtual env we set up in Dockerfile
        const pythonPath = fs.existsSync('/opt/venv/bin/python3') ? '/opt/venv/bin/python3' : 'python3';
        exec(`${pythonPath} transcribe.py "${rawVideoPath}" "${localVttPath}" --model base`, (error, stdout, stderr) => {
          if (error) {
            console.error(`[Job ${lessonId}] Whisper script failed:`, stderr);
            return reject(error);
          }
          console.log(`[Job ${lessonId}] Whisper transcription completed successfully.`);
          resolve();
        });
      });
    } catch (whisperError) {
      console.warn(`[Job ${lessonId}] Subtitle generation failed. Continuing transcoding callback anyway:`, whisperError);
    }

    // D. Upload the transcoded HLS package to Cloudflare R2
    console.log(`[Job ${lessonId}] Uploading segments to Cloudflare R2...`);
    const filesToUpload = getAllFiles(outputDir);
    
    const BATCH_SIZE = 10;
    for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
      const batch = filesToUpload.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (filePath) => {
        const relativePath = path.relative(outputDir, filePath).replace(/\\/g, '/'); // Unix slashes
        const r2Key = `videos/processed/${lessonId}/${relativePath}`;
        const fileBuffer = fs.readFileSync(filePath);
        
        let contentType = 'application/octet-stream';
        if (relativePath.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
        if (relativePath.endsWith('.ts')) contentType = 'video/MP2T';
        if (relativePath.endsWith('.vtt')) contentType = 'text/vtt';

        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: r2Key,
          Body: fileBuffer,
          ContentType: contentType
        }));
      }));
    }
    console.log(`[Job ${lessonId}] Uploaded ${filesToUpload.length} files successfully.`);

    // E. Notify main backend callback
    const hlsKey = `videos/processed/${lessonId}/master.m3u8`;
    const hasVtt = fs.existsSync(localVttPath);
    console.log(`[Job ${lessonId}] Sending callback to backend...`);
    const callbackPayload = {
      lessonId,
      hlsKey,
      status: 'ready',
      subtitles: hasVtt ? [
        {
          lang: 'en',
          label: 'English',
          vttKey: `videos/processed/${lessonId}/subtitles_en.vtt`
        }
      ] : []
    };

    const callbackResp = await fetch(`${backendUrl}/api/upload/transcode-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Secret': workerSecret,
      },
      body: JSON.stringify(callbackPayload),
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
