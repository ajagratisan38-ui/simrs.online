'use client'

import { forwardRef } from 'react'
import type { BillData, PaymentData } from '@/lib/api/billing'

interface ReceiptProps {
  bill: BillData
  payment?: PaymentData | null
  kembalian?: number
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  function Receipt({ bill, payment, kembalian = 0 }, ref) {
    const now = new Date()

    return (
      <div
        ref={ref}
        className="receipt-container font-mono text-[9pt] leading-tight max-w-[76mm] mx-auto"
      >
        {/* Header */}
        <div className="receipt-header text-center border-b border-dashed border-black pb-2 mb-2">
          <h1 className="text-[11pt] font-bold uppercase tracking-wide">
            SIMRS Demo
          </h1>
          <p className="text-[7pt] mt-0.5">
            Jl. Contoh No. 1, Kota Demo
          </p>
          <p className="text-[7pt]">Telp: (021) 1234567</p>
        </div>

        {/* Info */}
        <div className="space-y-0.5 mb-2 text-[8pt]">
          <div className="flex justify-between">
            <span>No. Kunjungan</span>
            <span className="font-bold">{bill.visit_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Pasien</span>
            <span>{bill.patient_nama}</span>
          </div>
          <div className="flex justify-between">
            <span>No. RM</span>
            <span>{bill.no_rekam_medis}</span>
          </div>
          <div className="flex justify-between">
            <span>Poli</span>
            <span>{bill.room_nama}</span>
          </div>
          <div className="flex justify-between">
            <span>Dokter</span>
            <span>{bill.doctor_nama}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal</span>
            <span>
              {new Date(bill.tanggal).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Penjamin</span>
            <span className="uppercase font-bold">{bill.penjamin}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-dashed border-black my-1" />

        {/* Items */}
        <div className="space-y-1 mb-2">
          {bill.items.map((item, i) => (
            <div key={item.id || i} className="receipt-item">
              <div className="flex-1">
                <p className="text-[8pt] font-medium">{item.deskripsi}</p>
                <p className="text-[7pt] text-gray-600">
                  {item.qty} x {formatCurrency(item.harga_satuan)}
                  {item.discount > 0 && (
                    <span className="ml-1">
                      (disc -{formatCurrency(item.discount)})
                    </span>
                  )}
                </p>
              </div>
              <span className="text-right text-[8pt] font-medium ml-2">
                {formatCurrency(item.total)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="receipt-total border-t border-dashed border-black pt-1 space-y-0.5">
          <div className="flex justify-between text-[8pt]">
            <span>Subtotal</span>
            <span>{formatCurrency(bill.total_amount)}</span>
          </div>
          {bill.discount_amount > 0 && (
            <div className="flex justify-between text-[8pt]">
              <span>Diskon</span>
              <span>-{formatCurrency(bill.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[9pt] font-bold border-t border-dashed border-black pt-1 mt-1">
            <span>TOTAL</span>
            <span>{formatCurrency(bill.final_amount)}</span>
          </div>

          {/* Payment info */}
          {payment && (
            <>
              <div className="border-t border-dashed border-black my-1" />
              <div className="flex justify-between text-[8pt]">
                <span>Bayar ({payment.metode.toUpperCase()})</span>
                <span>{formatCurrency(payment.jumlah)}</span>
              </div>
              {kembalian > 0 && (
                <div className="flex justify-between text-[9pt] font-bold">
                  <span>Kembali</span>
                  <span>{formatCurrency(kembalian)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="receipt-footer text-center text-[7pt] mt-3 border-t border-dashed border-black pt-2">
          <p>
            {now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} {now.toLocaleTimeString('id-ID')}
          </p>
          <p className="mt-1">Terima kasih atas kunjungan Anda</p>
          <p className="text-[6pt] mt-1 text-gray-500">
            Struk ini merupakan bukti pembayaran yang sah
          </p>
        </div>
      </div>
    )
  },
)

function formatCurrency(amount: number | string): string {
  const num = Math.round(Number(amount) || 0)
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
}
