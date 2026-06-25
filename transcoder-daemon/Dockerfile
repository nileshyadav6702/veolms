# Use official slim Node.js image
FROM node:18-slim

# Install FFmpeg and clean up apt packages
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose server port
EXPOSE 8080

# Run service
CMD [ "node", "daemon.js" ]
