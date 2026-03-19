import './globals.css'
import { AppProvider } from '@/lib/store'

export const metadata = {
  title: 'BioMaster — SNC2D Study Hub',
  description: 'Master Biology with interactive study tools',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
