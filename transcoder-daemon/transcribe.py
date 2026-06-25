#!/usr/bin/env python3
import sys
import os
import argparse
from faster_whisper import WhisperModel

def format_vtt_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"

def transcribe_video(video_path: str, output_path: str, model_size: str = "base"):
    # Load model. We run on CPU with int8 quantization for high speed on low-cost hosts
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    segments, info = model.transcribe(video_path, beam_size=5)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for i, segment in enumerate(segments):
            start = format_vtt_timestamp(segment.start)
            end = format_vtt_timestamp(segment.end)
            text = segment.text.strip()
            
            # Format single WebVTT entry
            f.write(f"{i + 1}\n")
            f.write(f"{start} --> {end}\n")
            f.write(f"{text}\n\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate WebVTT subtitles from video file using Whisper.")
    parser.add_argument("video", help="Path to input video file")
    parser.add_argument("output", help="Path to write VTT subtitle file")
    parser.add_argument("--model", default="base", help="Whisper model size (tiny, base, small)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.video):
        print(f"Error: Video file {args.video} not found.", file=sys.stderr)
        sys.exit(1)
        
    print(f"Starting Whisper transcription for: {args.video} using '{args.model}' model")
    transcribe_video(args.video, args.output, args.model)
    print("Transcription successfully saved to:", args.output)
