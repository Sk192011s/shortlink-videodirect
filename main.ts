import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download Page</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f0f0f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    h1 {
      color: #333;
      margin-bottom: 40px;
    }
    .download-container {
      display: flex;
      gap: 30px;
      justify-content: center;
    }
    .download-box {
      background: #fff;
      padding: 30px 40px;
      border-radius: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      text-align: center;
      transition: transform 0.2s;
    }
    .download-box:hover {
      transform: translateY(-5px);
    }
    .download-box a {
      display: inline-block;
      margin-top: 15px;
      padding: 12px 25px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      transition: background-color 0.2s;
    }
    .download-box a:hover {
      background-color: #45a049;
    }
    footer {
      margin-top: 50px;
      font-size: 14px;
      color: #777;
    }
  </style>
</head>
<body>
  <h1>Download Page</h1>
  <div class="download-container">
    <div class="download-box">
      <h3>Change Video</h3>
      <a href="https://kairizyyoteshin-media.deno.dev/" target="_blank">Go</a>
    </div>
    <div class="download-box">
      <h3>Change Link</h3>
      <a href="https://kairizymoviesshorklink.deno.dev/" target="_blank">Go</a>
    </div>
  </div>
  <footer>Created By Kairizy.</footer>
</body>
</html>
`;

serve((_req) => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }));
