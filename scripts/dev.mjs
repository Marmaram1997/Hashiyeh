// Zero-dependency static dev server: `npm run dev` then open http://localhost:3000
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT) || 3000;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm", ".m4a": "audio/mp4" };

http.createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(root, p);
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    const ct = types[extname(file)] || "application/octet-stream", m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m) {   // byte ranges, so audio and video can be sought (like Vercel)
      const a = m[1] === "" ? Math.max(0, body.length - +m[2]) : +m[1], b = m[1] !== "" && m[2] !== "" ? Math.min(+m[2], body.length - 1) : body.length - 1;
      res.writeHead(206, { "Content-Type": ct, "Accept-Ranges": "bytes", "Content-Range": `bytes ${a}-${b}/${body.length}`, "Content-Length": b - a + 1, "Cache-Control": "no-store" });
      res.end(body.subarray(a, b + 1));
    } else {
      res.writeHead(200, { "Content-Type": ct, "Accept-Ranges": "bytes", "Content-Length": body.length, "Cache-Control": "no-store" });
      res.end(body);
    }
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(port, () => console.log(`Hashiyeh dev server: http://localhost:${port}`));
