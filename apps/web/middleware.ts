import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = [
  '/dashboard',
  '/pasien',
  '/pendaftaran',
  '/rekam-medis',
  '/farmasi',
  '/kasir',
  '/keuangan',
  '/laboratorium',
  '/radiologi',
  '/laporan',
  '/admin',
  '/gudang',
  '/bedah',
  '/gizi',
  '/kepegawaian',
  '/bpjs',
  '/profil',
]

const AUTH_PATHS = ['/login']

const SA_PATHS = ['/sa']

function extractSubdomain(hostname: string): string | null {
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
    return null
  }
  const parts = hostname.split('.')
  if (parts.length >= 3) return parts[0]
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const isProduction = process.env.NODE_ENV === 'production'
  const subdomain = extractSubdomain(hostname.split(':')[0])

  // ============================================
  // PRODUCTION: Subdomain-based routing
  // ============================================
  if (isProduction) {
    const adminSubdomain = process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN || 'admin'

    if (subdomain) {
      // admin.simrs.id → super admin panel
      if (subdomain === adminSubdomain) {
        if (pathname === '/') {
          return NextResponse.redirect(new URL('/sa', request.url))
        }
        if (!pathname.startsWith('/sa') && !pathname.startsWith('/login')) {
          return NextResponse.redirect(new URL('/sa', request.url))
        }
        return NextResponse.next()
      }

      // {tenant}.simrs.id → tenant dashboard
      const response = NextResponse.next()
      response.headers.set('x-tenant-slug', subdomain)

      if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      return response
    }

    // No subdomain (simrs.id) → landing page & /daftar
    // Let Next.js handle /, /daftar, /login normally
    return NextResponse.next()
  }

  // ============================================
  // DEVELOPMENT: Path-based routing (localhost)
  // ============================================

  // / and /daftar → landing pages (no auth)
  if (pathname === '/' || pathname.startsWith('/daftar')) {
    return NextResponse.next()
  }

  // /sa/* → super admin panel (dev mode, no subdomain needed)
  if (pathname.startsWith('/sa')) {
    return NextResponse.next()
  }

  // /portal/* → patient portal (dev mode)
  if (pathname.startsWith('/portal')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/daftar/:path*',
    '/sa/:path*',
    '/portal/:path*',
    '/dashboard/:path*',
    '/pasien/:path*',
    '/pendaftaran/:path*',
    '/rekam-medis/:path*',
    '/farmasi/:path*',
    '/kasir/:path*',
    '/keuangan/:path*',
    '/laboratorium/:path*',
    '/radiologi/:path*',
    '/laporan/:path*',
    '/admin/:path*',
    '/gudang/:path*',
    '/bedah/:path*',
    '/gizi/:path*',
    '/kepegawaian/:path*',
    '/bpjs/:path*',
    '/profil/:path*',
  ],
}
