import type { Metadata } from 'next'
import '@/lib/storyblok'
import './globals.css'

export const metadata: Metadata = {
  title: 'Storyblok + ImageKit sample',
  description: 'Landing page rendered from Storyblok stories, with images picked via the ImageKit field plugin.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
