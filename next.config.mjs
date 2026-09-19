import { withReticle } from '@reticlehq/next';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // WHY serverComponentsExternalPackages: on Vercel the pdf-parse route handler
  // is bundled by the RSC/server compiler, not the legacy webpack externals path
  // alone. Opting it out of bundling forces Node's require() at runtime, where
  // pdf-parse's native @napi-rs/canvas dependency resolves correctly instead of
  // breaking the serverless build. The webpack externals below remain as a belt-
  // and-suspenders for any code path webpack still compiles.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "@prisma/client", "prisma"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // WHY externals: pdf-parse v2 pulls in @napi-rs/canvas (a native module) plus
      // pdfjs-dist internals that can crash webpack's SSR compilation. Marking it
      // external defers resolution to Node's require() at request time, where these
      // native deps resolve correctly in the API route environment.
      config.externals = config.externals || [];
      config.externals.push({ "pdf-parse": "commonjs pdf-parse" });
    }
    return config;
  },
  // WHY poweredByHeader off: a production-safe trim — removes the framework tag
  // from response headers (a minor, free attack-surface reduction).
  poweredByHeader: false,
  
  // Rewrites to serve the new TanStack Start frontend
  // In development: frontend runs on port 8080, API on port 3000
  // In production: frontend is built and served from /dist
  async rewrites() {
    // API routes should always be handled by Next.js
    // All other routes should be served by the frontend
    
    // Check if frontend build exists
    const frontendDist = resolve(__dirname, 'frontend', 'dist');
    const indexHtmlPath = resolve(frontendDist, 'index.html');
    
    let frontendIndexHtml = null;
    try {
      frontendIndexHtml = readFileSync(indexHtmlPath, 'utf-8');
    } catch {
      // Frontend not built yet
    }
    
    return [
      // API routes - handle with Next.js
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      // Static assets from frontend
      {
        source: '/assets/:path*',
        destination: '/frontend/dist/assets/:path*',
      },
      // PWA chrome bundled into the frontend build (icon, install assets)
      {
        source: '/__grok/:path*',
        destination: '/frontend/dist/__grok/:path*',
      },
      // Favicon and other static files
      {
        source: '/favicon.svg',
        destination: '/frontend/dist/favicon.svg',
      },
      // Catch-all: serve frontend index.html for SPA routing
      {
        source: '/:path((?!api).*)',
        destination: '/frontend/dist/index.html',
      },
    ];
  },
};

export default withReticle(nextConfig);