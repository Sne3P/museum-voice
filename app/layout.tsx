import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth-context'
import './globals.css'

// Utilisation de fonts système pour éviter les problèmes de téléchargement lors du build Docker
// Les fonts Geist peuvent être chargées dynamiquement côté client si nécessaire

export const metadata: Metadata = {
  title: 'MuseumVoice - Administration',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="h-full">
      <body className="font-sans antialiased h-full" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
