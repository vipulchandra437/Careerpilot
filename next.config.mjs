import { withReticle } from '@reticlehq/next';
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
};

export default withReticle(nextConfig);