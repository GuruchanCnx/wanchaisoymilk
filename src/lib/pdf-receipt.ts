import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Order } from '../types';
import { baht } from './format';

interface ReceiptOptions {
  shopNameTh?: string;
  shopNameEn?: string;
  shopAddress?: string;
  shopPhone?: string;
  lang?: 'th' | 'en';
}

/**
 * Generates and downloads a beautifully styled, high-resolution PDF receipt
 * for customer records, accounting, or reimbursement.
 */
export async function downloadOrderReceiptPdf(
  order: Order,
  options: ReceiptOptions = {}
): Promise<void> {
  const {
    shopNameTh = 'วันใจ Soy (Wanchai Soy Milk)',
    shopAddress = '15/4 ซอย 2 ถนนวัวลาย ตำบลหายยา อ.เมือง จ.เชียงใหม่ 50100',
    shopPhone = '053-000-000',
  } = options;

  // Create an offscreen DOM element with crisp receipt styling
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-9999px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '420px';
  receiptContainer.style.backgroundColor = '#FFFFFF';
  receiptContainer.style.color = '#1A2E22';
  receiptContainer.style.fontFamily = '"IBM Plex Sans Thai", system-ui, -apple-system, sans-serif';
  receiptContainer.style.padding = '32px 28px';
  receiptContainer.style.boxSizing = 'border-box';
  receiptContainer.style.lineHeight = '1.45';

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('th-TH');

  const orderId = String(order.id);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    typeof window !== 'undefined' ? `${window.location.origin}/order/${orderId}` : `https://wanchai.soy/order/${orderId}`
  )}&bgcolor=FFFFFF&color=1B3B2B&qzone=1`;

  receiptContainer.innerHTML = `
    <div style="text-align: center; border-bottom: 2px dashed #D1D5DB; padding-bottom: 18px; margin-bottom: 18px;">
      <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background-color: #2B4D3E; color: #FAF3E3; line-height: 44px; font-size: 22px; font-weight: bold; font-family: Georgia, serif; font-style: italic; margin-bottom: 8px;">
        w
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #2B4D3E;">${shopNameTh}</h1>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #6B7280;">ถนนวัวลาย · Chiang Mai, Thailand</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #9CA3AF;">${shopAddress}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #9CA3AF;">โทร: ${shopPhone}</p>
    </div>

    <div style="font-size: 12px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">เลขที่ใบเสร็จ (Receipt #):</span>
        <strong style="color: #2B4D3E; font-family: monospace; font-size: 13px;">#${orderId}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">วันที่ (Date & Time):</span>
        <span>${orderDate}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">ลูกค้า (Customer):</span>
        <span>${order.customer_name || 'Walk-up Customer'}</span>
      </div>
      ${order.phone ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">เบอร์โทร (Phone):</span>
        <span style="font-family: monospace;">${order.phone}</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">การชำระ (Payment):</span>
        <strong>${order.payment_method === 'cash' ? 'เงินสด (Cash)' : 'พร้อมเพย์ (PromptPay)'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">สถานะ (Status):</span>
        <span style="color: #059669; font-weight: 600;">ชำระเรียบร้อย (PAID)</span>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
      <thead>
        <tr style="border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
          <th style="text-align: left; padding: 6px 0; color: #4B5563; font-weight: 600;">รายการ (Item)</th>
          <th style="text-align: center; padding: 6px 4px; color: #4B5563; font-weight: 600; width: 40px;">จำนวน</th>
          <th style="text-align: right; padding: 6px 0; color: #4B5563; font-weight: 600; width: 65px;">รวม (฿)</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map((item) => {
            const modifiers = [
              item.vessel === 'bag' ? 'ใส่ถุง' : item.vessel === 'cup' ? 'ใส่แก้ว' : item.vessel === 'bottle' ? 'ใส่ขวด' : item.vessel === 'own' ? 'นำแก้วมาเอง (-฿2)' : '',
              item.temp === 'hot' ? 'ร้อน' : item.temp === 'cold' ? 'เย็น' : '',
              item.sweetness === 'none' ? 'ไม่หวาน (0%)' : item.sweetness === 'less' ? 'หวานน้อย (50%)' : item.sweetness === 'extra' ? 'หวานมาก' : '',
              ...(item.extras || []).map((e) => e === 'ice' ? 'ใส่น้ำแข็ง (+฿3)' : e),
            ]
              .filter(Boolean)
              .join(' · ');

            return `
              <tr style="border-bottom: 1px solid #F3F4F6;">
                <td style="padding: 8px 0; vertical-align: top;">
                  <div style="font-weight: 600; color: #111827;">${item.name_th || item.name_en}</div>
                  ${item.name_en ? `<div style="font-size: 10px; color: #9CA3AF;">${item.name_en}</div>` : ''}
                  ${modifiers ? `<div style="font-size: 10px; color: #6B7280; margin-top: 2px;">${modifiers}</div>` : ''}
                </td>
                <td style="padding: 8px 4px; text-align: center; vertical-align: top; font-weight: 500;">
                  ${item.qty}
                </td>
                <td style="padding: 8px 0; text-align: right; vertical-align: top; font-weight: 600; font-family: monospace;">
                  ฿${item.unit_price * item.qty}
                </td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>

    <div style="border-top: 2px solid #E5E7EB; padding-top: 10px; font-size: 13px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span style="color: #6B7280;">ยอดรวมสินค้า (Subtotal):</span>
        <span style="font-family: monospace;">฿${order.total}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; color: #2B4D3E; border-top: 1px dashed #D1D5DB; padding-top: 8px; margin-top: 6px;">
        <span>ยอดสุทธิ (Total Amount):</span>
        <span style="font-family: monospace; color: #D4622B;">฿${order.total}</span>
      </div>
    </div>

    <div style="text-align: center; border-top: 1px dashed #D1D5DB; padding-top: 16px; margin-top: 12px;">
      <img src="${qrUrl}" alt="Order QR" style="width: 80px; height: 80px; margin: 0 auto 8px auto; display: block; border-radius: 8px; border: 1px solid #E5E7EB;" />
      <p style="margin: 0; font-size: 11px; font-weight: 600; color: #2B4D3E;">สแกนเพื่อตรวจสอบสถานะออเดอร์</p>
      <p style="margin: 3px 0 0 0; font-size: 10px; color: #9CA3AF;">ขอบคุณที่อุดหนุนวันใจ Soy · สดใหม่ทุกเช้า 06:00 - 11:00 น.</p>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2, // 2x high DPI render for crisp text
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, Math.max(160, (canvas.height * 80) / canvas.width)],
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`wanchai-receipt-${orderId}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
}
