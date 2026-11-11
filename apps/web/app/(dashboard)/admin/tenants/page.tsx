'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function TenantsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/sa')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="text-sm text-muted-foreground">
        Mengalihkan ke Super Admin Panel...
      </p>
    </div>
  )
}
