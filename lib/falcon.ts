// lib/falcon.ts
import WebSocket from "ws";

// Fixed audio format — keep these constant; Phase 4 uses them for timing math.
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS = 16;

export interface FalconOptions {
  voiceId?: string;
  locale?: string;
  style?: string;
}

/** Sends text to Falcon and returns a valid WAV file (Buffer). */
export async function synthesize(text: string, opts: FalconOptions = {}): Promise<Buffer> {
  const apiKey = process.env.MURF_API_KEY;
  if (!apiKey) throw new Error("MURF_API_KEY is missing in .env.local");

  const url =
    `wss://global.api.murf.ai/v1/speech/stream-input` +
    `?api-key=${encodeURIComponent(apiKey)}` +
    `&model=FALCON&sample_rate=${SAMPLE_RATE}&channel_type=MONO&format=WAV`;

  return new Promise<Buffer>((resolve, reject) => {
    const ws = new WebSocket(url);
    const pcmChunks: Buffer[] = [];
    let firstChunk = true;

    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error("Falcon timed out after 60s"));
    }, 60000);

    ws.on("open", () => {
      // 1) voice config
      ws.send(JSON.stringify({
        voice_config: {
          voiceId: opts.voiceId ?? "Matthew",
          locale: opts.locale ?? "en-US",
          style: opts.style ?? "Conversation",
          rate: 0, pitch: 0, variation: 1,
        },
      }));
      // 2) the text, then close the context
      ws.send(JSON.stringify({ text, end: true }));
    });

    ws.on("message", (raw) => {
      const data = JSON.parse(raw.toString());
      if (data.audio) {
        let buf = Buffer.from(data.audio, "base64");
        // strip the 44-byte WAV header from the FIRST chunk only
        if (firstChunk && buf.length > 44) {
          buf = buf.subarray(44);
          firstChunk = false;
        }
        pcmChunks.push(buf);
      }
      if (data.final) {
        clearTimeout(timeout);
        ws.close();
        resolve(wrapWav(Buffer.concat(pcmChunks)));
      }
    });

    ws.on("error", (err) => { clearTimeout(timeout); reject(err); });
  });
}

/** Wraps raw 16-bit mono PCM in a correct WAV header. */
function wrapWav(pcm: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * CHANNELS * (BITS / 8);
  const blockAlign = CHANNELS * (BITS / 8);
  const dataSize = pcm.length;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + dataSize, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);            // PCM
  h.writeUInt16LE(CHANNELS, 22);
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(BITS, 34);
  h.write("data", 36);
  h.writeUInt32LE(dataSize, 40);
  return Buffer.concat([h, pcm]);
}