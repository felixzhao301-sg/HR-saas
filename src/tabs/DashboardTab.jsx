// src/tabs/DashboardTab.jsx
import { supabase } from '../supabase'
import { useState, useEffect } from 'react'

export default function DashboardTab({ text, language, userRole, currentUserId, selectedEmployeeId, companyId }) {
  const zh = language === 'zh'
  const [announcements,        setAnnouncements]        = useState([])
  const [platformAnnouncements,setPlatformAnnouncements] = useState([])
  const [leaveBalance,         setLeaveBalance]          = useState([])
  const [pendingCount,         setPendingCount]          = useState(0)
  const [expiringVisas,        setExpiringVisas]         = useState([])
  const [birthdays,            setBirthdays]             = useState([])
  const [loading,              setLoading]               = useState(true)
  const [showAnnForm,          setShowAnnForm]           = useState(false)
  const [annTitle,             setAnnTitle]              = useState('')
  const [annContent,           setAnnContent]            = useState('')
  const [annPinned,            setAnnPinned]             = useState(false)
  const [annExpiry,            setAnnExpiry]             = useState('')
  const [saving,               setSaving]                = useState(false)

  // ✅ 只有 super_admin 和 hr_admin 可以發布/刪除公告
  const canPostAnn  = ['super_admin', 'hr_admin'].includes(userRole)
  const isHR        = ['super_admin', 'hr_admin', 'hr_staff'].includes(userRole)
  const isManager   = ['super_admin', 'hr_admin', 'hr_staff', 'manager'].includes(userRole)

  const today = new Date().toISOString().split('T')[0]
  const in30  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  useEffect(() => { if (companyId) fetchAll() }, [companyId])

  async function fetchAll() {
    setLoading(true)

    const queries = [
      // 公司公告
      supabase.from('announcements').select('*')
        .eq('company_id', companyId)
        .or(`expires_at.is.null,expires_at.gt.${today}`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10),

      // ✅ 平台公告（所有人都看到）
      supabase.from('platform_announcements').select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${today}`)
        .order('created_at', { ascending: false })
        .limit(5),
    ]

    if (userRole === 'employee' && selectedEmployeeId) {
      queries.push(supabase.from('leave_balances').select('*')
        .eq('employee_id', selectedEmployeeId).eq('company_id', companyId)
        .eq('year', new Date().getFullYear()))
    }
    if (isManager) {
      queries.push(supabase.from('leave_applications').select('id', { count: 'exact' })
        .eq('status', 'pending').eq('company_id', companyId))
    }
    if (isHR) {
      queries.push(supabase.from('employee_visa').select('id,visa_type,expiry_date,employee_id,employees!inner(full_name,company_id)')
        .eq('employees.company_id', companyId).lte('expiry_date', in30).gte('expiry_date', today).order('expiry_date'))
      queries.push(supabase.from('employees').select('id,full_name,date_of_birth')
        .eq('company_id', companyId).not('date_of_birth', 'is', null))
    }

    const results = await Promise.all(queries)
    setAnnouncements(results[0].data || [])
    setPlatformAnnouncements(results[1].data || [])

    let idx = 2
    if (userRole === 'employee' && selectedEmployeeId) { setLeaveBalance(results[idx]?.data || []); idx++ }
    if (isManager) { setPendingCount(results[idx]?.count || 0); idx++ }
    if (isHR) {
      setExpiringVisas(results[idx]?.data || []); idx++
      const emps = results[idx]?.data || []
      const upcoming = emps.filter(e => {
        if (!e.date_of_birth) return false
        const d = new Date(); const in7 = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000)
        const thisYear = new Date().getFullYear()
        const bday = new Date(`${thisYear}-${e.date_of_birth.slice(5)}`)
        return bday >= d && bday <= in7
      })
      setBirthdays(upcoming)
    }
    setLoading(false)
  }

  async function handlePostAnn() {
    if (!annTitle) { alert(zh ? '請填寫標題' : 'Please enter title'); return }
    setSaving(true)
    // ✅ 加入 created_by_name
    const { data: roleData } = await supabase.from('user_roles').select('display_name').eq('user_id', currentUserId).maybeSingle()
    await supabase.from('announcements').insert([{
      title:            annTitle,
      content:          annContent,
      is_pinned:        annPinned,
      created_by:       currentUserId,
      created_by_name:  roleData?.display_name || '',
      expires_at:       annExpiry || null,
      company_id:       companyId,
    }])
    setAnnTitle(''); setAnnContent(''); setAnnPinned(false); setAnnExpiry('')
    setShowAnnForm(false); fetchAll(); setSaving(false)
  }

  async function handleDeleteAnn(id) {
    if (!window.confirm(zh ? '確定刪除這個公告嗎？' : 'Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id); fetchAll()
  }

  const leaveTypeLabel = (val) => ({
    annual:   zh ? '年假'   : 'Annual',
    medical:  zh ? '病假'   : 'Medical',
    unpaid:   zh ? '無薪假' : 'Unpaid',
    others:   zh ? '其他'   : 'Others',
  }[val] || val)

  // 平台公告類型樣式
  const platformTypeStyle = (type) => ({
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    update:  'bg-green-50 border-green-200 text-green-800',
  }[type] || 'bg-blue-50 border-blue-200 text-blue-800')

  const platformTypeIcon = (type) => ({ info: '🔔', warning: '⚠️', update: '🆕' }[type] || '🔔')

  if (loading) return <div className="p-8 text-center text-gray-400">{text.loading}</div>

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

      {/* ✅ 平台公告（藍色帶標記，所有人看到） */}
      {platformAnnouncements.length > 0 && (
        <div className="space-y-2">
          {platformAnnouncements.map(ann => (
            <div key={ann.id} className={`rounded-xl p-4 border ${platformTypeStyle(ann.type)}`}>
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{platformTypeIcon(ann.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      {zh ? '平台通知' : 'Platform Notice'}
                    </span>
                    <span className="font-semibold text-sm">{ann.title}</span>
                  </div>
                  {ann.content && <div className="text-sm whitespace-pre-wrap">{ann.content}</div>}
                  <div className="text-xs opacity-60 mt-1.5">{ann.created_at?.slice(0, 10)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 待審批提醒 */}
      {isManager && pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-lg flex-shrink-0">{pendingCount}</div>
          <div>
            <div className="font-medium text-amber-800 text-sm">{zh ? '待審批假期申請' : 'Pending Leave Applications'}</div>
            <div className="text-xs text-amber-600 mt-0.5">{zh ? '點擊「年假管理」處理' : 'Go to Leave Management to process'}</div>
          </div>
        </div>
      )}

      {/* 簽證到期提醒 */}
      {isHR && expiringVisas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="font-medium text-red-700 text-sm mb-2">
            ⚠️ {zh ? `${expiringVisas.length} 個簽證將在30天內到期` : `${expiringVisas.length} visa(s) expiring within 30 days`}
          </div>
          <div className="space-y-1">
            {expiringVisas.slice(0, 3).map(v => (
              <div key={v.id} className="text-xs text-red-600 flex justify-between">
                <span>{v.employees?.full_name} — {v.visa_type}</span>
                <span>{v.expiry_date}</span>
              </div>
            ))}
            {expiringVisas.length > 3 && <div className="text-xs text-red-400">...{zh ? `還有 ${expiringVisas.length - 3} 個` : `and ${expiringVisas.length - 3} more`}</div>}
          </div>
        </div>
      )}

      {/* 生日提醒 */}
      {isHR && birthdays.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="font-medium text-purple-700 text-sm mb-2">🎂 {zh ? '本週生日' : 'Birthdays this week'}</div>
          <div className="flex flex-wrap gap-2">
            {birthdays.map(e => (
              <span key={e.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{e.full_name} ({e.date_of_birth?.slice(5)})</span>
            ))}
          </div>
        </div>
      )}

      {/* 員工假期餘額 */}
      {userRole === 'employee' && leaveBalance.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="font-medium text-gray-700 text-sm mb-3">{new Date().getFullYear()} {zh ? '我的假期餘額' : 'My Leave Balance'}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {leaveBalance.map(b => {
              const remaining = Number(b.entitled) + Number(b.carried_forward) + Number(b.adjusted) - Number(b.used)
              return (
                <div key={b.id} className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">{leaveTypeLabel(b.leave_type)}</div>
                  <div className={`text-2xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-blue-600'}`}>{remaining}</div>
                  <div className="text-xs text-gray-400">{zh ? '天' : 'days'}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ✅ 公司公告 — 發布權限只給 super_admin / hr_admin */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-medium text-gray-700 text-sm">📢 {zh ? '公司公告' : 'Company Announcements'}</div>
          {/* ✅ 只有 super_admin 和 hr_admin 才看到發布按鈕 */}
          {canPostAnn && !showAnnForm && (
            <button onClick={() => setShowAnnForm(true)}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
              + {zh ? '發布公告' : 'Post'}
            </button>
          )}
        </div>

        {/* 發布表單 */}
        {showAnnForm && canPostAnn && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{zh ? '標題 *' : 'Title *'}</label>
                <input value={annTitle} onChange={e => setAnnTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={zh ? '公告標題...' : 'Announcement title...'} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{zh ? '內容' : 'Content'}</label>
                <textarea value={annContent} onChange={e => setAnnContent(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={3} placeholder={zh ? '公告內容...' : 'Content...'} />
              </div>
              <div className="flex gap-4 items-center flex-wrap">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={annPinned} onChange={e => setAnnPinned(e.target.checked)} className="accent-blue-600" />
                  {zh ? '置頂' : 'Pin to top'}
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">{zh ? '到期日（可選）' : 'Expires (optional)'}</label>
                  <input type="date" value={annExpiry} onChange={e => setAnnExpiry(e.target.value)}
                    className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setShowAnnForm(false); setAnnTitle(''); setAnnContent(''); setAnnPinned(false); setAnnExpiry('') }}
                className="px-3 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50">{text.cancel}</button>
              <button onClick={handlePostAnn} disabled={saving}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? '...' : (zh ? '發布' : 'Post')}
              </button>
            </div>
          </div>
        )}

        {/* 公告列表 */}
        {announcements.length === 0
          ? <div className="text-sm text-gray-400 py-6 text-center border-2 border-dashed rounded-xl">{zh ? '暫無公告' : 'No announcements'}</div>
          : <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className={`rounded-xl p-4 ${ann.is_pinned ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {ann.is_pinned && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">{zh ? '置頂' : 'Pinned'}</span>}
                      <span className="font-medium text-sm text-gray-800">{ann.title}</span>
                    </div>
                    {ann.content && <div className="text-sm text-gray-600 whitespace-pre-wrap">{ann.content}</div>}
                    <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                      {ann.created_by_name && <span>{ann.created_by_name}</span>}
                      <span>{ann.created_at?.slice(0, 10)}</span>
                      {ann.expires_at && <span>· {zh ? '到期' : 'Expires'}: {ann.expires_at.slice(0, 10)}</span>}
                    </div>
                  </div>
                  {/* ✅ 刪除按鈕只給有權限的人 */}
                  {canPostAnn && (
                    <button onClick={() => handleDeleteAnn(ann.id)}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline flex-shrink-0">
                      {text.delete}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}