import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function LeaveApproversTab({ text, language, companyId }) {
  const [employees, setEmployees] = useState([])   // { id, full_name, position, auth_user_id }
  const [approvers, setApprovers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingEmp, setEditingEmp] = useState(null)
  const [approver1UserId, setApprover1UserId] = useState('')
  const [approver2UserId, setApprover2UserId] = useState('')
  const [requireBoth, setRequireBoth] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [search1, setSearch1] = useState('')
  const [search2, setSearch2] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => { if (companyId) fetchAll() }, [companyId])

  async function fetchAll() {
    setLoading(true)
    const [{ data: emps }, { data: apprs }] = await Promise.all([
      // ⭐ 必須拿 auth_user_id
      supabase.from('employees').select('id, full_name, position, auth_user_id')
        .eq('company_id', companyId).order('full_name'),
      supabase.from('leave_approvers').select('*').eq('company_id', companyId)
    ])
    setEmployees(emps || [])
    setApprovers(apprs || [])
    setLoading(false)
  }

  // 用 employee.id 找批准人設定
  function getApprover(empId) { return approvers.find(a => a.employee_id === empId) }

  // 用 auth_user_id 查名字（批准人顯示用）
  function nameByUserId(userId) {
    if (!userId) return '-'
    return employees.find(e => e.auth_user_id === userId)?.full_name || '-'
  }
  function positionByUserId(userId) {
    if (!userId) return ''
    return employees.find(e => e.auth_user_id === userId)?.position || ''
  }

  function startEdit(emp) {
    const existing = getApprover(emp.id)
    setApprover1UserId(existing?.approver1_user_id || '')
    setApprover2UserId(existing?.approver2_user_id || '')
    setRequireBoth(existing?.require_both || false)
    setSaveError(''); setSearch1(''); setSearch2('')
    setEditingEmp(emp)
  }

  async function handleSave() {
    setSaveError('')
    if (!approver1UserId) {
      setSaveError(language === 'zh' ? '請選擇第一批准人' : 'Please select Approver 1')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('leave_approvers').upsert({
      employee_id: editingEmp.id,
      approver1_user_id: approver1UserId,
      approver2_user_id: approver2UserId || null,
      require_both: requireBoth && !!approver2UserId,
      company_id: companyId,
    }, { onConflict: 'employee_id' })

    if (error) { setSaveError('保存失敗: ' + error.message); setSaving(false); return }
    setEditingEmp(null); setApprover1UserId(''); setApprover2UserId('')
    setRequireBoth(false); await fetchAll(); setSaving(false)
  }

  async function handleClear(empId) {
    if (!window.confirm(language === 'zh' ? '確定清除此員工的批准人設定？' : 'Clear approver settings?')) return
    await supabase.from('leave_approvers').delete().eq('employee_id', empId)
    fetchAll()
  }

  // 候選人列表：排除自己，排除已選的另一個
  const candidatesFor1 = employees.filter(e =>
    e.id !== editingEmp?.id && e.auth_user_id !== approver2UserId && e.auth_user_id
  )
  const candidatesFor2 = employees.filter(e =>
    e.id !== editingEmp?.id && e.auth_user_id !== approver1UserId && e.auth_user_id
  )
  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase())
  )

  function CandidateList({ candidates, searchVal, setSearchVal, selectedUserId, onSelect, color = 'blue' }) {
    const shown = candidates.filter(e =>
      !searchVal ||
      e.full_name?.toLowerCase().includes(searchVal.toLowerCase()) ||
      e.position?.toLowerCase().includes(searchVal.toLowerCase())
    )
    return (
      <div className="border rounded-lg overflow-y-auto max-h-40 bg-white">
        {shown.map(e => (
          <button key={e.id} onClick={() => { onSelect(e.auth_user_id); setSearchVal('') }}
            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 border-b border-gray-50 last:border-0 transition-colors
              ${selectedUserId === e.auth_user_id
                ? `bg-${color}-50 text-${color}-700`
                : `hover:bg-${color}-50 text-gray-700`}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              ${selectedUserId === e.auth_user_id ? `bg-${color}-600 text-white` : 'bg-gray-200 text-gray-600'}`}>
              {e.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{e.full_name}</div>
              {e.position && <div className="text-gray-400 truncate">{e.position}</div>}
            </div>
            {selectedUserId === e.auth_user_id && <span className={`ml-auto text-${color}-600`}>✓</span>}
          </button>
        ))}
        {shown.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-400 text-center">
            {language === 'zh' ? '找不到符合的員工' : 'No results'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {language === 'zh' ? '假期批准人設定' : 'Leave Approver Settings'}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {language === 'zh' ? '為每位員工設定最多兩個批准人' : 'Set up to 2 approvers per employee'}
        </p>
      </div>

      {/* 編輯面板 */}
      {editingEmp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {language === 'zh' ? `設定批准人：${editingEmp.full_name}` : `Set Approvers: ${editingEmp.full_name}`}
            {editingEmp.position && <span className="text-xs text-gray-400 ml-2">({editingEmp.position})</span>}
          </h3>
          {saveError && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{saveError}</div>}

          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* 第一批准人 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                {language === 'zh' ? '第一批准人 *' : 'Approver 1 *'}
              </label>
              {approver1UserId ? (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-300 rounded-lg mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {nameByUserId(approver1UserId)?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{nameByUserId(approver1UserId)}</div>
                    <div className="text-xs text-gray-500 truncate">{positionByUserId(approver1UserId) || '-'}</div>
                  </div>
                  <button onClick={() => { setApprover1UserId(''); setSearch1('') }}
                    className="text-gray-400 hover:text-red-500 text-lg leading-none flex-shrink-0">×</button>
                </div>
              ) : (
                <div className="p-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg mb-2 text-xs text-gray-400 text-center">
                  {language === 'zh' ? '尚未選擇' : 'Not selected'}
                </div>
              )}
              <input type="text" value={search1} onChange={e => setSearch1(e.target.value)}
                placeholder={language === 'zh' ? '搜索...' : 'Search...'}
                className="w-full border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 mb-1" />
              <CandidateList candidates={candidatesFor1} searchVal={search1} setSearchVal={setSearch1}
                selectedUserId={approver1UserId} onSelect={setApprover1UserId} color="blue" />
            </div>

            {/* 第二批准人 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                {language === 'zh' ? '第二批准人（可選）' : 'Approver 2 (Optional)'}
              </label>
              {approver2UserId ? (
                <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-300 rounded-lg mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {nameByUserId(approver2UserId)?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{nameByUserId(approver2UserId)}</div>
                    <div className="text-xs text-gray-500 truncate">{positionByUserId(approver2UserId) || '-'}</div>
                  </div>
                  <button onClick={() => { setApprover2UserId(''); setSearch2(''); setRequireBoth(false) }}
                    className="text-gray-400 hover:text-red-500 text-lg leading-none flex-shrink-0">×</button>
                </div>
              ) : (
                <div className="p-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg mb-2 text-xs text-gray-400 text-center">
                  {language === 'zh' ? '可不設定' : 'Optional'}
                </div>
              )}
              <input type="text" value={search2} onChange={e => setSearch2(e.target.value)}
                placeholder={language === 'zh' ? '搜索...' : 'Search...'}
                className="w-full border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 mb-1" />
              <div className="border rounded-lg overflow-y-auto max-h-40 bg-white">
                <button onClick={() => { setApprover2UserId(''); setSearch2(''); setRequireBoth(false) }}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50 flex items-center gap-2 transition-colors ${!approver2UserId ? 'bg-gray-50 text-gray-500' : 'hover:bg-gray-50 text-gray-400'}`}>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">–</div>
                  <span>{language === 'zh' ? '不設第二批准人' : 'No second approver'}</span>
                  {!approver2UserId && <span className="ml-auto text-gray-400">✓</span>}
                </button>
                <CandidateList candidates={candidatesFor2} searchVal={search2} setSearchVal={setSearch2}
                  selectedUserId={approver2UserId} onSelect={setApprover2UserId} color="green" />
              </div>
            </div>
          </div>

          {approver2UserId && (
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={requireBoth} onChange={e => setRequireBoth(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                {language === 'zh' ? '需要兩人同時批准' : 'Require both approvers'}
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditingEmp(null); setApprover1UserId(''); setApprover2UserId(''); setRequireBoth(false); setSaveError('') }}
              className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSave} disabled={saving}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : text.save}
            </button>
          </div>
        </div>
      )}

      {/* 搜索 */}
      <input type="text" placeholder={language === 'zh' ? '搜索員工...' : 'Search employees...'}
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

      {/* 列表 */}
      {loading ? <div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div> : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-600 border-b">{language === 'zh' ? '員工' : 'Employee'}</th>
              <th className="text-left p-3 font-medium text-gray-600 border-b">{language === 'zh' ? '第一批准人' : 'Approver 1'}</th>
              <th className="text-left p-3 font-medium text-gray-600 border-b">{language === 'zh' ? '第二批准人' : 'Approver 2'}</th>
              <th className="text-center p-3 font-medium text-gray-600 border-b">{language === 'zh' ? '需雙批' : 'Both Req.'}</th>
              <th className="text-center p-3 font-medium text-gray-600 border-b">{text.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const apr = getApprover(emp.id)
              return (
                <tr key={emp.id} className={`border-b border-gray-100 hover:bg-gray-50 ${editingEmp?.id === emp.id ? 'bg-blue-50' : ''}`}>
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{emp.full_name}</div>
                    <div className="text-xs text-gray-400">{emp.position || '-'}</div>
                  </td>
                  <td className="p-3 text-sm">
                    {apr?.approver1_user_id
                      ? <div><div className="font-medium text-gray-800">{nameByUserId(apr.approver1_user_id)}</div>
                          <div className="text-xs text-gray-400">{positionByUserId(apr.approver1_user_id)}</div></div>
                      : <span className="text-gray-300 text-xs">{language === 'zh' ? '未設定' : 'Not set'}</span>}
                  </td>
                  <td className="p-3 text-sm">
                    {apr?.approver2_user_id
                      ? <div><div className="font-medium text-gray-800">{nameByUserId(apr.approver2_user_id)}</div>
                          <div className="text-xs text-gray-400">{positionByUserId(apr.approver2_user_id)}</div></div>
                      : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="p-3 text-center">
                    {apr?.require_both
                      ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{language === 'zh' ? '需雙批' : 'Yes'}</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{language === 'zh' ? '一人即可' : 'Any'}</span>}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => startEdit(emp)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
                      {apr && <button onClick={() => handleClear(emp.id)} className="text-xs text-red-500 hover:underline">{language === 'zh' ? '清除' : 'Clear'}</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}