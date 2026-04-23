import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'

export default function SettingsTab({ language, companyId, userRole }) {
  const zh = language === 'zh'

  // ── 修改密碼 ──────────────────────────────
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd,         setShowPwd]         = useState(false)
  const [pwdLoading,      setPwdLoading]      = useState(false)
  const [pwdMsg,          setPwdMsg]          = useState({ type: '', content: '' })

  // ── 薪資設置 ──────────────────────────────
  const [payrollSettings, setPayrollSettings] = useState({
    work_days_per_week: 5,
    cpf_submission_no:  '',
    payslip_footer:     '',
    logo_url:           '',
  })
  const [payrollLoading,  setPayrollLoading]  = useState(false)
  const [payrollSaving,   setPayrollSaving]   = useState(false)
  const [payrollMsg,      setPayrollMsg]      = useState({ type: '', content: '' })
  const [logoUploading,   setLogoUploading]   = useState(false)
  const [logoPreview,     setLogoPreview]     = useState('')
  const logoInputRef = useRef()

  const isAdmin = ['super_admin', 'hr_admin'].includes(userRole)

  // Load payroll settings on mount
  useEffect(() => {
    if (companyId && isAdmin) loadPayrollSettings()
  }, [companyId])

  async function loadPayrollSettings() {
    setPayrollLoading(true)
    const { data } = await supabase
      .from('company_payroll_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    if (data) {
      // 修正舊格式 URL（確保包含 /public/）
      const fixUrl = (url) => {
        if (!url) return ''
        if (url.includes('/object/public/')) return url
        return url.replace('/object/company-assets/', '/object/public/company-assets/')
      }
      const logoUrl = fixUrl(data.logo_url)
      setPayrollSettings({
        work_days_per_week: data.work_days_per_week || 5,
        cpf_submission_no:  data.cpf_submission_no  || '',
        payslip_footer:     data.payslip_footer     || '',
        logo_url:           logoUrl,
      })
      if (logoUrl) setLogoPreview(logoUrl)
    }
    setPayrollLoading(false)
  }

  // ── Logo upload ───────────────────────────
  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPayrollMsg({ type: 'error', content: zh ? '請選擇圖片文件' : 'Please select an image file' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPayrollMsg({ type: 'error', content: zh ? '圖片大小不能超過 2MB' : 'Image must be under 2MB' })
      return
    }

    setLogoUploading(true)
    setPayrollMsg({ type: '', content: '' })

    const ext  = file.name.split('.').pop()
    const path = `logos/${companyId}/logo.${ext}`

    const { error: upErr } = await supabase.storage
      .from('company-assets')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setPayrollMsg({ type: 'error', content: upErr.message })
      setLogoUploading(false)
      return
    }

    // 手動構建正確的 public URL
    const logoUrl = `https://fwztdcparxtnfffkkajh.supabase.co/storage/v1/object/public/company-assets/${path}?t=${Date.now()}`
    setPayrollSettings(s => ({ ...s, logo_url: logoUrl }))
    setLogoPreview(logoUrl)
    setLogoUploading(false)
    setPayrollMsg({ type: 'success', content: zh ? 'Logo 已上傳' : 'Logo uploaded' })
    setTimeout(() => setPayrollMsg({ type: '', content: '' }), 3000)
  }

  async function handleRemoveLogo() {
    setPayrollSettings(s => ({ ...s, logo_url: '' }))
    setLogoPreview('')
  }

  // ── Save payroll settings ─────────────────
  async function handleSavePayroll() {
    setPayrollSaving(true)
    setPayrollMsg({ type: '', content: '' })

    const payload = {
      company_id:         companyId,
      work_days_per_week: Number(payrollSettings.work_days_per_week),
      cpf_submission_no:  payrollSettings.cpf_submission_no.trim(),
      payslip_footer:     payrollSettings.payslip_footer.trim(),
      logo_url:           payrollSettings.logo_url,
      updated_at:         new Date().toISOString(),
    }

    const { error } = await supabase
      .from('company_payroll_settings')
      .upsert(payload, { onConflict: 'company_id' })

    if (error) {
      setPayrollMsg({ type: 'error', content: error.message })
    } else {
      setPayrollMsg({ type: 'success', content: zh ? '薪資設置已儲存 ✅' : 'Payroll settings saved ✅' })
      setTimeout(() => setPayrollMsg({ type: '', content: '' }), 4000)
    }
    setPayrollSaving(false)
  }

  // ── Change password ───────────────────────
  async function handleUpdatePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', content: zh ? '密碼不一致' : 'Passwords do not match' }); return
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', content: zh ? '密碼至少 6 位' : 'Password must be at least 6 characters' }); return
    }
    setPwdLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwdMsg({ type: 'error', content: error.message })
    } else {
      setPwdMsg({ type: 'success', content: zh ? '密碼修改成功！' : 'Password updated!' })
      setNewPassword(''); setConfirmPassword('')
    }
    setPwdLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-gray-800">
        {zh ? '個人設定' : 'Settings'}
      </h2>

      {/* ── 修改密碼 ── */}
      <section className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
        <h3 className="text-sm font-semibold mb-4 text-gray-600 border-b pb-2">
          {zh ? '修改密碼' : 'Change Password'}
        </h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs mb-1 text-gray-500">
              {zh ? '新密碼' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={inputClass + ' pr-16'} required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                {showPwd ? (zh ? '隱藏' : 'Hide') : (zh ? '顯示' : 'Show')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-500">
              {zh ? '確認新密碼' : 'Confirm Password'}
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={inputClass} required
            />
          </div>
          {pwdMsg.content && (
            <div className={`p-2 text-xs rounded ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {pwdMsg.content}
            </div>
          )}
          <button type="submit" disabled={pwdLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {pwdLoading ? '...' : (zh ? '更換密碼' : 'Update Password')}
          </button>
        </form>
      </section>

      {/* ── 薪資設置（只限 Admin）── */}
      {isAdmin && (
        <section className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold mb-1 text-gray-600 border-b pb-2">
            💰 {zh ? '薪資設置' : 'Payroll Settings'}
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            {zh ? '設置影響薪資計算和工資單生成' : 'These settings affect payroll calculation and payslip generation'}
          </p>

          {payrollLoading ? (
            <div className="text-sm text-gray-400 py-4 text-center">
              {zh ? '載入中...' : 'Loading...'}
            </div>
          ) : (
            <div className="space-y-5">

              {/* 工作天數/週 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {zh ? '每週工作天數 *' : 'Work Days per Week *'}
                </label>
                <div className="flex gap-3">
                  {[
                    { val: 5,   label: zh ? '5天（週一至週五）' : '5 days (Mon–Fri)' },
                    { val: 5.5, label: zh ? '5.5天（週六半天）' : '5.5 days (Sat half)' },
                    { val: 6,   label: zh ? '6天（週一至週六）' : '6 days (Mon–Sat)' },
                  ].map(opt => (
                    <label key={opt.val}
                      className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors
                        ${Number(payrollSettings.work_days_per_week) === opt.val
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      <input
                        type="radio"
                        name="work_days"
                        value={opt.val}
                        checked={Number(payrollSettings.work_days_per_week) === opt.val}
                        onChange={() => setPayrollSettings(s => ({ ...s, work_days_per_week: opt.val }))}
                        className="accent-blue-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {zh
                    ? '影響無薪假扣款計算（MOM 公式：基本薪資 ÷ 當月工作天數 × 無薪假天數）'
                    : 'Affects unpaid leave deduction (MOM formula: Basic ÷ working days × unpaid days)'}
                </p>
              </div>

              {/* CPF 提交號碼 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {zh ? 'CPF 提交號碼' : 'CPF Submission No.'}
                  <span className="text-gray-400 font-normal ml-1">({zh ? '選填' : 'optional'})</span>
                </label>
                <input
                  value={payrollSettings.cpf_submission_no}
                  onChange={e => setPayrollSettings(s => ({ ...s, cpf_submission_no: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. 201400368E-PTE-01"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {zh ? '顯示在 CPF 匯總報告頂部' : 'Shown on CPF submission report'}
                </p>
              </div>

              {/* 工資單頁腳 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {zh ? '工資單頁腳文字' : 'Payslip Footer Text'}
                  <span className="text-gray-400 font-normal ml-1">({zh ? '選填' : 'optional'})</span>
                </label>
                <input
                  value={payrollSettings.payslip_footer}
                  onChange={e => setPayrollSettings(s => ({ ...s, payslip_footer: e.target.value }))}
                  className={inputClass}
                  placeholder={zh
                    ? 'This payslip is system-generated. No signature required.'
                    : 'This payslip is system-generated. No signature required.'}
                />
              </div>

              {/* Logo 上傳 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {zh ? '公司 Logo（工資單用）' : 'Company Logo (for payslip)'}
                  <span className="text-gray-400 font-normal ml-1">({zh ? '選填，建議 PNG/SVG，白底' : 'optional, PNG/SVG preferred'})</span>
                </label>

                {logoPreview ? (
                  <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="h-14 object-contain rounded"
                      onError={e => { e.target.style.display='none' }}
                    />
                    <div className="flex-1">
                      <div className="text-xs text-green-600 font-medium mb-1">✅ {zh ? 'Logo 已設置' : 'Logo is set'}</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploading}
                          className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                          {logoUploading ? (zh ? '上傳中...' : 'Uploading...') : (zh ? '更換' : 'Change')}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-xs px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50 text-red-500">
                          {zh ? '移除' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    {logoUploading ? (
                      <div className="text-sm text-blue-600">{zh ? '上傳中...' : 'Uploading...'}</div>
                    ) : (
                      <>
                        <div className="text-2xl mb-2">🖼️</div>
                        <div className="text-sm text-gray-600">
                          {zh ? '點擊上傳公司 Logo' : 'Click to upload company logo'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">PNG, JPG, SVG · 最大 2MB</div>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Message */}
              {payrollMsg.content && (
                <div className={`p-3 text-sm rounded-lg ${payrollMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  {payrollMsg.content}
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSavePayroll}
                disabled={payrollSaving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                {payrollSaving
                  ? (zh ? '儲存中...' : 'Saving...')
                  : (zh ? '儲存薪資設置' : 'Save Payroll Settings')}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}