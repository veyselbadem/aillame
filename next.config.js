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
};

module.exports = nextConfig;
