import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────────────────────────────────
// 發郵件
// ─────────────────────────────────────────────
async function handleSendEmail(payload: any) {
  const {
    type, to, employeeName, leaveType, startDate, endDate,
    days, reason, resetLink, language,
    inviteeName, inviteeEmail, companyName, loginUrl,
    companyUen, adminName, adminEmail,
    approverName,
  } = payload;

  let subject = "";
  let html = "";
  const isZh = language === "zh" || !language;
  const isMs = language === "ms";

  if (type === "password_reset") {
    subject = isZh ? "重設密碼" : isMs ? "Tetapkan Semula Kata Laluan" : "Reset Your Password";
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">🔐 ${isZh ? "重設密碼" : "Reset Your Password"}</h2>
        <p>${isZh ? "您好，我們收到了您的密碼重設請求。" : "We received a request to reset your password."}</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetLink}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            ${isZh ? "重設密碼" : "Reset Password"}
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;">${isZh ? "如果您沒有請求重設密碼，請忽略此郵件。" : "If you did not request this, please ignore this email."}</p>
      </div>
    `;
  } else if (type === "user_invited") {
    subject = companyName === "Platform"
      ? `[HR SaaS Platform] Your Platform Staff Account is Ready`
      : isZh ? `【${companyName}】您的 HR 系統帳號已建立` : `[${companyName}] Your HR System Account is Ready`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">👋 ${companyName === "Platform" ? "Welcome to HR SaaS Platform" : isZh ? "歡迎加入 HR 系統" : "Welcome to the HR System"}</h2>
        <p>${isZh && companyName !== "Platform" ? `您好 ${inviteeName}，` : `Hi ${inviteeName},`}</p>
        <p>${companyName === "Platform"
          ? `You have been added as a Platform Staff member of the HR SaaS Management Console. Please use the link below to set your password.`
          : isZh
            ? `${companyName} 已為您建立 HR 系統帳號，請點擊下方按鈕設定您的密碼後登入。`
            : `${companyName} has created an HR system account for you. Please click below to set your password.`
        }</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${loginUrl}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            ${isZh && companyName !== "Platform" ? "設定密碼並登入" : "Set Password & Login"}
          </a>
        </div>
        <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;font-size:13px;color:#6b7280;">${isZh && companyName !== "Platform" ? "登入帳號：" : "Login Email:"} <strong style="color:#111827;">${inviteeEmail}</strong></p>
        </div>
        <p style="color:#6b7280;font-size:13px;">${isZh && companyName !== "Platform" ? "此連結有效期為 24 小時。如有問題請聯絡 HR 部門。" : "This link is valid for 24 hours. Contact your admin if you need help."}</p>
      </div>
    `;
  } else if (type === "new_company_registered") {
    subject = `【HR SaaS】新公司註冊待審批：${companyName}`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#d97706;">🏢 新公司註冊通知</h2>
        <p>有新公司完成註冊，等待審批：</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">公司名稱</td><td style="padding:8px 12px;">${companyName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;">UEN</td><td style="padding:8px 12px;">${companyUen}</td></tr>
          <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;">管理員姓名</td><td style="padding:8px 12px;">${adminName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;">管理員郵箱</td><td style="padding:8px 12px;">${adminEmail}</td></tr>
        </table>
        <p>請登入平台管理後台進行審批。</p>
      </div>
    `;
  } else if (type === "leave_submitted") {
    subject = `【年假申請】${employeeName} 提交了年假申請`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">📋 新年假申請</h2>
        <p>${approverName ? `您好 ${approverName}，` : ""}您有一份新的年假申請需要審批：</p>
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

  if (!subject || !html) {
    return new Response(JSON.stringify({ error: "Unknown email type" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const fromEmail = "HR SaaS <noreply@felihr.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to: [to], subject, html }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ─────────────────────────────────────────────
// 創建用戶
// ─────────────────────────────────────────────
async function handleCreateUser(payload: any) {
  const { email, password, displayName, role, companyId, employeeId, companyName, language, siteUrl } = payload;

  // ✅ 修復：平台員工 companyId 可以是 null，不強制要求
  if (!email || !password || !displayName || !role) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. 創建 Auth 用戶
  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const userId = userData.user.id;

  // 2. 插入 user_roles（companyId 可以是 null）
  const { error: roleError } = await adminClient.from("user_roles").insert([{
    user_id: userId,
    role,
    display_name: displayName,
    email: email.toLowerCase(),
    company_id: companyId || null,
  }]);

  if (roleError) {
    await adminClient.auth.admin.deleteUser(userId);
    return new Response(JSON.stringify({ error: roleError.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // 3. 關聯員工記錄（如果有）
  if (employeeId) {
    await adminClient.from("employees").update({ auth_user_id: userId }).eq("id", employeeId);
  }

  // 4. 發邀請郵件
  // 公司員工、平台員工都發邀請郵件
  const loginUrl = siteUrl || "https://hr-saas-nine.vercel.app";
  const isPlatformRole = role === "platform_admin" || role === "platform_staff";

  if (isPlatformRole || role === "employee" || companyName) {
    await handleSendEmail({
      type: "user_invited",
      to: email,
      inviteeName: displayName,
      inviteeEmail: email,
      companyName: companyName || "Platform",
      loginUrl,
      language: language || "en",
    });
  }

  return new Response(JSON.stringify({ success: true, userId }), {
    status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ─────────────────────────────────────────────
// 主路由
// ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const payload = await req.json();

  if (payload.action === "create-user") {
    return handleCreateUser(payload);
  } else {
    return handleSendEmail(payload);
  }
});