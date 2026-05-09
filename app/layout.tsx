import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const publicBasePath = process.env.GITHUB_PAGES === 'true' ? `/${process.env.GITHUB_PAGES_REPO || 'CL-20-Swap-UI-Simulator'}` : ''
const publicAsset = (path: string) => `${publicBasePath}${path}`

export const metadata: Metadata = {
  title: 'CL-20 Swap UI Simulator',
  description: 'Static simulator for CL-20 swap, lock, verify, and unlock flows',
  manifest: publicAsset('/site.webmanifest'),
  icons: {
    icon: [
      {
        url: publicAsset('/favicon.ico'),
        sizes: 'any',
      },
      {
        url: publicAsset('/favicon-16x16.png'),
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: publicAsset('/favicon-32x32.png'),
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: publicAsset('/favicon-48x48.png'),
        sizes: '48x48',
        type: 'image/png',
      },
      {
        url: publicAsset('/icon-192x192.png'),
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: publicAsset('/icon-512x512.png'),
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcut: publicAsset('/favicon.ico'),
    apple: [
      {
        url: publicAsset('/apple-touch-icon.png'),
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="bottom-left"
          theme="dark"
          expand={false}
          gap={6}
          toastOptions={{
            style: {
              background: "hsl(240 5% 18%)",
              border: "1px solid hsl(240 5% 28%)",
              color: "hsl(0 0% 95%)",
              borderRadius: "0.75rem",
            },
          }}
        />
      </body>
    </html>
  )
}
