# ðŸŽ“ VeoLMS Interview Preparation & Cheat Sheet Guide

This study guide is designed to help you prepare for your **1 to 1.5-hour live technical interview**. Even if you built this by following a video tutorial ("video coding"), this guide translates your codebase into clear concepts, explaining **what** you built, **why** you built it that way, and **how** it works under the hood so you can talk about it confidently.

---

## ðŸ“š Section 1: The Basics (What are Node.js & TypeScript?)

If they ask about TypeScript or Node.js in general, here is how you explain them:

### **1. What is Node.js?**
* **Plain English**: Node.js is a runtime that lets us run JavaScript code on the computer/server, instead of just inside a web browser.
* **Why we use it**: It uses an asynchronous, event-driven model which makes it very fast for handling multiple concurrent requests (like API routes, user logins, and fetching courses).

### **2. What is TypeScript?**
* **Plain English**: TypeScript is a "superset" of JavaScript. It adds **types** to JavaScript (e.g., specifying that a variable `userEmail` must be a `string`, or a database payload must match a certain schema).
* **Why we use it**:
  - **Catch errors early**: If we try to read a property that doesn't exist, TypeScript alerts us in our code editor immediately before we run it.
  - **Self-documenting code**: When you define interfaces (like what a `Lesson` or `Course` looks like), it makes the codebase much easier to maintain and understand.
  - **Compilation**: Browser engines can't run TypeScript directly. Before deploying, we run the compiler (`tsc`), which converts our TypeScript files into standard JavaScript inside the `dist/` directory.

---

## ðŸ”‘ Section 2: Deep-Dive into the Interview Questions

Here are the exact questions they will ask, along with the technical explanations you should give:

### 1. What did you build?
* **Your Answer**: "I built **VeoLMS**, a video-first Learning Management System. The core innovation isn't just serving standard MP4 videos, but rather a **decoupled, automated video ingestion pipeline**. When an admin uploads a video, it is automatically transcoded into adaptive, multi-bitrate HLS streams (360p, 720p, 1080p) and processed by an AI model (Whisper) to generate synchronized subtitles. On the frontend, students play these courses with zero buffering and automatic captions using the Vidstack React player."

---

### 2. Why did you choose MongoDB & Mongoose? (Database Choice)
* **The Question**: "Why choose a NoSQL database like MongoDB instead of a relational database like PostgreSQL?"
* **Your Answer**:
  - **Hierarchical Content Matching**: "LMS systems are naturally hierarchical (Courses contain Modules, which contain Lessons, which contain video keys, subtitles, and text documents). Storing this hierarchical structure in SQL requires complex tables with foreign keys and recursive joins. In MongoDB, we can store lessons and courses as documents, which maps directly to our TypeScript models."
  - **Flexibility**: "In early stages, schema changes are common. NoSQL document storage allows us to expand lesson metadata (like adding new subtitle languages or tracking states) without executing painful SQL database migrations."
  - **Mongoose Role**: "MongoDB is schema-less by default. We use Mongoose in TypeScript to define strict schemas on the application layer. This gives us document flexibility while enforcing data integrity (e.g. validating email formats or role types before saving to the database)."

---

### 3. How does your Authentication & Authorization work?
* **The Question**: "How do you know who is logged in, and how do you restrict access to admins?"
* **Your Answer**:
  1. **Token Generation**: "When a user logs in, we verify their password using `bcryptjs`. If correct, we generate a JWT (JSON Web Token) that contains their User ID, Email, Role, and a unique Session ID. We sign this token using a secure `JWT_SECRET` key stored on our server."
  2. **Authorization Headers**: "The frontend stores this token and sends it in the `Authorization: Bearer <token>` header for subsequent API calls."
  3. **Stateful Session Check (Crucial Detail!)**:
     - *Usually*, JWTs are stateless (you decode it and trust it). But if you need to revoke a session (e.g. user logs out, or password changes), stateless tokens are a security risk.
     - "To solve this, I implemented a **stateful check**. The authentication middleware decodes the JWT, extracts the `sessionId`, and verifies against our database that the session is still active (`Session.findById(sessionId)`). If the session was deleted, we deny access."
  4. **Authorization Middleware**: "We write a curried function `authorize('admin')`. If the decoded token's role isn't `'admin'`, we return a `403 Forbidden` error immediately, protecting administrative endpoints."

---

### 4. How does the Payment Flow work? (Razorpay Integration)
* **The Question**: "How do you handle course purchasing, and how do you prevent users from spoofing payments?"
* **Your Answer**:
  1. **Order Creation**: "The student clicks 'Buy'. The frontend calls our backend API. The backend communicates with Razorpay's API to create an order with the correct price. Razorpay returns an `order_id`."
  2. **Frontend Checkout**: "The frontend opens the Razorpay popup using the `order_id` and handles the card/UPI transaction."
  3. **Webhook Verification (The Security Shield)**:
     - "We don't trust the frontend to tell us if a payment was successful (which is easily faked)."
     - "Instead, we set up a Razorpay **Webhook** that notifies our backend directly when a payment succeeds."
     - "We read the raw request body and verify the cryptographic signature sent in the header using an HMAC SHA-256 hash. We compare our computed hash using the secret key with Razorpay's signature. If they match, we safely grant the student enrollment in the course."

---

### 5. Explain your Video Transcoding & AI Subtitle Pipeline
* **The Question**: "Why did you build this pipeline, and how does it work?"
* **Your Answer**:
  - **The Problem**: "Uploading large MP4s and serving them directly causes massive buffering, high bandwidth costs, and lack of accessibility."
  - **The Solution**: "I built a decoupled pipeline consisting of a **Cloudflare Worker** and a **Dockerized Transcoding Daemon**."
  - **Step-by-Step Flow**:
    1. **Pre-signed URL**: "Admin requests an upload URL. The backend generates a secure S3/R2 pre-signed URL so the browser uploads the large video directly to Cloudflare R2, bypassing backend CPU/bandwidth limitations."
    2. **Worker Handshake**: "Once uploaded, the backend notifies the Cloudflare Worker. The Worker acts as an asynchronous broker. Using `ctx.waitUntil()`, it calls the transcode daemon and instantly responds with `202 Accepted`. This releases the backend API thread."
    3. **Daemon Transcoding (FFmpeg)**: "The daemon downloads the video from R2, detects its dimensions, and uses FFmpeg to scale it into HLS quality profiles (360p, 720p, 1080p). It slices it into 4-second segment files (`.ts`) and outputs a `master.m3u8` index file."
    4. **AI Subtitles (Whisper)**: "The daemon runs a Python script using `faster-whisper` (a highly optimized version of OpenAI's Whisper model). It transcribes the audio into a `.vtt` caption file."
    5. **Callback**: "The daemon uploads the HLS files and subtitles back to R2, then triggers a POST callback to our backend, updating the lesson state to 'ready'."

---

### 6. What Cost Optimizations did you make?
* **The Question**: "How do you keep this system running cheaply?"
* **Your Answer**:
  1. **Cloudflare R2**: "R2 has zero egress fees. Traditional AWS S3 charges massive fees when students watch videos. R2 saves 100% of bandwidth egress costs."
  2. **Whisper Quantization (`int8`)**: "Instead of renting expensive GPU servers to run AI transcription, we use the `faster-whisper` model quantized to `int8`. This compresses the model size and allows it to run extremely fast on a cheap CPU server."
  3. **FFmpeg Preset Optimization**: "We use the `superfast` preset in FFmpeg. This speeds up transcoding by reducing compression iterations, saving CPU resources."
  4. **Intelligent Quality Filtering**: "We read the source video height first. If an admin uploads a 720p video, we skip generating a 1080p profile. We also skipped 480p scaling, which saves 25% of processing compute time."

---

### 7. What Security measures are in place?
* **The Question**: "How is this application protected against attacks?"
* **Your Answer**:
  - **API Rate Limiting**: "Used `express-rate-limit` to restrict API spamming (500 requests per 15 minutes, with a tighter 100 limit on authentication routes like login/signup to prevent brute force attacks)."
  - **Helmet Security Headers**: "Secured HTTP headers to prevent Clickjacking and basic script injection."
  - **Secrets Protection**: "The transcode worker and daemon verify tokens using strict custom headers (`X-Worker-Secret`, `X-Daemon-Secret`). External hackers cannot access the transcoder endpoints."
  - **CORS Configuration**: "Cross-Origin Resource Sharing is locked down. Only our specific frontend domain and edge Vercel links can request data from the API."

---

## ðŸ“‹ Section 3: Technical Q&A Practice (Simulated Interview)

Practice answering these tricky technical questions:

#### **Q: What is a JSON Web Token (JWT)?**
* **A**: "A JWT is a JSON object cryptographically signed by the server. It has three parts: Header, Payload, and Signature. Because it's signed, the server can trust the data inside without querying the database every time. However, to support logouts, we added a stateful session check."

#### **Q: What is HLS?**
* **A**: "HTTP Live Streaming. Instead of downloading a massive single 500MB MP4 file, HLS splits the video into hundreds of small 4-second `.ts` files. An index file called `master.m3u8` lists the files and available qualities. The player (Vidstack) automatically chooses the best quality segment based on the student's current network speed, preventing playback buffering."

#### **Q: Why run FFmpeg in a Docker container?**
* **A**: "FFmpeg and Python libraries (like Whisper) require specific system-level dependencies. If we run them directly on a host, setup is prone to OS-specific errors. Docker wraps the node daemon, python virtual environment, FFmpeg packages, and Whisper libraries in a single, isolated image, guaranteeing it runs identically in local testing and production."

#### **Q: How does `ctx.waitUntil()` work in Cloudflare Workers?**
* **A**: "Normally, a serverless function terminates as soon as you send a response. `ctx.waitUntil()` tells the Cloudflare runtime to keep running in the background to finish an asynchronous fetch request (calling our daemon) even *after* the client receives their HTTP response. This allows us to trigger backend tasks without blocking client actions."
