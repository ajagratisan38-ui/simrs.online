import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://simrs:simrs_secret@localhost:5432/simrs_db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  satusehat: {
    clientId: process.env.SATUSEHAT_CLIENT_ID || '',
    clientSecret: process.env.SATUSEHAT_CLIENT_SECRET || '',
    baseUrl: process.env.SATUSEHAT_BASE_URL || '',
    orgId: process.env.SATUSEHAT_ORG_ID || '',
  },

  bpjs: {
    consumerId: process.env.BPJS_CONSUMER_ID || '',
    consumerSecret: process.env.BPJS_CONSUMER_SECRET || '',
    baseUrl: process.env.BPJS_BASE_URL || '',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'dev-encryption-key-change-in-production',
  },

  security: {
    mfaIssuer: process.env.MFA_ISSUER || 'SIMRS SaaS',
    auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '1825', 10),
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5', 10),
    rateLimitLogin: parseInt(process.env.RATE_LIMIT_LOGIN || '5', 10),
    rateLimitApi: parseInt(process.env.RATE_LIMIT_API || '100', 10),
  },

  tte: {
    provider: process.env.TTE_PROVIDER || 'internal',
    bsreUrl: process.env.TTE_BSRE_URL || '',
    bsreUsername: process.env.TTE_BSRE_USERNAME || '',
    bsrePassword: process.env.TTE_BSRE_PASSWORD || '',
    vidaUrl: process.env.TTE_VIDA_URL || '',
    vidaApiKey: process.env.TTE_VIDA_API_KEY || '',
    vidaApiSecret: process.env.TTE_VIDA_API_SECRET || '',
    privyUrl: process.env.TTE_PRIVY_URL || '',
    privyMerchantKey: process.env.TTE_PRIVY_MERCHANT_KEY || '',
    privyMerchantToken: process.env.TTE_PRIVY_MERCHANT_TOKEN || '',
  },

  platform: {
    domain: process.env.PLATFORM_DOMAIN || 'simrs.id',
    adminSubdomain: process.env.ADMIN_SUBDOMAIN || 'admin',
    enableSubdomainRouting: process.env.ENABLE_SUBDOMAIN_ROUTING === 'true',
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    email: process.env.VAPID_EMAIL || 'mailto:admin@simrs.id',
  },

  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
} as const
