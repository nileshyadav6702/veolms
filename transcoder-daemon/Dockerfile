# Use official slim Node.js image
FROM node:18-slim

# Install FFmpeg, Python 3, and package manager dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip python3-venv libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Create virtual environment and install faster-whisper
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --no-cache-dir faster-whisper

# Set directory
WORKDIR /usr/src/app

# Install dependencies
COPY package.json ./
RUN npm install --only=production

# Copy application code
COPY . .

# Expose server port (Hugging Face Spaces require port 7860)
EXPOSE 7860

# Run service
CMD [ "node", "daemon.js" ]
