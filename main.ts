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
/* same CSS as before */
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
    <button onclick="window.location.href='https://kairizyyoteshin-media.deno.dev/'">Change Video</button>
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
  resultEl.innerHTML = text + '<button class="copy-btn" onclick="copyText()">Copy</button>';
  window.copyText = () => navigator.clipboard.writeText(text).then(()=>alert("Copied!"));
}
</script>
</body></html>`;

serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/") return new Response(html, { headers: { "content-type": "text/html" } });

  if (url.pathname === "/new") {
    const long = url.searchParams.get("url");
    if (!long) return new Response("Missing ?url=", { status: 400 });
    if (!/^https?:\/\//.test(long)) return new Response("URL must start with http:// or https://", { status: 400 });

    let code;
    do {
      code = genCode(6);
    } while ((await kv.get(["proxy", code])).value);

    await kv.set(["proxy", code], { url: long, created: Date.now() });

    return new Response(`${url.origin}/p/${code}`, {
      headers: { "content-type": "text/plain" },
    });
  }

  if (url.pathname.startsWith("/p/")) {
    const code = url.pathname.split("/")[2];
    const record = await kv.get(["proxy", code]);
    if (!record.value) return new Response("Not found", { status: 404 });
    const target = (record.value as any).url;
    const range = req.headers.get("range");
    const headers = { "User-Agent": "Mozilla/5.0 (compatible; DenoProxy/1.0)" };
    if (range) headers["Range"] = range;
    try {
      const upstream = await fetch(target, { headers });
      const respHeaders = new Headers();
      upstream.headers.forEach((v, k) => respHeaders.set(k, v));
      respHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    } catch {
      return new Response("Upstream fetch failed", { status: 502 });
    }
  }

  return new Response("Not found", { status: 404 });
});
