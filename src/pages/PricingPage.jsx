import { useState } from "react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 278,
    maxEmployees: 10,
    badge: null,
    features: ["Up to 10 employees","Payroll calculation & CPF","Leave management","IR8A / IRAS filing","Basic role permissions","Email support"],
    notIncluded: ["Commission module","Excel export","Priority support"],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 59,
    yearlyPrice: 566,
    maxEmployees: 30,
    badge: "Most Popular",
    features: ["Up to 30 employees","Payroll calculation & CPF","Leave management","IR8A / IRAS filing","Full role permissions","Commission module","Excel export","Email support"],
    notIncluded: ["Priority support"],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 99,
    yearlyPrice: 950,
    maxEmployees: 100,
    badge: "Best Value",
    features: ["Up to 100 employees","Payroll calculation & CPF","Leave management","IR8A / IRAS filing","Full role permissions","Commission module","Excel export","Priority support","Dedicated account manager"],
    notIncluded: [],
  },
];

const SERVICE_ADDONS = [
  { name: "Payroll Managed", price: 199, quota: "Up to 15 employees", desc: "Our certified professionals run your monthly payroll and CPF submission on your behalf.", icon: "💼" },
  { name: "HR Essential", price: 299, quota: "Up to 15 employees", desc: "Payroll Managed + annual IR8A filing with IRAS + MOM-compliant employment contract templates.", icon: "📋" },
  { name: "HR Full", price: 499, quota: "Up to 15 employees", desc: "HR Essential + monthly consultation with a qualified HR professional + priority response.", icon: "🏆" },
];

const CREDENTIALS = [
  { label: "ACRA Registered", icon: "🏛️" },
  { label: "IRAS Compliant", icon: "📑" },
  { label: "MOM Compliant", icon: "⚖️" },
  { label: "CPF Board Partner", icon: "🤝" },
];

const TRUST_ITEMS = [
  { icon: "👨‍💼", title: "Qualified Professionals Behind Every Plan", desc: "Our team includes certified HR consultants and accounting professionals — not just software engineers." },
  { icon: "🇸🇬", title: "Built for Singapore Compliance", desc: "CPF, SDL, FWL, IR8A, IR21 — automatically calculated to meet IRAS and MOM requirements." },
  { icon: "🔒", title: "Secure & Confidential", desc: "Your payroll and employee data is encrypted, access-controlled, and never shared with third parties." },
  { icon: "✋", title: "No Lock-in Contracts", desc: "Cancel or downgrade your plan at any time. No penalties, no questions asked." },
];

export default function PricingPage({ onSelectPlan }) {
  const [billing, setBilling] = useState("monthly");
  const getPrice = (plan) => billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const getSavings = (plan) => plan.monthlyPrice * 12 - plan.yearlyPrice;

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .sel-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(27,58,92,0.25);}
        .addon-btn:hover{background:#1B3A5C!important;color:#fff!important;}
        .enq-btn:hover{background:#162f4a!important;}
        .cta-btn:hover{background:#f0f4f8!important;}
        @media(max-width:900px){
          .pg{grid-template-columns:1fr!important;max-width:440px!important;}
          .ag{grid-template-columns:1fr!important;max-width:440px!important;}
          .tg{grid-template-columns:1fr 1fr!important;}
          .cb{flex-direction:column!important;text-align:center!important;align-items:center!important;}
          .ci{grid-template-columns:1fr!important;gap:32px!important;}
        }
        @media(max-width:600px){
          .tg{grid-template-columns:1fr!important;}
          .sh{flex-direction:column!important;align-items:flex-start!important;}
          .cr{flex-wrap:wrap!important;justify-content:center!important;}
        }
      `}</style>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.hInner}>
          {/* Logo */}
          <div style={s.logoBlock}>
            <div style={s.logoText}>FelihR</div>
            <div style={s.logoSub}>HR Management · Powered by Certified Professionals</div>
          </div>

          {/* Credentials */}
          <div className="cr" style={s.credRow}>
            {CREDENTIALS.map(c => (
              <div key={c.label} style={s.credBadge}>
                <span>{c.icon}</span>
                <span style={s.credLabel}>{c.label}</span>
              </div>
            ))}
          </div>

          <h1 style={s.hTitle}>Simple, Transparent Pricing</h1>
          <p style={s.hSub}>
            Professional HR software backed by certified accountants and HR consultants.<br/>
            No hidden fees. Cancel anytime.
          </p>

          {/* Toggle */}
          <div style={s.toggleWrap}>
            {["monthly","yearly"].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                ...s.toggleBtn,
                background: billing === b ? "#1B3A5C" : "transparent",
                color: billing === b ? "#fff" : "rgba(255,255,255,0.65)",
              }}>
                {b.charAt(0).toUpperCase()+b.slice(1)}
                {b === "yearly" && <span style={s.savePill}>Save 2 months</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PLANS */}
      <div style={s.plansWrap}>
        <div className="pg" style={s.plansGrid}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              ...s.card,
              border: plan.badge === "Most Popular" ? "2px solid #1B3A5C" : "2px solid #e2e8f0",
            }}>
              {plan.badge && (
                <div style={{ ...s.planBadge, background: plan.badge === "Most Popular" ? "#1B3A5C" : "#0F766E" }}>
                  {plan.badge}
                </div>
              )}
              <h2 style={s.planName}>{plan.name}</h2>
              <p style={s.planQuota}>Up to {plan.maxEmployees} employees</p>
              <div style={s.priceRow}>
                <span style={s.curr}>S$</span>
                <span style={s.price}>{getPrice(plan)}</span>
                <span style={s.per}>/{billing==="monthly"?"mo":"yr"}</span>
              </div>
              <p style={s.savings}>
                {billing==="yearly" ? `Save S$${getSavings(plan)} vs monthly` : `Yearly plan saves S$${getSavings(plan)}/yr`}
              </p>
              <button className="sel-btn" onClick={() => onSelectPlan?.(plan.id, billing)} style={{
                ...s.selBtn,
                background: plan.badge==="Most Popular" ? "#1B3A5C" : "#fff",
                color: plan.badge==="Most Popular" ? "#fff" : "#1B3A5C",
              }}>
                Get Started
              </button>
              <div style={s.featList}>
                {plan.features.map(f => (
                  <div key={f} style={s.featRow}>
                    <span style={s.check}>✓</span><span style={s.featText}>{f}</span>
                  </div>
                ))}
                {plan.notIncluded.map(f => (
                  <div key={f} style={{...s.featRow, opacity:0.32}}>
                    <span style={s.cross}>✗</span><span style={s.featText}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD-ON SERVICES */}
      <div style={s.addonSec}>
        <div style={s.secInner}>
          <div style={s.secHead}>
            <div style={s.eyebrow}>Professional Services</div>
            <h2 style={s.secTitle}>Let Our Experts Handle It</h2>
            <p style={s.secSub}>Add hands-on HR services to any software plan. Our certified professionals take care of compliance — so you focus on your business.</p>
          </div>
          <div className="ag" style={s.addonGrid}>
            {SERVICE_ADDONS.map(a => (
              <div key={a.name} style={s.addonCard}>
                <div style={s.addonIcon}>{a.icon}</div>
                <h3 style={s.addonName}>{a.name}</h3>
                <div style={s.addonPR}>
                  <span style={s.addonCurr}>S$</span>
                  <span style={s.addonP}>{a.price}</span>
                  <span style={s.addonPer}>/mo</span>
                </div>
                <p style={s.addonQuota}>{a.quota}</p>
                <p style={s.addonDesc}>{a.desc}</p>
                <button className="addon-btn" style={s.addonBtn}>Enquire Now</button>
              </div>
            ))}
          </div>
          <div className="cb" style={s.ctaBanner}>
            <div>
              <h3 style={s.ctaTitle}>50+ employees or need a custom arrangement?</h3>
              <p style={s.ctaDesc}>Speak directly with our HR and accounting professionals for a tailored quote.</p>
            </div>
            <button className="cta-btn" style={s.ctaBtn}>Speak to a Consultant →</button>
          </div>
        </div>
      </div>

      {/* PROFESSIONAL CREDIBILITY */}
      <div style={s.contactSec}>
        <div style={s.secInner}>
          <div className="ci" style={s.contactGrid}>
            <div>
              <div style={s.eyebrow}>Not Just Software</div>
              <h2 style={s.contactTitle}>Real Professionals.<br/>Real Accountability.</h2>
              <p style={s.contactBody}>
                Unlike pure software companies, FelihR is supported by a team of practising
                accountants and HR professionals. When you have a question about CPF contribution
                rates, MOM regulations, or IR8A submission — you speak to a qualified person, not a chatbot.
              </p>
              <div style={s.proofList}>
                {["Payroll processed by certified accountants","HR advice from MOM-compliant practitioners","IR8A and IRAS submissions handled professionally","Confidential, secure, and fully accountable"].map(item => (
                  <div key={item} style={s.proofRow}>
                    <div style={s.proofDot}/>
                    <span style={s.proofText}>{item}</span>
                  </div>
                ))}
              </div>
              <button className="enq-btn" style={s.enqBtn}>Speak to Our Team →</button>
            </div>
            <div style={s.statsCol}>
              {[
                { number:"10+", label:"Years of accounting & HR experience" },
                { number:"100%", label:"Singapore compliance — CPF, MOM, IRAS" },
                { number:"< 24h", label:"Response time for all professional queries" },
              ].map(stat => (
                <div key={stat.label} style={s.statCard}>
                  <div style={s.statNum}>{stat.number}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
              <div style={s.quoteCard}>
                <p style={s.quoteText}>"Most HR software leaves you alone when compliance gets complicated. We don't — because we're accountants first."</p>
                <p style={s.quoteAttr}>— FelihR Professional Services Team</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST FOOTER */}
      <div style={s.trustSec}>
        <div className="tg" style={s.trustGrid}>
          {TRUST_ITEMS.map(item => (
            <div key={item.title} style={s.trustItem}>
              <div style={s.trustIcon}>{item.icon}</div>
              <h4 style={s.trustTitle}>{item.title}</h4>
              <p style={s.trustDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:{ fontFamily:"'DM Sans',sans-serif", background:"#F8FAFC", minHeight:"100vh" },
  header:{ background:"linear-gradient(160deg,#0F2744 0%,#1B3A5C 55%,#2E5F8A 100%)", padding:"56px 20px 96px", textAlign:"center" },
  hInner:{ maxWidth:760, margin:"0 auto" },
  logoBlock:{ marginBottom:28 },
  logoText:{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(32px,6vw,48px)", color:"#fff", letterSpacing:"-1px", lineHeight:1, marginBottom:6 },
  logoSub:{ fontSize:"clamp(11px,2vw,13px)", color:"rgba(255,255,255,0.50)", fontWeight:600, letterSpacing:"1.5px", textTransform:"uppercase" },
  credRow:{ display:"flex", justifyContent:"center", gap:12, marginBottom:32, flexWrap:"wrap" },
  credBadge:{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:20, padding:"6px 14px", fontSize:12 },
  credLabel:{ color:"rgba(255,255,255,0.85)", fontWeight:600, whiteSpace:"nowrap" },
  hTitle:{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(26px,5vw,42px)", color:"#fff", marginBottom:14, lineHeight:1.15 },
  hSub:{ fontSize:"clamp(14px,2.5vw,17px)", color:"rgba(255,255,255,0.68)", lineHeight:1.7, marginBottom:36 },
  toggleWrap:{ display:"inline-flex", background:"rgba(255,255,255,0.12)", borderRadius:50, padding:5, gap:4 },
  toggleBtn:{ padding:"11px 26px", borderRadius:50, border:"none", cursor:"pointer", fontWeight:700, fontSize:15, display:"flex", alignItems:"center", gap:8, transition:"all 0.2s", fontFamily:"'DM Sans',sans-serif" },
  savePill:{ background:"#10B981", color:"#fff", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 },

  plansWrap:{ padding:"0 20px", marginTop:-52, marginBottom:64 },
  plansGrid:{ maxWidth:1080, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 },
  card:{ background:"#fff", borderRadius:20, padding:32, position:"relative", boxShadow:"0 8px 32px rgba(0,0,0,0.08)" },
  planBadge:{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", color:"#fff", fontSize:11, fontWeight:700, padding:"4px 16px", borderRadius:20, whiteSpace:"nowrap" },
  planName:{ fontSize:22, fontWeight:800, color:"#0F172A", marginBottom:3, paddingTop:8 },
  planQuota:{ fontSize:13, color:"#64748b", marginBottom:16 },
  priceRow:{ display:"flex", alignItems:"flex-end", gap:2, marginBottom:4 },
  curr:{ fontSize:18, fontWeight:700, color:"#1B3A5C", lineHeight:1.9 },
  price:{ fontSize:"clamp(40px,5vw,52px)", fontWeight:800, color:"#1B3A5C", lineHeight:1 },
  per:{ fontSize:15, color:"#94a3b8", marginBottom:6 },
  savings:{ fontSize:12, color:"#10B981", fontWeight:600, marginBottom:20, minHeight:18 },
  selBtn:{ width:"100%", padding:"14px", borderRadius:12, fontWeight:700, fontSize:15, cursor:"pointer", marginBottom:24, transition:"all 0.2s", border:"2px solid #1B3A5C", fontFamily:"'DM Sans',sans-serif" },
  featList:{ display:"flex", flexDirection:"column", gap:10 },
  featRow:{ display:"flex", alignItems:"flex-start", gap:10 },
  check:{ color:"#10B981", fontWeight:700, fontSize:13, marginTop:2, flexShrink:0 },
  cross:{ color:"#94a3b8", fontWeight:700, fontSize:13, marginTop:2, flexShrink:0 },
  featText:{ fontSize:14, color:"#374151", lineHeight:1.5 },

  addonSec:{ background:"#fff", padding:"64px 20px" },
  secInner:{ maxWidth:1080, margin:"0 auto" },
  secHead:{ textAlign:"center", marginBottom:44 },
  eyebrow:{ fontSize:12, fontWeight:700, color:"#2E6DA4", letterSpacing:"2px", textTransform:"uppercase", marginBottom:10 },
  secTitle:{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(24px,4vw,34px)", color:"#0F172A", marginBottom:12 },
  secSub:{ fontSize:16, color:"#64748b", maxWidth:560, margin:"0 auto", lineHeight:1.7 },
  addonGrid:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24, marginBottom:40 },
  addonCard:{ border:"2px solid #e2e8f0", borderRadius:16, padding:28, textAlign:"center" },
  addonIcon:{ fontSize:40, marginBottom:12 },
  addonName:{ fontSize:18, fontWeight:700, color:"#0F172A", marginBottom:10 },
  addonPR:{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:2, marginBottom:4 },
  addonCurr:{ fontSize:16, fontWeight:700, color:"#1B3A5C", lineHeight:1.9 },
  addonP:{ fontSize:36, fontWeight:800, color:"#1B3A5C", lineHeight:1 },
  addonPer:{ fontSize:14, color:"#94a3b8", marginBottom:4 },
  addonQuota:{ fontSize:12, color:"#10B981", fontWeight:700, marginBottom:12 },
  addonDesc:{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:20 },
  addonBtn:{ width:"100%", padding:"12px", border:"2px solid #1B3A5C", borderRadius:10, background:"transparent", color:"#1B3A5C", fontWeight:700, fontSize:14, cursor:"pointer", transition:"all 0.2s", fontFamily:"'DM Sans',sans-serif" },

  ctaBanner:{ background:"linear-gradient(135deg,#0F2744,#1B3A5C)", borderRadius:16, padding:"32px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:24 },
  ctaTitle:{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:6 },
  ctaDesc:{ fontSize:14, color:"rgba(255,255,255,0.68)" },
  ctaBtn:{ background:"#fff", color:"#1B3A5C", border:"none", borderRadius:10, padding:"14px 28px", fontWeight:700, fontSize:15, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s", flexShrink:0 },

  contactSec:{ background:"#EEF2F7", padding:"72px 20px" },
  contactGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:56, alignItems:"start" },
  contactTitle:{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(26px,4vw,36px)", color:"#0F172A", lineHeight:1.2, marginBottom:20 },
  contactBody:{ fontSize:16, color:"#475569", lineHeight:1.8, marginBottom:28 },
  proofList:{ display:"flex", flexDirection:"column", gap:14, marginBottom:32 },
  proofRow:{ display:"flex", alignItems:"flex-start", gap:12 },
  proofDot:{ width:8, height:8, borderRadius:"50%", background:"#1B3A5C", flexShrink:0, marginTop:7 },
  proofText:{ fontSize:15, color:"#374151", lineHeight:1.6 },
  enqBtn:{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:12, padding:"14px 28px", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" },

  statsCol:{ display:"flex", flexDirection:"column", gap:16 },
  statCard:{ background:"#fff", borderRadius:14, padding:"20px 24px", borderLeft:"4px solid #1B3A5C", boxShadow:"0 2px 12px rgba(0,0,0,0.05)" },
  statNum:{ fontFamily:"'DM Serif Display',serif", fontSize:36, color:"#1B3A5C", lineHeight:1, marginBottom:4 },
  statLabel:{ fontSize:14, color:"#64748b", lineHeight:1.5 },
  quoteCard:{ background:"#1B3A5C", borderRadius:14, padding:"24px 28px" },
  quoteText:{ fontSize:15, color:"rgba(255,255,255,0.82)", lineHeight:1.8, fontStyle:"italic", marginBottom:12 },
  quoteAttr:{ fontSize:13, color:"rgba(255,255,255,0.45)", fontWeight:600 },

  trustSec:{ padding:"64px 20px", background:"#fff", borderTop:"1px solid #e2e8f0" },
  trustGrid:{ maxWidth:1080, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:32 },
  trustItem:{ textAlign:"center" },
  trustIcon:{ fontSize:36, marginBottom:12 },
  trustTitle:{ fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:8, lineHeight:1.4 },
  trustDesc:{ fontSize:13, color:"#64748b", lineHeight:1.7 },
};