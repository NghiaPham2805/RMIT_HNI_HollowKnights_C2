import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'
import './globals.css'

export const metadata: Metadata = {
  title: 'Blind Portfolio Review | Zero-Knowledge Recruitment',
  description: 'Decentralized, bias-free candidate evaluation powered by TideCloak threshold cryptography',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <TideCloakProvider config={tcConfig}>
          {children}
        </TideCloakProvider>
      </body>
    </html>
  )
}
