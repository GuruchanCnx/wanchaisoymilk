import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Order } from '../types';

export interface ReceiptOptions {
  shopNameTh?: string;
  shopNameEn?: string;
  shopAddress?: string;
  shopPhone?: string;
  lang?: 'th' | 'en';
}

/**
 * Builds clean, high-contrast HTML markup for an 80mm POS thermal or formatted PDF receipt.
 */
export function buildReceiptHtml(order: Order, options: ReceiptOptions = {}): string {
  const {
    shopNameTh = 'วันใจ Soy (Wanchai Soy Milk)',
    shopAddress = '15/4 ซอย 2 ถนนวัวลาย ตำบลหายยา อ.เมือง จ.เชียงใหม่ 50100',
    shopPhone = '053-000-000',
  } = options;

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

  const itemsHtml = order.items
    .map((item) => {
      const modifiers = [
        item.vessel === 'bag' ? 'ใส่ถุง' : item.vessel === 'cup' ? 'ใส่แก้ว' : item.vessel === 'bottle' ? 'ใส่ขวด' : item.vessel === 'own' ? 'นำแก้วมาเอง (-฿2)' : '',
        item.temp === 'hot' ? 'ร้อน' : item.temp === 'cold' ? 'เย็น' : '',
        item.sweetness === 'none' ? 'ไม่หวาน (0%)' : item.sweetness === 'less' ? 'หวานน้อย (50%)' : item.sweetness === 'extra' ? 'หวานมาก' : '',
        ...(item.extras || []).map((e) => (e === 'ice' ? 'ใส่น้ำแข็ง (+฿3)' : e)),
      ]
        .filter(Boolean)
        .join(' · ');

      return `
        <tr style="border-bottom: 1px solid #F3F4F6;">
          <td style="padding: 8px 0; vertical-align: top;">
            <div style="font-weight: 600; color: #111827; font-size: 13px;">${item.name_th || item.name_en}</div>
            ${item.name_en ? `<div style="font-size: 11px; color: #6B7280;">${item.name_en}</div>` : ''}
            ${modifiers ? `<div style="font-size: 10px; color: #6B7280; margin-top: 2px;">${modifiers}</div>` : ''}
          </td>
          <td style="padding: 8px 4px; text-align: center; vertical-align: top; font-weight: 600; font-size: 13px;">
            ${item.qty}
          </td>
          <td style="padding: 8px 0; text-align: right; vertical-align: top; font-weight: 700; font-family: monospace; font-size: 13px;">
            ฿${(item.unit_price || item.base_price || 0) * item.qty}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="text-align: center; border-bottom: 2px dashed #D1D5DB; padding-bottom: 16px; margin-bottom: 16px;">
      <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background-color: #2B4D3E; color: #FAF3E3; line-height: 44px; font-size: 22px; font-weight: bold; font-family: Georgia, serif; font-style: italic; margin-bottom: 8px;">
        w
      </div>
      <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #2B4D3E;">${shopNameTh}</h1>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #4B5563;">ถนนวัวลาย · Chiang Mai, Thailand</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #6B7280;">${shopAddress}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #6B7280;">โทร: ${shopPhone}</p>
      <div style="margin-top: 8px; display: inline-block; padding: 2px 10px; border-radius: 999px; background: #E8F5E9; color: #1B5E20; font-size: 10px; font-weight: 700; border: 1px solid #A5D6A7;">
        ใบเสร็จรับเงิน / OFFICIAL RECEIPT
      </div>
    </div>

    <div style="font-size: 12px; margin-bottom: 14px; background: #F9FAFB; padding: 10px 12px; border-radius: 8px; border: 1px solid #E5E7EB;">
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
        <strong>${order.customer_name || 'ลูกค้าหน้าร้าน'}</strong>
      </div>
      ${
        order.phone
          ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">เบอร์โทร (Phone):</span>
        <span style="font-family: monospace;">${order.phone}</span>
      </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">การชำระ (Payment):</span>
        <strong>${order.payment_method === 'cash' ? 'เงินสด (Cash)' : 'พร้อมเพย์ (PromptPay)'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #6B7280;">สถานะ (Status):</span>
        <span style="color: #059669; font-weight: 700;">ชำระเรียบร้อย (PAID)</span>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px;">
      <thead>
        <tr style="border-top: 1px solid #D1D5DB; border-bottom: 1px solid #D1D5DB; background: #F3F4F6;">
          <th style="text-align: left; padding: 6px 0; color: #374151; font-weight: 700;">รายการ (Item)</th>
          <th style="text-align: center; padding: 6px 4px; color: #374151; font-weight: 700; width: 44px;">จำนวน</th>
          <th style="text-align: right; padding: 6px 0; color: #374151; font-weight: 700; width: 70px;">รวม (฿)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="border-top: 2px solid #E5E7EB; padding-top: 8px; font-size: 12px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">ยอดรวมสินค้า (Subtotal):</span>
        <span style="font-family: monospace; font-weight: 600;">฿${order.total}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #6B7280;">ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
        <span style="color: #6B7280;">ยกเว้นภาษี (Exempt)</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: #2B4D3E; border-top: 1px dashed #D1D5DB; padding-top: 8px; margin-top: 6px;">
        <span>ยอดสุทธิ (Total Amount):</span>
        <span style="font-family: monospace; color: #D4622B; font-size: 17px;">฿${order.total}</span>
      </div>
    </div>

    <div style="text-align: center; border-top: 1px dashed #D1D5DB; padding-top: 14px; margin-top: 10px;">
      <img src="${qrUrl}" alt="Order QR" style="width: 76px; height: 76px; margin: 0 auto 6px auto; display: block; border-radius: 6px; border: 1px solid #E5E7EB;" crossorigin="anonymous" />
      <p style="margin: 0; font-size: 11px; font-weight: 700; color: #2B4D3E;">สแกนเพื่อตรวจสอบสถานะออเดอร์</p>
      <p style="margin: 3px 0 0 0; font-size: 10px; color: #6B7280;">ขอบคุณที่อุดหนุนวันใจ Soy · สดใหม่ทุกเช้า 06:00 - 11:00 น.</p>
    </div>
  `;
}

/**
 * Generates and downloads a beautifully styled, high-resolution PDF receipt
 * for customer records, accounting, or reimbursement.
 */
export async function downloadOrderReceiptPdf(
  order: Order,
  options: ReceiptOptions = {}
): Promise<void> {
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'fixed';
  receiptContainer.style.left = '-9999px';
  receiptContainer.style.top = '0';
  receiptContainer.style.width = '400px';
  receiptContainer.style.backgroundColor = '#FFFFFF';
  receiptContainer.style.color = '#1A2E22';
  receiptContainer.style.fontFamily = '"IBM Plex Sans Thai", system-ui, -apple-system, sans-serif';
  receiptContainer.style.padding = '28px 24px';
  receiptContainer.style.boxSizing = 'border-box';
  receiptContainer.style.lineHeight = '1.45';

  receiptContainer.innerHTML = buildReceiptHtml(order, options);
  document.body.appendChild(receiptContainer);

  try {
    const canvas = await html2canvas(receiptContainer, {
      scale: 2, // 2x high DPI render for crisp text
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, Math.max(150, (canvas.height * 80) / canvas.width)],
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`wanchai-receipt-${order.id}.pdf`);
  } finally {
    if (document.body.contains(receiptContainer)) {
      document.body.removeChild(receiptContainer);
    }
  }
}

/**
 * Opens browser print dialog with the formatted receipt in standard 80mm format.
 */
export function printOrderReceipt(order: Order, options: ReceiptOptions = {}): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const content = buildReceiptHtml(order, options);

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8">
        <title>Receipt #${order.id} - Wanchai Soy</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: "IBM Plex Sans Thai", system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 8px;
            color: #1A2E22;
            background: #FFFFFF;
            line-height: 1.45;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    } catch {}
  }, 60000);
}
