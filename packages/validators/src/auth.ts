import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(8, 'Password lama minimal 8 karakter'),
    newPassword: z
      .string()
      .min(8, 'Password baru minimal 8 karakter')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password harus mengandung huruf besar, huruf kecil, dan angka',
      ),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
