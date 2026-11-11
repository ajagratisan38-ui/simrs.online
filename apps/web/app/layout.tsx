import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SIMRS — Sistem Informasi Manajemen Rumah Sakit',
  description:
    'Platform digital terintegrasi untuk mengelola operasional rumah sakit secara efisien, aman, dan modern.',
  // manifest: '/manifest.json', // PWA install prompt disabled for now
  themeColor: '#0d9488',
  // appleWebApp disabled temporarily
  // appleWebApp: {
  //   capable: true,
  //   statusBarStyle: 'default',
  //   title: 'SIMRS',
  // },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32.svg', sizes: '32x32', type: 'image/svg+xml' },
      { url: '/icons/icon-16.svg', sizes: '16x16', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-180.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* PWA meta tags disabled temporarily */}
        {/* <meta name="apple-mobile-web-app-capable" content="yes" /> */}
        {/* <meta name="mobile-web-app-capable" content="yes" /> */}
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
        {/* Service Worker registration disabled temporarily — re-enable when ready for PWA */}
        {/*
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator){
            window.addEventListener('load',function(){
              if(window.caches){caches.keys().then(function(n){n.forEach(function(k){if(k.indexOf('v5')===-1){caches.delete(k)}})})}
              navigator.serviceWorker.register('/sw.js',{scope:'/'})
                .then(function(reg){
                  reg.update();
                  reg.addEventListener('updatefound',function(){
                    var w=reg.installing;
                    if(w){w.addEventListener('statechange',function(){
                      if(w.state==='installed'&&navigator.serviceWorker.controller){
                        w.postMessage('SKIP_WAITING');
                      }
                    })}
                  });
                })
                .catch(function(){});
            });
          }
        `}} />
        */}
      </body>
    </html>
  )
}
