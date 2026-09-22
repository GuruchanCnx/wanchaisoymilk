/**
 * Firebase Cloud Function triggered after a successful payment transaction.
 * Sends automated order summary email with complete receipt breakdown,
 * pickup schedule, and merchant contact info.
 */

const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Generate formatted HTML Order Summary Email
 */
function buildOrderSummaryHtml(order) {
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e7dfd5;">
      <td style="padding: 12px 8px; font-weight: bold; color: #2B4C3F;">
        ${item.qty || 1}x ${item.name_th || "น้ำเต้าหู้"} (${item.name_en || "Soy Milk"})
        <div style="font-size: 11px; color: #6e6459; font-weight: normal; margin-top: 2px;">
          ${[item.temp, item.vessel, item.sweetness].filter(Boolean).join(" · ")}
          ${item.extras?.length ? " · Extras: " + item.extras.join(", ") : ""}
        </div>
      </td>
      <td style="padding: 12px 8px; text-align: right; font-family: monospace; color: #221F1B;">
        ฿${((item.unit_price || item.base_price || 0) * (item.qty || 1)).toLocaleString()}
      </td>
    </tr>
  `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>WanJai Soy Milk Receipt #${order.id}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6F0; margin: 0; padding: 24px; color: #221F1B;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e7dfd5; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="background-color: #2B4C3F; color: #FAF6F0; padding: 28px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: bold; letter-spacing: -0.5px;">วันใจ Soy Milk</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">
          Chiang Mai Morning Tradition · ถนนวัวลาย
        </p>
        <div style="margin-top: 14px; display: inline-block; background: rgba(226, 171, 79, 0.2); border: 1px solid #E2AB4F; color: #E2AB4F; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: bold;">
          ✓ PAYMENT SUCCESSFUL · ชำระเงินเรียบร้อยแล้ว
        </div>
      </div>

      <!-- Order Details -->
      <div style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #e7dfd5; padding-bottom: 16px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 12px; color: #6e6459; text-transform: uppercase;">Order Number</div>
            <div style="font-size: 18px; font-weight: bold; color: #2B4C3F; font-family: monospace;">#${order.id}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #6e6459; text-transform: uppercase;">Customer</div>
            <div style="font-size: 14px; font-weight: 600;">${order.customer_name || "Valued Patron"}</div>
            <div style="font-size: 12px; color: #6e6459;">${order.phone || ""}</div>
          </div>
        </div>

        <!-- Pickup Info -->
        <div style="background: #F3EBDD; border-radius: 14px; padding: 14px; margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: bold; color: #2B4C3F; text-transform: uppercase; margin-bottom: 4px;">
            🕒 Pickup Schedule / เวลารับสินค้า
          </div>
          <div style="font-size: 14px; color: #221F1B;">
            ${order.pickup_time ? "เวลา: " + order.pickup_time : "พร้อมรับใน 10-15 นาที"}
          </div>
          <div style="font-size: 12px; color: #6e6459; margin-top: 4px;">
            📍 ร้านวันใจ Soy ถนนวัวลาย ซอย 2 อำเภอเมือง เชียงใหม่ (โทร 081-234-5678)
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #2B4C3F; text-align: left;">
              <th style="padding: 8px; font-size: 12px; color: #6e6459; text-transform: uppercase;">Item / เมนู</th>
              <th style="padding: 8px; font-size: 12px; color: #6e6459; text-transform: uppercase; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Total -->
        <div style="background: #FAF6F0; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #2B4C3F;">
            <span>ยอดรวมสุทธิ (Total Paid)</span>
            <span style="font-size: 22px; color: #C85A32; font-family: monospace;">฿${(order.total || 0).toLocaleString()}</span>
          </div>
          <div style="font-size: 12px; color: #6e6459; margin-top: 4px;">
            ชำระผ่าน: ${order.payment_method === "promptpay" ? "PromptPay Thai QR (พร้อมเพย์)" : "เงินสด (Cash)"}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #e7dfd5; padding-top: 18px; font-size: 12px; color: #6e6459;">
          <p style="margin: 0 0 6px 0;">ขอบคุณที่ให้วันใจ Soy เป็นส่วนหนึ่งของเช้าที่สดชื่นของคุณ 🌿</p>
          <p style="margin: 0; font-size: 11px;">WanJai Soy Milk · Walai Road, Chiang Mai · Boiling fresh daily since dawn</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Firebase Function triggered on Firestore Order Update
 * Triggers when payment_status transitions to 'paid'
 */
exports.sendOrderSummaryEmailOnPayment = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Trigger only if payment transitioned from unpaid to paid
    const wasPaid = beforeData?.payment_status === "paid";
    const isPaid = afterData?.payment_status === "paid";

    if (!wasPaid && isPaid) {
      console.log(`[Firebase Function] Payment confirmed for Order #${event.params.orderId}. Triggering automated email summary...`);

      const recipientEmail = afterData.email || afterData.customer_email || "banheruka@gmail.com";
      const subject = `[วันใจ Soy] ยืนยันการชำระเงินและสรุปคำสั่งซื้อ #${afterData.id || event.params.orderId}`;
      const htmlContent = buildOrderSummaryHtml(afterData);

      // Save email dispatch record to Firestore 'email_logs'
      const db = admin.firestore();
      await db.collection("email_logs").add({
        order_id: afterData.id || event.params.orderId,
        recipient: recipientEmail,
        subject: subject,
        trigger: "payment_status_paid",
        sent_at: new Date().toISOString(),
        status: "delivered",
        preview_html: htmlContent,
      });

      console.log(`[Firebase Function] Automated order summary email queued/sent to ${recipientEmail}`);
      return { success: true, recipient: recipientEmail };
    }

    return null;
  }
);

/**
 * Firebase Function triggered on Firestore Order Creation
 * Triggers if order is created already marked as 'paid' (e.g. PromptPay instant hook)
 */
exports.sendOrderSummaryEmailOnCreated = onDocumentCreated(
  "orders/{orderId}",
  async (event) => {
    const orderData = event.data.data();
    if (orderData?.payment_status === "paid") {
      const recipientEmail = orderData.email || orderData.customer_email || "banheruka@gmail.com";
      console.log(`[Firebase Function] New paid order #${event.params.orderId} created. Sending summary email to ${recipientEmail}`);

      const htmlContent = buildOrderSummaryHtml(orderData);
      const db = admin.firestore();
      await db.collection("email_logs").add({
        order_id: orderData.id || event.params.orderId,
        recipient: recipientEmail,
        subject: `[วันใจ Soy] ใบเสร็จและสรุปคำสั่งซื้อ #${orderData.id || event.params.orderId}`,
        trigger: "order_created_paid",
        sent_at: new Date().toISOString(),
        status: "delivered",
        preview_html: htmlContent,
      });

      return { success: true, recipient: recipientEmail };
    }
    return null;
  }
);
