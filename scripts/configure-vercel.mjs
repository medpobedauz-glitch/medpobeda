import fs from 'node:fs';
const origin = new URL(process.argv[2] || process.env.BACKEND_ORIGIN || '');
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Provide the backend HTTPS origin, without a path or credentials.');
}
const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  trailingSlash: false,
  rewrites: [
    { source: '/api/:path*', destination: `${origin.origin}/api/:path*` },
    { source: '/media/:path*', destination: `${origin.origin}/media/:path*` },
    { source: '/health', destination: `${origin.origin}/health` },
    { source: '/:path*', destination: '/index.html' },
  ],
  headers: [{ source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] }],
};
fs.writeFileSync(new URL('../vercel.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
console.log('Configured Vercel frontend and same-origin API/media proxy:', origin.origin);
