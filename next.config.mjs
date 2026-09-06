/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
