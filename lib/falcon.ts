// lib/falcon.ts
import WebSocket from "ws";

const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS = 16;

const ENDPOINTS = [
  process.env.MURF_WS_HOST,
  "wss://us-east.api.murf.ai",
  "wss://global.api.murf.ai",
].filter(Boolean) as string[];

export interface FalconOptions { voiceId?: string; locale?: string; style?: string; }

const isFatal = (m: string) => /401|402|403|unauthor|invalid api|insufficient|exceed|quota|limit/i.test(m);

export async function synthesize(text: string, opts: FalconOptions = {}): Promise<Buffer> {
  if (!process.env.MURF_API_KEY) throw new Error("MURF_API_KEY missing in .env.local");
  if (!text?.trim()) throw new Error("Empty text passed to Falcon");

  const hosts = [...new Set(ENDPOINTS)];
  let lastErr: Error | null = null;

  for (const host of hosts) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await synthesizeOnce(host, text, opts);
      } catch (e: any) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        console.warn(`[falcon] ${host} attempt ${attempt} failed: ${lastErr.message}`);
        if (isFatal(lastErr.message)) throw lastErr;
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw lastErr ?? new Error("Falcon failed");
}

function synthesizeOnce(host: string, text: string, opts: FalconOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const apiKey = process.env.MURF_API_KEY!;
    const url =
      `${host}/v1/speech/stream-input` +
      `?api-key=${encodeURIComponent(apiKey)}` +
      `&model=FALCON&sample_rate=${SAMPLE_RATE}&channel_type=MONO&format=WAV`;

    const ws = new WebSocket(url);
    const pcm: Buffer[] = [];
    let first = true;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => (pcm.length ? resolve(wrapWav(Buffer.concat(pcm))) : reject(new Error("Falcon timed out (90s) with no audio"))));
    }, 90000);

    ws.on("unexpected-response", (_req, res) => {
      finish(() => reject(new Error(`Falcon handshake HTTP ${res.statusCode} (401=bad key, 402/403=quota/forbidden)`)));
    });

    ws.on("open", () => {
      ws.send(JSON.stringify({
        voice_config: {
          voiceId: opts.voiceId ?? "Matthew",
          locale: opts.locale ?? "en-US",
          style: opts.style ?? "Conversation",
          rate: 0, pitch: 0, variation: 1,
        },
      }));
      ws.send(JSON.stringify({ text, end: true }));
    });

    ws.on("message", (raw) => {
      let d: any;
      try { d = JSON.parse(raw.toString()); } catch { return; }
      const msg = d.error || d.errorMessage || d.message;
      if (typeof msg === "string" && /error|invalid|denied|exceed|limit|insufficient|unauthor/i.test(msg)) {
        return finish(() => reject(new Error(`Falcon server message: ${msg}`)));
      }
      if (d.audio) {
        let b = Buffer.from(d.audio, "base64");
        if (first && b.length > 44) { b = b.subarray(44); first = false; }
        pcm.push(b);
      }
      if (d.final || d.isFinal) finish(() => resolve(wrapWav(Buffer.concat(pcm))));
    });

    ws.on("close", (code, reasonBuf) => {
      const reason = reasonBuf?.toString?.() || "";
      finish(() =>
        pcm.length
          ? resolve(wrapWav(Buffer.concat(pcm)))
          : reject(new Error(`Falcon closed (code ${code}${reason ? `, "${reason}"` : ""}) before any audio`))
      );
    });

    ws.on("error", (err) => finish(() => reject(err instanceof Error ? err : new Error(String(err)))));
  });
}

function wrapWav(pcm: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * CHANNELS * (BITS / 8);
  const blockAlign = CHANNELS * (BITS / 8);
  const dataSize = pcm.length;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + dataSize, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(CHANNELS, 22); h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(byteRate, 28); h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(BITS, 34); h.write("data", 36); h.writeUInt32LE(dataSize, 40);
  return Buffer.concat([h, pcm]);
}