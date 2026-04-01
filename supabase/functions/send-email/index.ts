import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailPayload {
  type: "leave_submitted" | "leave_approved" | "leave_rejected";
  to: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload: EmailPayload = await req.json();
  const { type, to, employeeName, leaveType, startDate, endDate, days, reason } = payload;

  let subject = "";
  let html = "";

  if (type === "leave_submitted") {
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
      from: "HR System <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});