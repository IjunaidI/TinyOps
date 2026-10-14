import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const MAX_RECORDING_BYTES = 300 * 1024 * 1024;

export default defineConfig({
  plugins: [{
    name: "local-showcase-capture",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__showcase/recording", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        const reply = (status: number, value: object) => {
          response.statusCode = status;
          response.end(JSON.stringify(value));
        };
        if (request.method !== "POST" || request.headers["x-showcase-capture"] !== "1") {
          reply(405, { error: "Capture POST required." });
          return;
        }
        const origin = request.headers.origin;
        if (origin && origin !== `http://${request.headers.host}`) {
          reply(403, { error: "Local same-origin capture only." });
          return;
        }
        const url = new URL(request.url || "/", "http://localhost");
        const name = url.searchParams.get("name") || "";
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(name)) {
          reply(400, { error: "Invalid clip name." });
          return;
        }
        const contentLength = Number(request.headers["content-length"] || 0);
        if (contentLength > MAX_RECORDING_BYTES) {
          reply(413, { error: "Recording exceeds the 300 MB limit." });
          request.resume();
          return;
        }
        const directory = resolve(server.config.root, "exports/jevtown/source");
        const filename = `${name}-${Date.now()}.webm`;
        const target = resolve(directory, filename);
        const temporary = `${target}.writing`;
        try {
          let bytes = 0;
          const chunks: Buffer[] = [];
          for await (const chunk of request) {
            bytes += chunk.length;
            if (bytes > MAX_RECORDING_BYTES) {
              reply(413, { error: "Recording exceeds the 300 MB limit." });
              request.resume();
              return;
            }
            chunks.push(Buffer.from(chunk));
          }
          const data = Buffer.concat(chunks);
          if (data.length < 4 || data.readUInt32BE(0) !== 0x1a45dfa3) {
            reply(400, { error: "A WebM recording is required." });
            return;
          }
          await mkdir(directory, { recursive: true });
          await writeFile(temporary, data, { flag: "wx" });
          await rename(temporary, target);
          reply(200, { saved: `exports/jevtown/source/${filename}`, bytes });
        } catch {
          await rm(temporary, { force: true }).catch(() => {});
          if (!response.writableEnded) reply(500, { error: "Could not save recording locally." });
        }
      });
    },
  }],
});
