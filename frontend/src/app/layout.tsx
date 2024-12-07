import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JOUL Energy Exchange',
  description: 'Plateforme décentralisée d\'échange d\'énergie',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" data-theme="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-base-100">
            <header className="navbar bg-base-200 shadow-lg">
              <div className="container mx-auto">
                <div className="flex-1">
                  <a href="/" className="btn btn-ghost text-xl">
                    JOUL Energy Exchange
                  </a>
                </div>
                <div className="flex-none gap-2">
                  <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost">
                      Menu
                    </div>
                    <ul tabIndex={0} className="menu dropdown-content z-[1] p-2 shadow bg-base-200 rounded-box w-52 mt-4">
                      <li><a href="/producer">Espace Producteur</a></li>
                      <li><a href="/consumer">Espace Acheteur</a></li>
                      <li><a href="/governance">Gouvernance</a></li>
                    </ul>
                  </div>
                  {/* RainbowKit s'intègrera automatiquement ici */}
                </div>
              </div>
            </header>
            <main className="container mx-auto py-8 px-4">
              {children}
            </main>
            <footer className="footer footer-center p-4 bg-base-200 text-base-content">
              <aside>
                <p>Copyright © 2024 - JOUL Energy Exchange</p>
              </aside>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
