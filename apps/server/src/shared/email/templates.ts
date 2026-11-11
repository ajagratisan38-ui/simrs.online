const BRAND_COLOR = '#0d9488'
let BRAND_NAME = 'SIMRS'
let CONTACT_PHONE = ''

export function setBrandName(name: string): void {
  if (name) BRAND_NAME = name
}

export function setContactPhone(phone: string): void {
  CONTACT_PHONE = phone || ''
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:${BRAND_COLOR};padding:24px 32px;border-radius:12px 12px 0 0;">
          <table width="100%"><tr>
            <td>
              <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                🏥 ${BRAND_NAME}
              </span>
            </td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:white;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            © ${new Date().getFullYear()} ${BRAND_NAME}. Semua hak dilindungi.${CONTACT_PHONE ? `<br/>Hubungi kami: ${CONTACT_PHONE}` : ''}<br/>
            Email ini dikirim secara otomatis, mohon tidak membalas email ini.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${text}</a>`
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;width:140px;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#1e293b;font-weight:500;border-bottom:1px solid #f1f5f9;">${value}</td>
  </tr>`
}

// ==================================================
// 1. Registrasi Diterima (Trial — auto aktif)
// ==================================================
export function emailRegistrationActivated(params: {
  adminNama: string
  namaRs: string
  slug: string
  adminEmail: string
  platformDomain: string
}): { subject: string; html: string } {
  const loginUrl = `https://${params.slug}.${params.platformDomain}/login`

  return {
    subject: `🎉 RS Anda Sudah Aktif — ${params.namaRs}`,
    html: layout('RS Aktif', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Selamat, ${params.adminNama}! 🎉</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Rumah sakit <strong>${params.namaRs}</strong> sudah berhasil didaftarkan dan aktif di platform ${BRAND_NAME}.
        Anda bisa langsung login dan mulai menggunakan sistem.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Nama RS', params.namaRs)}
        ${infoRow('Subdomain', `${params.slug}.${params.platformDomain}`)}
        ${infoRow('Email Login', params.adminEmail)}
        ${infoRow('Paket', 'Trial (30 hari)')}
      </table>

      <div style="text-align:center;margin:24px 0;">
        ${btn('Login Sekarang', loginUrl)}
      </div>

      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:24px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong>💡 Tips Memulai:</strong><br/>
          1. Login dengan email dan password yang didaftarkan<br/>
          2. Lengkapi profil RS di menu Pengaturan → Profil RS<br/>
          3. Tambahkan user (dokter, perawat, apoteker) di menu Pengaturan → User<br/>
          4. Mulai daftarkan pasien pertama Anda
        </p>
      </div>
    `),
  }
}

// ==================================================
// 2. Registrasi Diterima (Paid — instruksi bayar)
// ==================================================
export function emailPaymentInstructions(params: {
  adminNama: string
  namaRs: string
  planName: string
  billingPeriod: string
  amount: number
  registrationId: string
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
  platformDomain: string
}): { subject: string; html: string } {
  const statusUrl = `https://${params.platformDomain}/daftar/status?id=${params.registrationId}`
  const uploadUrl = `https://${params.platformDomain}/daftar/pembayaran/${params.registrationId}`
  const amountStr = `Rp ${params.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
  const periodLabel = params.billingPeriod === 'yearly' ? '/tahun' : '/bulan'

  return {
    subject: `💳 Instruksi Pembayaran — ${params.namaRs}`,
    html: layout('Instruksi Pembayaran', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Halo, ${params.adminNama}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Terima kasih telah mendaftarkan <strong>${params.namaRs}</strong>. Untuk mengaktifkan RS Anda,
        silakan lakukan pembayaran sesuai detail di bawah ini.
      </p>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1e40af;">Detail Pembayaran</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow('Paket', `${params.planName} (${periodLabel})`)}
          ${infoRow('Total', `<strong style="font-size:16px;color:#1e40af;">${amountStr}</strong>`)}
          ${infoRow('Bank', params.bankName || '(Belum dikonfigurasi)')}
          ${infoRow('No. Rekening', `<strong>${params.bankAccountNumber || '-'}</strong>`)}
          ${infoRow('Atas Nama', params.bankAccountName || '-')}
          ${infoRow('ID Registrasi', `<code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:11px;">${params.registrationId}</code>`)}
        </table>
      </div>

      <p style="margin:0 0 16px;font-size:13px;color:#475569;">
        Setelah melakukan transfer, silakan upload bukti pembayaran agar kami bisa segera memproses aktivasi RS Anda:
      </p>

      <div style="text-align:center;margin:24px 0;">
        ${btn('Upload Bukti Bayar', uploadUrl)}
      </div>

      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
        Atau cek status registrasi Anda di: <a href="${statusUrl}" style="color:${BRAND_COLOR};">${statusUrl}</a>
      </p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-top:24px;">
        <p style="margin:0;font-size:12px;color:#991b1b;">
          ⚠️ Pembayaran harus dilakukan dalam <strong>3×24 jam</strong>.
          Registrasi yang belum dibayar akan dibatalkan secara otomatis.
        </p>
      </div>
    `),
  }
}

// ==================================================
// 3. Pembayaran Terverifikasi — sedang di-review
// ==================================================
export function emailPaymentVerified(params: {
  adminNama: string
  namaRs: string
  registrationId: string
  platformDomain: string
  invoiceUrl?: string
}): { subject: string; html: string } {
  const statusUrl = `https://${params.platformDomain}/daftar/status?id=${params.registrationId}`
  const invoiceSection = params.invoiceUrl
    ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;">
        📄 Invoice Anda: <a href="https://${params.platformDomain}${params.invoiceUrl}" style="color:#0d9488;">Download Invoice</a>
      </p>`
    : ''

  return {
    subject: `✅ Pembayaran Terverifikasi — ${params.namaRs}`,
    html: layout('Pembayaran Terverifikasi', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Pembayaran Diterima</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Halo <strong>${params.adminNama}</strong>, pembayaran untuk <strong>${params.namaRs}</strong>
        sudah kami terima dan terverifikasi.
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:36px;">✅</p>
        <p style="margin:8px 0 0;font-size:14px;color:#166534;font-weight:600;">Pembayaran Terverifikasi</p>
        <p style="margin:4px 0 0;font-size:12px;color:#4ade80;">Pendaftaran Anda sedang ditinjau oleh tim kami</p>
      </div>

      <p style="margin:0 0 16px;font-size:13px;color:#475569;">
        Tim kami akan meninjau dan mengaktifkan RS Anda dalam <strong>1×24 jam kerja</strong>.
        Anda akan menerima email notifikasi begitu RS sudah aktif.
      </p>

      ${invoiceSection}

      <div style="text-align:center;margin-top:16px;">
        ${btn('Cek Status', statusUrl)}
      </div>
    `),
  }
}

// ==================================================
// 4. RS Disetujui & Aktif (setelah review)
// ==================================================
export function emailRsApproved(params: {
  adminNama: string
  namaRs: string
  slug: string
  adminEmail: string
  planName: string
  platformDomain: string
}): { subject: string; html: string } {
  const loginUrl = `https://${params.slug}.${params.platformDomain}/login`

  return {
    subject: `🎉 RS Anda Sudah Aktif — ${params.namaRs}`,
    html: layout('RS Aktif', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">RS Anda Sudah Aktif! 🎉</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Halo <strong>${params.adminNama}</strong>, pendaftaran <strong>${params.namaRs}</strong>
        sudah disetujui dan RS Anda sudah aktif di platform ${BRAND_NAME}.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Nama RS', params.namaRs)}
        ${infoRow('Subdomain', `${params.slug}.${params.platformDomain}`)}
        ${infoRow('Email Login', params.adminEmail)}
        ${infoRow('Paket', params.planName)}
      </table>

      <div style="text-align:center;margin:24px 0;">
        ${btn('Login Sekarang', loginUrl)}
      </div>

      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:24px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong>💡 Langkah Selanjutnya:</strong><br/>
          1. Login dengan email dan password yang Anda daftarkan<br/>
          2. Selesaikan setup awal (profil RS, logo, dsb)<br/>
          3. Tambahkan user — dokter, perawat, apoteker, kasir<br/>
          4. Import data master (obat, tarif, ruangan)<br/>
          5. Mulai operasional!
        </p>
      </div>
    `),
  }
}

// ==================================================
// 5. Registrasi Ditolak
// ==================================================
export function emailRsRejected(params: {
  adminNama: string
  namaRs: string
  reason: string
  platformDomain: string
}): { subject: string; html: string } {
  const registerUrl = `https://${params.platformDomain}/daftar`

  return {
    subject: `❌ Pendaftaran Ditolak — ${params.namaRs}`,
    html: layout('Pendaftaran Ditolak', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Pendaftaran Tidak Disetujui</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Halo <strong>${params.adminNama}</strong>, mohon maaf pendaftaran
        <strong>${params.namaRs}</strong> tidak dapat kami proses saat ini.
      </p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#991b1b;">Alasan:</p>
        <p style="margin:0;font-size:14px;color:#dc2626;">${params.reason}</p>
      </div>

      <p style="margin:0 0 16px;font-size:13px;color:#475569;">
        Jika Anda merasa ini adalah kesalahan, silakan hubungi tim kami atau coba daftar kembali
        dengan data yang sudah diperbaiki.
      </p>

      <div style="text-align:center;margin:24px 0;">
        ${btn('Daftar Ulang', registerUrl)}
      </div>
    `),
  }
}

// ==================================================
// 6. Pengingat Langganan Akan Berakhir
// ==================================================
export function emailSubscriptionExpiring(params: {
  adminNama: string
  namaRs: string
  planName: string
  expiresAt: string
  daysLeft: number
  slug: string
  platformDomain: string
}): { subject: string; html: string } {
  const loginUrl = `https://${params.slug}.${params.platformDomain}/login`
  const expiryDate = new Date(params.expiresAt).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const urgencyColor = params.daysLeft <= 3 ? '#dc2626' : params.daysLeft <= 7 ? '#f59e0b' : '#3b82f6'

  return {
    subject: `⏰ Langganan ${params.namaRs} Akan Berakhir dalam ${params.daysLeft} Hari`,
    html: layout('Langganan Akan Berakhir', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Langganan Akan Berakhir</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Halo <strong>${params.adminNama}</strong>, langganan ${BRAND_NAME} untuk
        <strong>${params.namaRs}</strong> akan berakhir dalam waktu dekat.
      </p>

      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:48px;font-weight:700;color:${urgencyColor};">${params.daysLeft}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#92400e;font-weight:500;">hari tersisa</p>
        <p style="margin:8px 0 0;font-size:12px;color:#a16207;">
          Berakhir pada: <strong>${expiryDate}</strong>
        </p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
        ${infoRow('RS', params.namaRs)}
        ${infoRow('Paket', params.planName)}
        ${infoRow('Berakhir', expiryDate)}
      </table>

      <p style="margin:0 0 16px;font-size:13px;color:#475569;">
        Perpanjang langganan Anda agar layanan RS tetap berjalan tanpa gangguan.
        Setelah berakhir, akses akan dibatasi setelah grace period.
      </p>

      <div style="text-align:center;margin:24px 0;">
        ${btn('Login & Perpanjang', loginUrl)}
      </div>
    `),
  }
}

// ==================================================
// 7. Upload Bukti Bayar Diterima (konfirmasi ke user)
// ==================================================
export function emailPaymentProofReceived(params: {
  adminNama: string
  namaRs: string
  registrationId: string
  platformDomain: string
}): { subject: string; html: string } {
  const statusUrl = `https://${params.platformDomain}/daftar/status?id=${params.registrationId}`

  return {
    subject: `📎 Bukti Pembayaran Diterima — ${params.namaRs}`,
    html: layout('Bukti Bayar Diterima', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Bukti Pembayaran Diterima</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Halo <strong>${params.adminNama}</strong>, kami sudah menerima bukti pembayaran untuk
        <strong>${params.namaRs}</strong>. Tim kami akan segera memverifikasi pembayaran Anda.
      </p>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:36px;">📎</p>
        <p style="margin:8px 0 0;font-size:14px;color:#0369a1;font-weight:600;">Bukti Bayar Diunggah</p>
        <p style="margin:4px 0 0;font-size:12px;color:#7dd3fc;">Verifikasi dalam 1×24 jam kerja</p>
      </div>

      <div style="text-align:center;">
        ${btn('Cek Status Pendaftaran', statusUrl)}
      </div>
    `),
  }
}

// ==================================================
// 8. Notifikasi ke Super Admin — ada registrasi baru
// ==================================================
export function emailNewRegistrationNotif(params: {
  namaRs: string
  planCode: string
  slug: string
  adminEmail: string
  status: string
  platformDomain: string
}): { subject: string; html: string } {
  const saUrl = `https://admin.${params.platformDomain}/sa/registrations`

  return {
    subject: `📋 Pendaftaran RS Baru — ${params.namaRs}`,
    html: layout('Registrasi Baru', `
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Pendaftaran RS Baru</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;">
        Ada pendaftaran RS baru yang memerlukan perhatian:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
        ${infoRow('Nama RS', params.namaRs)}
        ${infoRow('Subdomain', `${params.slug}.${params.platformDomain}`)}
        ${infoRow('Paket', params.planCode)}
        ${infoRow('Email Admin', params.adminEmail)}
        ${infoRow('Status', `<strong>${params.status}</strong>`)}
      </table>

      <div style="text-align:center;">
        ${btn('Lihat di Dashboard', saUrl)}
      </div>
    `),
  }
}
