import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  basePath: process.env.GITHUB_ACTIONS === 'true' ? '/nupoo' : '',
}

export default nextConfig
