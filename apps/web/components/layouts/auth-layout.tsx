'use client'

import { Activity, Heart, Shield, Wifi } from 'lucide-react'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px),
                                radial-gradient(circle at 75% 75%, rgba(255,255,255,0.15) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Floating shapes */}
        <div className="absolute top-20 left-16 w-32 h-32 bg-white/5 rounded-3xl rotate-12 backdrop-blur-sm" />
        <div className="absolute bottom-32 right-20 w-40 h-40 bg-white/5 rounded-full backdrop-blur-sm" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/5 rounded-2xl -rotate-6 backdrop-blur-sm" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">SIMRS</span>
          </div>

          {/* Hero text */}
          <div className="space-y-6 max-w-lg">
            <h1 className="text-4xl font-bold leading-tight">
              Sistem Informasi
              <br />
              Manajemen
              <br />
              Rumah Sakit
            </h1>
            <p className="text-teal-100 text-lg leading-relaxed">
              Platform digital terintegrasi untuk mengelola operasional rumah sakit
              secara efisien, aman, dan modern.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Wifi className="h-3.5 w-3.5" />
                <span>Offline-Ready</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Shield className="h-3.5 w-3.5" />
                <span>SATUSEHAT & BPJS</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Heart className="h-3.5 w-3.5" />
                <span>Multi-Tenant</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-teal-200/60 text-sm">
            &copy; {new Date().getFullYear()} SIMRS. Untuk rumah sakit Indonesia.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-primary tracking-tight">SIMRS</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
