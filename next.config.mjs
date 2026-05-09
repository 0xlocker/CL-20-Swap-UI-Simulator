import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isGithubPages = process.env.GITHUB_PAGES === 'true'
const repoName = process.env.GITHUB_PAGES_REPO || 'CL-20-Swap-UI-Simulator'
const publicBasePath = isGithubPages ? `/${repoName}` : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: publicBasePath,
  assetPrefix: publicBasePath,
  trailingSlash: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: publicBasePath,
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
