import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-bold text-muted-foreground/30">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-muted-foreground">
            Halaman yang Anda cari tidak ada atau telah dipindahkan.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Ke Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Halaman Login
          </Link>
        </div>
      </div>
    </div>
  )
}
