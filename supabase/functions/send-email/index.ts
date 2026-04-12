import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
  type: "leave_submitted" | "leave_approved" | "leave_rejected" | "password_reset";
  to: string;
  employeeName?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  reason?: string;
  resetLink?: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const payload: EmailPayload = await req.json();
  const { type, to, employeeName, leaveType, startDate, endDate, days, reason, resetLink, language } = payload;

  let subject = "";
  let html = "";

  if (type === "password_reset") {
    const isZh = language === 'zh' || !language;
    const isMs = language === 'ms';
    subject = isZh ? "重設密碼" : isMs ? "Tetapkan Semula Kata Laluan" : "Reset Your Password";
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">🔐 ${isZh ? '重設密碼' : isMs ? 'Tetapkan Semula Kata Laluan' : 'Reset Your Password'}</h2>
        <p>${isZh ? '您好，我們收到了您的密碼重設請求。' : isMs ? 'Kami menerima permintaan penetapan semula kata laluan anda.' : 'We received a request to reset your password.'}</p>
        <p>${isZh ? '請點擊下方按鈕重設密碼：' : isMs ? 'Sila klik butang di bawah:' : 'Click the button below to reset your password:'}</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetLink}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            ${isZh ? '重設密碼' : isMs ? 'Tetapkan Semula' : 'Reset Password'}
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;">${isZh ? '如果您沒有請求重設密碼，請忽略此郵件。' : isMs ? 'Abaikan e-mel ini jika anda tidak membuat permintaan ini.' : 'If you did not request this, please ignore this email.'}</p>
      </div>
    `;
  } else if (type === "leave_submitted") {
    subject = `【年假申請】${employeeName} 提交了年假申請`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">📋 新年假申請</h2>
        <p>您有一份新的年假申請需要審批：</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">員工姓名</td><td style="padding:8px 12px;">${employeeName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;">假期類型</td><td style="padding:8px 12px;">${leaveType}</td></tr>
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">開始日期</td><td style="padding:8px 12px;">${startDate}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;">結束日期</td><td style="padding:8px 12px;">${endDate}</td></tr>
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">天數</td><td style="padding:8px 12px;">${days} 天</td></tr>
          ${reason ? `<tr><td style="padding:8px 12px;font-weight:bold;">原因</td><td style="padding:8px 12px;">${reason}</td></tr>` : ""}
        </table>
        <p style="color:#6b7280;font-size:14px;">請登入系統進行審批。</p>
      </div>
    `;
  } else if (type === "leave_approved") {
    subject = `【年假批准】您的年假申請已獲批准`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#16a34a;">✅ 年假申請已批准</h2>
        <p>您好 ${employeeName}，您的年假申請已獲批准：</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">假期類型</td><td style="padding:8px 12px;">${leaveType}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;">日期</td><td style="padding:8px 12px;">${startDate} 至 ${endDate}</td></tr>
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">天數</td><td style="padding:8px 12px;">${days} 天</td></tr>
        </table>
        <p style="color:#16a34a;font-weight:bold;">假期愉快！🎉</p>
      </div>
    `;
  } else if (type === "leave_rejected") {
    subject = `【年假申請】您的年假申請未獲批准`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#dc2626;">❌ 年假申請未獲批准</h2>
        <p>您好 ${employeeName}，很遺憾您的年假申請未獲批准：</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">假期類型</td><td style="padding:8px 12px;">${leaveType}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;">日期</td><td style="padding:8px 12px;">${startDate} 至 ${endDate}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px;">如有疑問請聯絡 HR 部門。</p>
      </div>
    `;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HR SaaS <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
});