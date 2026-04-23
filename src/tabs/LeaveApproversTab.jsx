import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../supabase'

// ─────────────────────────────────────────────
// 數據層：一次查詢，Map 結構做 O(1) lookup
// ─────────────────────────────────────────────
async function fetchApproversData(companyId) {
  const [{ data: emps, error: e1 }, { data: apprs, error: e2 }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, position, auth_user_id, personal_email')
      .eq('company_id', companyId)
      .order('full_name'),
    supabase
      .from('leave_approvers')
      .select('employee_id, approver1_user_id, approver2_user_id, require_both')
      .eq('company_id', companyId),
  ])
  if (e1 || e2) throw new Error(e1?.message || e2?.message)

  // O(1) lookup maps
  const empByAuthId = new Map(
    (emps || []).filter(e => e.auth_user_id).map(e => [e.auth_user_id, e])
  )
  const approverByEmpId = new Map((apprs || []).map(a => [a.employee_id, a]))

  return { employees: emps || [], empByAuthId, approverByEmpId }
}

// ─────────────────────────────────────────────
// 子組件：候選人列表
// ─────────────────────────────────────────────
function CandidateList({ candidates, searchVal, selectedUserId, onSelect, color = 'blue', language }) {
  const shown = useMemo(() =>
    candidates.filter(e =>
      !searchVal ||
      e.full_name?.toLowerCase().includes(searchVal.toLowerCase()) ||
      e.position?.toLowerCase().includes(searchVal.toLowerCase())
    ), [candidates, searchVal])

  const colorMap = {
    blue:  { bg: 'bg-blue-50',  text: 'text-blue-700',  avatar: 'bg-blue-600',  check: 'text-blue-600'  },
    green: { bg: 'bg-green-50', text: 'text-green-700', avatar: 'bg-green-600', check: 'text-green-600' },
  }
  const c = colorMap[color]

  return (
    <div className="border rounded-lg overflow-y-auto max-h-40 bg-white">
      {shown.length === 0 ? (
        <div className="px-3 py-4 text-xs text-gray-400 text-center">
          {language === 'zh' ? '找不到符合的員工' : 'No results'}
        </div>
      ) : shown.map(e => {
        const isSelected = selectedUserId === e.auth_user_id
        return (
          <button key={e.id}
            onClick={() => onSelect(e.auth_user_id)}
            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2
              border-b border-gray-50 last:border-0 transition-colors
              ${isSelected ? `${c.bg} ${c.text}` : 'hover:bg-gray-50 text-gray-700'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center
              text-xs font-bold flex-shrink-0
              ${isSelected ? `${c.avatar} text-white` : 'bg-gray-200 text-gray-600'}`}>
              {e.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{e.full_name}</div>
              {e.position && <div className="text-gray-400 truncate">{e.position}</div>}
            </div>
            {isSelected && <span className={`ml-auto ${c.check} font-bold`}>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// 子組件：選中的批准人顯示卡片
// ─────────────────────────────────────────────
function SelectedCard({ userId, empByAuthId, onClear, color = 'blue', language }) {
  const colorMap = {
    blue:  { border: 'border-blue-300',  bg: 'bg-blue-50',  avatar: 'bg-blue-600'  },
    green: { border: 'border-green-300', bg: 'bg-green-50', avatar: 'bg-green-600' },
  }
  const c = colorMap[color]
  const emp = empByAuthId.get(userId)

  if (!userId) return (
    <div className="p-2.5 bg-gray-50 border border-dashed border-gray-300
      rounded-lg mb-2 text-xs text-gray-400 text-center">
      {language === 'zh' ? '尚未選擇' : 'Not selected'}
    </div>
  )

  return (
    <div className={`flex items-center gap-2 p-2.5 ${c.bg} border ${c.border} rounded-lg mb-2`}>
      <div className={`w-8 h-8 rounded-full ${c.avatar} text-white
        flex items-center justify-center text-sm font-bold flex-shrink-0`}>
        {emp?.full_name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{emp?.full_name || '-'}</div>
        <div className="text-xs text-gray-500 truncate">{emp?.position || '-'}</div>
      </div>
      <button onClick={onClear}
        className="text-gray-400 hover:text-red-500 text-xl leading-none flex-shrink-0">×</button>
    </div>
  )
}

// ─────────────────────────────────────────────
// 子組件：編輯面板
// ─────────────────────────────────────────────
function ApproverEditPanel({
  editingEmp, employees, empByAuthId,
  approver1UserId, setApprover1UserId,
  approver2UserId, setApprover2UserId,
  requireBoth, setRequireBoth,
  saving, saveError,
  onSave, onCancel,
  language, text,
}) {
  const [search1, setSearch1] = useState('')
  const [search2, setSearch2] = useState('')

  // 候選人 = 有帳號 + 排除自己 + 排除已選的另一個
  const candidatesFor1 = useMemo(() =>
    employees.filter(e =>
      e.auth_user_id &&
      e.id !== editingEmp.id &&
      e.auth_user_id !== approver2UserId
    ), [employees, editingEmp.id, approver2UserId])

  const candidatesFor2 = useMemo(() =>
    employees.filter(e =>
      e.auth_user_id &&
      e.id !== editingEmp.id &&
      e.auth_user_id !== approver1UserId
    ), [employees, editingEmp.id, approver1UserId])

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white
          flex items-center justify-center text-sm font-bold flex-shrink-0">
          {editingEmp.full_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-800">
            {language === 'zh'
              ? `設定批准人：${editingEmp.full_name}`
              : `Set Approvers: ${editingEmp.full_name}`}
          </div>
          {editingEmp.position &&
            <div className="text-xs text-gray-400">{editingEmp.position}</div>}
        </div>
      </div>

      {/* 錯誤提示 */}
      {saveError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {saveError}
        </div>
      )}

      {/* 兩列選擇器 */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* 第一批准人 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            {language === 'zh' ? '第一批准人 *' : 'Approver 1 *'}
          </label>
          <SelectedCard
            userId={approver1UserId}
            empByAuthId={empByAuthId}
            onClear={() => { setApprover1UserId(''); setSearch1('') }}
            color="blue"
            language={language}
          />
          <input
            type="text" value={search1}
            onChange={e => setSearch1(e.target.value)}
            placeholder={language === 'zh' ? '搜索...' : 'Search...'}
            className="w-full border rounded-lg px-3 py-1.5 text-xs mb-1
              focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
          <CandidateList
            candidates={candidatesFor1}
            searchVal={search1}
            selectedUserId={approver1UserId}
            onSelect={(uid) => { setApprover1UserId(uid); setSearch1('') }}
            color="blue"
            language={language}
          />
        </div>

        {/* 第二批准人 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            {language === 'zh' ? '第二批准人（可選）' : 'Approver 2 (Optional)'}
          </label>
          {approver2UserId ? (
            <SelectedCard
              userId={approver2UserId}
              empByAuthId={empByAuthId}
              onClear={() => { setApprover2UserId(''); setSearch2(''); setRequireBoth(false) }}
              color="green"
              language={language}
            />
          ) : (
            <div className="p-2.5 bg-gray-50 border border-dashed border-gray-300
              rounded-lg mb-2 text-xs text-gray-400 text-center">
              {language === 'zh' ? '可不設定' : 'Optional'}
            </div>
          )}
          <input
            type="text" value={search2}
            onChange={e => setSearch2(e.target.value)}
            placeholder={language === 'zh' ? '搜索...' : 'Search...'}
            className="w-full border rounded-lg px-3 py-1.5 text-xs mb-1
              focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          />
          <div className="border rounded-lg overflow-y-auto max-h-40 bg-white">
            {/* 清除第二批准人選項 */}
            <button
              onClick={() => { setApprover2UserId(''); setSearch2(''); setRequireBoth(false) }}
              className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50
                flex items-center gap-2 transition-colors
                ${!approver2UserId ? 'bg-gray-50 text-gray-500' : 'hover:bg-gray-50 text-gray-400'}`}>
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center
                justify-center text-gray-400 flex-shrink-0 text-sm">–</div>
              <span>{language === 'zh' ? '不設第二批准人' : 'No second approver'}</span>
              {!approver2UserId && <span className="ml-auto text-gray-400">✓</span>}
            </button>
            <CandidateList
              candidates={candidatesFor2}
              searchVal={search2}
              selectedUserId={approver2UserId}
              onSelect={(uid) => { setApprover2UserId(uid); setSearch2('') }}
              color="green"
              language={language}
            />
          </div>
        </div>
      </div>

      {/* 需雙批 checkbox */}
      {approver2UserId && (
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer mb-3">
          <input
            type="checkbox" checked={requireBoth}
            onChange={e => setRequireBoth(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          {language === 'zh' ? '需要兩人同時批准才生效' : 'Require both approvers to approve'}
        </label>
      )}

      {/* 操作按鈕 */}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300
            rounded-lg hover:bg-gray-50 transition-colors">
          {text.cancel}
        </button>
        <button onClick={onSave} disabled={saving}
          className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
          {saving ? (language === 'zh' ? '保存中...' : 'Saving...') : text.save}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 主組件
// ─────────────────────────────────────────────
export default function LeaveApproversTab({ text, language, companyId }) {
  const [employees, setEmployees] = useState([])
  const [empByAuthId, setEmpByAuthId] = useState(new Map())
  const [approverByEmpId, setApproverByEmpId] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const [editingEmp, setEditingEmp] = useState(null)
  const [approver1UserId, setApprover1UserId] = useState('')
  const [approver2UserId, setApprover2UserId] = useState('')
  const [requireBoth, setRequireBoth] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [search, setSearch] = useState('')

  // ── 數據加載 ──
  const loadData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setFetchError('')
    try {
      const result = await fetchApproversData(companyId)
      setEmployees(result.employees)
      setEmpByAuthId(result.empByAuthId)
      setApproverByEmpId(result.approverByEmpId)
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { loadData() }, [loadData])

  // ── 過濾列表（memoized）──
  const filtered = useMemo(() =>
    employees.filter(e =>
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.position?.toLowerCase().includes(search.toLowerCase())
    ), [employees, search])

  // ── 開始編輯 ──
  function startEdit(emp) {
    if (!emp.auth_user_id) return // 無帳號，由行內警告處理
    const existing = approverByEmpId.get(emp.id)
    setApprover1UserId(existing?.approver1_user_id || '')
    setApprover2UserId(existing?.approver2_user_id || '')
    setRequireBoth(existing?.require_both || false)
    setSaveError('')
    setEditingEmp(emp)
  }

  // ── 取消編輯 ──
  function cancelEdit() {
    setEditingEmp(null)
    setApprover1UserId('')
    setApprover2UserId('')
    setRequireBoth(false)
    setSaveError('')
  }

  // ── 保存 ──
  async function handleSave() {
    setSaveError('')
    if (!approver1UserId) {
      setSaveError(language === 'zh' ? '請選擇第一批准人' : 'Please select Approver 1')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('leave_approvers').upsert({
      employee_id: editingEmp.id,
      company_id: companyId,
      approver1_user_id: approver1UserId,
      approver2_user_id: approver2UserId || null,
      require_both: requireBoth && !!approver2UserId,
    }, { onConflict: 'employee_id' })

    if (error) {
      setSaveError((language === 'zh' ? '保存失敗：' : 'Save failed: ') + error.message)
      setSaving(false)
      return
    }
    cancelEdit()
    await loadData()
    setSaving(false)
  }

  // ── 清除批准人 ──
  async function handleClear(empId) {
    const confirmed = window.confirm(
      language === 'zh'
        ? '確定清除此員工的批准人設定？'
        : 'Clear approver settings for this employee?'
    )
    if (!confirmed) return
    await supabase.from('leave_approvers').delete().eq('employee_id', empId)
    await loadData()
  }

  // ── O(1) 名字和職位查找 ──
  function approverName(userId) {
    return empByAuthId.get(userId)?.full_name || '-'
  }
  function approverPosition(userId) {
    return empByAuthId.get(userId)?.position || '-'
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* 頁頭 */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800">
          {language === 'zh' ? '假期批准人設定' : 'Leave Approver Settings'}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {language === 'zh'
            ? '為每位員工指定第一及第二批准人（批准人必須擁有系統帳號）'
            : 'Assign up to 2 approvers per employee. Approvers must have a system account.'}
        </p>
      </div>

      {/* 加載錯誤 */}
      {fetchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {/* 編輯面板 */}
      {editingEmp && (
        <ApproverEditPanel
          editingEmp={editingEmp}
          employees={employees}
          empByAuthId={empByAuthId}
          approver1UserId={approver1UserId}
          setApprover1UserId={setApprover1UserId}
          approver2UserId={approver2UserId}
          setApprover2UserId={setApprover2UserId}
          requireBoth={requireBoth}
          setRequireBoth={setRequireBoth}
          saving={saving}
          saveError={saveError}
          onSave={handleSave}
          onCancel={cancelEdit}
          language={language}
          text={text}
        />
      )}

      {/* 搜索 */}
      <input
        type="text"
        placeholder={language === 'zh' ? '搜索員工姓名或職位...' : 'Search by name or position...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />

      {/* 員工列表 */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">{text.loading}</div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  {language === 'zh' ? '員工' : 'Employee'}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  {language === 'zh' ? '第一批准人' : 'Approver 1'}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  {language === 'zh' ? '第二批准人' : 'Approver 2'}
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  {language === 'zh' ? '需雙批' : 'Both Req.'}
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  {text.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const apr = approverByEmpId.get(emp.id)   // O(1)
                const hasAccount = !!emp.auth_user_id
                const isEditing = editingEmp?.id === emp.id

                return (
                  <tr key={emp.id}
                    className={`border-b border-gray-100 last:border-0 transition-colors
                      ${isEditing ? 'bg-blue-50'
                        : !hasAccount ? 'bg-amber-50/50'
                        : 'hover:bg-gray-50'}`}>

                    {/* 員工 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center
                          text-xs font-bold flex-shrink-0
                          ${hasAccount ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-600'}`}>
                          {emp.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{emp.full_name}</div>
                          <div className="text-xs text-gray-400">{emp.position || '-'}</div>
                        </div>
                      </div>
                    </td>

                    {/* 無帳號：跨列警告 */}
                    {!hasAccount ? (
                      <td colSpan={3} className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-amber-600">
                          <span>⚠️</span>
                          <span>
                            {language === 'zh'
                              ? '此員工尚未創建系統帳號，請先至「用戶管理」為其建立帳號後再設定批准人'
                              : 'No system account yet. Please go to User Management to create an account first.'}
                          </span>
                        </div>
                      </td>
                    ) : (
                      <>
                        {/* 第一批准人 */}
                        <td className="px-4 py-3">
                          {apr?.approver1_user_id ? (
                            <div>
                              <div className="font-medium text-gray-800">{approverName(apr.approver1_user_id)}</div>
                              <div className="text-xs text-gray-400">{approverPosition(apr.approver1_user_id)}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">
                              {language === 'zh' ? '未設定' : 'Not set'}
                            </span>
                          )}
                        </td>

                        {/* 第二批准人 */}
                        <td className="px-4 py-3">
                          {apr?.approver2_user_id ? (
                            <div>
                              <div className="font-medium text-gray-800">{approverName(apr.approver2_user_id)}</div>
                              <div className="text-xs text-gray-400">{approverPosition(apr.approver2_user_id)}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>

                        {/* 需雙批 */}
                        <td className="px-4 py-3 text-center">
                          {apr?.require_both ? (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              {language === 'zh' ? '需雙批' : 'Yes'}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                              {language === 'zh' ? '一人即可' : 'Any'}
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {/* 操作 */}
                    <td className="px-4 py-3 text-center">
                      {hasAccount ? (
                        <div className="flex gap-3 justify-center">
                          <button onClick={() => startEdit(emp)}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                            {text.edit}
                          </button>
                          {apr && (
                            <button onClick={() => handleClear(emp.id)}
                              className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors">
                              {language === 'zh' ? '清除' : 'Clear'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    {language === 'zh' ? '找不到員工' : 'No employees found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}