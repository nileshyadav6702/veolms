export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 1. Verify token secret from VeoLMS Backend
    const workerSecret = request.headers.get('X-Worker-Secret');
    if (!workerSecret || workerSecret !== env.WORKER_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const { lessonId, videoKey } = await request.json();
      if (!lessonId || !videoKey) {
        return new Response('Missing lessonId or videoKey', { status: 400 });
      }

      const targetUrl = `${env.VPS_DAEMON_URL.replace(/\/$/, '')}/transcode`;
      console.log(`[Worker] Dispatching transcode request to: ${targetUrl}`);

      // 2. Trigger Hugging Face Transcoder Daemon (Fire and Forget)
      ctx.waitUntil(
        fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Daemon-Secret': env.DAEMON_SECRET,
          },
          body: JSON.stringify({
            lessonId,
            videoKey,
            backendUrl: env.BACKEND_URL,
            workerSecret: env.WORKER_SECRET
          }),
        }).then(response => {
          console.log(`Hugging Face Space responded with status: ${response.status}`);
        }).catch(err => {
          console.error('Error contacting Hugging Face Space:', err);
        })
      );

      // 3. Return 202 Accepted immediately to release the backend request
      return new Response(
        JSON.stringify({ success: true, message: 'Transcoding job forwarded to Hugging Face Space' }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
