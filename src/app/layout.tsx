import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EBS Support Portal',
  description: 'Portal de soporte Oracle EBS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
