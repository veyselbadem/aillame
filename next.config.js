const isStaticExport = process.env.NEXT_EXPORT === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  // Tauri için trailingSlash bazen daha iyidir
  trailingSlash: true,
  // Webpack optimizasyonları
  webpack: (config) => {
    config.externals.push({
      'canvas': 'commonjs canvas',
    });
    return config;
  },
  // Native modüller için external paketi olarak işaretle
  serverExternalPackages: ["node-llama-cpp", "stable-diffusion-cpp-node-api", "sharp", "better-sqlite3"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
