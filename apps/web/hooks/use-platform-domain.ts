export function usePlatformDomain(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'simrs.online'
}
