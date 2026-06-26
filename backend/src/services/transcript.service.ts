import { Readable } from 'stream';
import { getObjectStream } from './r2.service';

/**
 * Helper to read stream into string.
 */
function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

/**
 * Fetches WebVTT subtitles from Cloudflare R2 and parses them into a clean text transcript.
 */
export async function getCleanTranscript(vttKey: string): Promise<string> {
  try {
    const { stream } = await getObjectStream(vttKey);
    const rawVtt = await streamToString(stream);
    
    // Parse WebVTT content:
    const clean = rawVtt
      .replace(/WEBVTT\r?\n/gi, '') // Remove WEBVTT header
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '') // Remove timestamps
      .replace(/\r?\n\d+/g, '') // Remove block indices
      .replace(/\n\s*\n/g, '\n') // Remove excessive empty lines
      .trim();
      
    return clean;
  } catch (error) {
    console.error(`[Transcript Service] Failed to clean transcript for ${vttKey}:`, error);
    return '';
  }
}
