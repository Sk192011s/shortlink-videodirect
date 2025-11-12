import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const kv = await Deno.openKv();

function genCode(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Proxy ShortLink Generator</title>
<style>
html, body {
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  display: flex;
  justify-content: center;
  align-items: center;
}
.container {
  width: 90%;
  max-width: 600px;
  background: #fff;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  text-align: center;
}
h1 {
  font-size: 28px;
  margin-bottom: 25px;
  color: #111827;
}
.input-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
input {
  flex: 1 1 auto;
  min-width: 250px;
  padding: 14px;
  font-size: 18px;
  border: 2px solid #d1d5db;
  border-radius: 10px;
  transition: 0.3s;
}
input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 5px rgba(79,70,229,0.5);
  outline: none;
}
button {
  padding: 14px 22px;
  font-size: 18px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.3s;
}
button:hover {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.15);
}
#result {
  margin-top: 25px;
  font-size: 18px;
  color: #111;
  word-break: break-word;
}
.copy-btn {
  padding: 6px 12px;
  margin-left: 10px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 6px;
  border: none;
  background: #10b981;
  color: #fff;
  transition: 0.3s;
}
.copy-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}
.warning {
  color: #b91c1c;
  margin-top: 10px;
  font-size: 16px;
}
.change-box {
  margin-top: 35px;
  background: #f3f4f6;
  padding: 16px;
  border-radius: 10px;
}
.change-btn {
  background: #2563eb;
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: 0.3s;
}
.change-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}
</style>
</head>
<body>
<div class="container">
  <h1>Proxy ShortLink Generator</h1>
  <div class="input-group">
    <input id="url" type="text" placeholder="Enter your URL here"/>
    <button id="generate">Generate</button>
  </div>
  <div id="result"></div>
  <div id="warning" class="warning"></div>
  <div class="change-box">
    <button class="change-btn" onclick="window.location.href='https://kairizyyoteshin-media.deno.dev/'">Change Video</button>
  </div>
</div>

<script>
document.getElementById("generate").onclick = async () => {
  const url = document.getElementById("url").value.trim();
  const warningEl = document.getElementById("warning");
  const resultEl = document.getElementById("result");
  warningEl.textContent = "";
  resultEl.innerHTML = "";

  if (!url) return warningEl.textContent = "⚠️ Please enter a URL";
  if (!/^https?:\\/\\//.test(url)) return warningEl.textContent = "⚠️ URL must start with http:// or https://";

  const resp = await fetch('/new?url=' + encodeURIComponent(url));
  const text = await resp.text();
  resultEl.innerHTML = text + '<button class="copy-btn" onclick="copyText()">Copy</button>';
  window.copyText = () => {
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
  };
};
</script>
</body>
</html>
`;

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/")
    return new Response(html, { headers: { "content-type": "text/html" } });

  if (url.pathname === "/new") {
    const long = url.searchParams.get("url");
    if (!long) return new Response("Missing ?url=", { status: 400 });
    if (!/^https?:\/\//.test(long))
      return new Response("URL must start with http:// or https://", { status: 400 });

    let code, tries = 0;
    do {
      code = genCode(6);
      const existing = await kv.get(["proxy", code]);
      if (!existing.value) break;
      tries++;
    } while (tries < 20);

    await kv.set(["proxy", code], { url: long, created: Date.now() });
    return new Response(`https://${url.host}/p/${code}`, {
      headers: { "content-type": "text/plain" },
    });
  }

  if (url.pathname.startsWith("/p/")) {
    const code = url.pathname.split("/")[2];
    if (!code) return new Response("Missing code", { status: 400 });

    const record = await kv.get(["proxy", code]);
    if (!record.value) return new Response("Not found", { status: 404 });

    const target = record.value.url;
    if (!/^https?:\/\//.test(target))
      return new Response("Invalid target URL", { status: 400 });

    const range = req.headers.get("range");
    const headers = {};
    if (range) headers["Range"] = range;
    headers["User-Agent"] = "Mozilla/5.0 (compatible; DenoProxy/1.0)";

    let upstream;
    try {
      upstream = await fetch(target, { method: "GET", headers, redirect: "follow" });
    } catch {
      return new Response("Upstream fetch failed", { status: 502 });
    }

    if (!upstream.ok && upstream.status !== 206)
      return new Response(`Upstream error: ${upstream.status}`, { status: 502 });

    const respHeaders = new Headers();
    const ct = upstream.headers.get("content-type") ?? "application/octet-stream";
    respHeaders.set("Content-Type", ct);
    const cl = upstream.headers.get("content-length");
    if (cl) respHeaders.set("Content-Length", cl);
    const ar = upstream.headers.get("accept-ranges");
    if (ar) respHeaders.set("Accept-Ranges", ar);
    const cr = upstream.headers.get("content-range");
    if (cr) respHeaders.set("Content-Range", cr);
    respHeaders.set("Cache-Control", "no-store");
    respHeaders.set("Access-Control-Allow-Origin", "*");
    respHeaders.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    respHeaders.set("Access-Control-Allow-Headers", "Range");

    return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
  }

  return new Response("Not found", { status: 404 });
});
