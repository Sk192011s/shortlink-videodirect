import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const kv = await Deno.openKv();

function genCode(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Proxy ShortLink Generator</title>
<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc);
  font-family: 'Segoe UI', sans-serif;
}

.container {
  width: 95%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  text-align: center;
  padding: 40px 30px;
  animation: fadeIn 0.7s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

h1 {
  color: #1e293b;
  font-size: 28px;
  margin-bottom: 25px;
  letter-spacing: 0.5px;
}

.input-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 15px;
}

input {
  flex: 1;
  min-width: 250px;
  padding: 14px;
  font-size: 17px;
  border-radius: 10px;
  border: 2px solid #c7d2fe;
  transition: 0.3s;
}

input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 8px rgba(79,70,229,0.5);
  outline: none;
}

button {
  padding: 14px 22px;
  font-size: 17px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  background: #4338ca;
  transform: translateY(-2px);
}

#result {
  margin-top: 18px;
  font-size: 17px;
  word-break: break-word;
  color: #111;
}

.copy-btn {
  margin-left: 8px;
  padding: 8px 15px;
  font-size: 15px;
  border: none;
  border-radius: 8px;
  background: #10b981;
  color: white;
  cursor: pointer;
  transition: 0.3s;
}
.copy-btn:hover {
  background: #059669;
}

.warning {
  color: #dc2626;
  margin-top: 10px;
  font-size: 16px;
}

.change-box {
  margin-top: 35px;
  padding: 18px;
  border-radius: 14px;
  background: #eef2ff;
  border: 2px dashed #6366f1;
  transition: 0.3s;
}
.change-box:hover {
  background: #e0e7ff;
}
.change-box button {
  background: #2563eb;
  font-size: 16px;
  padding: 12px 18px;
}
.change-box button:hover {
  background: #1d4ed8;
}
</style>
</head>
<body>
  <div class="container">
    <h1>Proxy ShortLink Generator</h1>
    <div class="input-group">
      <input id="url" type="text" placeholder="🔗 Enter your video URL here..."/>
      <button id="generate">Generate</button>
    </div>
    <div id="result"></div>
    <div id="warning" class="warning"></div>

    <div class="change-box">
      <button onclick="window.location.href='https://kairizyyoteshin-media.deno.dev/'">🎬 Change Video</button>
    </div>
  </div>

<script>
document.getElementById("generate").onclick = async () => {
  const url = document.getElementById("url").value.trim();
  const warningEl = document.getElementById("warning");
  const resultEl = document.getElementById("result");
  warningEl.textContent = "";
  resultEl.innerHTML = "";

  if(!url) return warningEl.textContent="⚠️ Please enter a URL";
  if(!/^https?:\\/\\//.test(url)) return warningEl.textContent="⚠️ URL must start with http:// or https://";

  const resp = await fetch(window.location.origin + '/new?url=' + encodeURIComponent(url));
  const text = await resp.text();
  resultEl.innerHTML = '<b>✅ Generated Link:</b><br>' + text + '<button class="copy-btn" onclick="copyText()">Copy</button>';
  window.copyText = () => navigator.clipboard.writeText(text).then(()=>alert("Copied!"));
};
</script>
</body>
</html>`;

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/")
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });

  if (url.pathname === "/new") {
    const long = url.searchParams.get("url");
    if (!long) return new Response("Missing ?url=", { status: 400 });
    if (!/^https?:\/\//.test(long)) return new Response("Invalid URL", { status: 400 });

    let code;
    do { code = genCode(6); } while ((await kv.get(["proxy", code])).value);

    // No expire — permanent storage
    await kv.set(["proxy", code], { url: long, created: Date.now() });

    return new Response(`${url.origin}/p/${code}`, { headers: { "content-type": "text/plain" } });
  }

  if (url.pathname.startsWith("/p/")) {
    const code = url.pathname.split("/")[2];
    const record = await kv.get(["proxy", code]);
    if (!record.value) return new Response("Not found", { status: 404 });

    const target = (record.value as any).url;
    const range = req.headers.get("range");
    const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (compatible; DenoProxy/1.0)" };
    if (range) headers["Range"] = range;

    try {
      const upstream = await fetch(target, { headers });
      const respHeaders = new Headers();
      upstream.headers.forEach((v, k) => respHeaders.set(k, v));
      respHeaders.set("Access-Control-Allow-Origin", "*");
      respHeaders.set("Access-Control-Allow-Headers", "Range");
      return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    } catch {
      return new Response("Upstream fetch failed", { status: 502 });
    }
  }

  return new Response("Not found", { status: 404 });
});
