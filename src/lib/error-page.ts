// @ts-nocheck
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Something went wrong — NutroPact</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
      .card{max-width:480px;text-align:center}
      h1{font-size:24px;margin:0 0 8px}
      p{color:#666;margin:0 0 24px}
      a{display:inline-block;background:#f97316;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Something went wrong</h1>
      <p>We hit an unexpected error. Please try again.</p>
      <a href="/">Go home</a>
    </div>
  </body>
</html>`;
}
