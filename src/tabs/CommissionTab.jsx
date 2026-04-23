import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'
import { MONTH_NAMES, fmtSGD } from '../utils/payroll'

export default function CommissionTab({ text, language, companyId, currentUserId, userRole }) {
  const zh = language === 'zh'
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [employees,    setEmployees]    = useState([])
  const [commissions,  setCommissions]  = useState({}) // key = employee_id
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [success,      setSuccess]      = useState('')
  const [editingId,    setEditingId]    = useState(null)
  const [editForm,     setEditForm]     = useState({ amount: '', description: '' })

  const canEdit = ['super_admin','hr_admin','hr_staff'].includes(userRole)

  useEffect(() => { if (companyId) loadAll() }, [companyId, year, month])

  async function loadAll() {
    setLoading(true)
    const [{ data: emps }, { data: comms }] = await Promise.all([
      supabase.from('employees')
        .select('id, full_name, position, basic_salary')
        .eq('company_id', companyId)
        .order('full_name'),
      supabase.from('commissions')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', year)
        .eq('month', month),
    ])
    setEmployees(emps || [])
    const map = {}
    ;(comms || []).forEach(c => { map[c.employee_id] = c })
    setCommissions(map)
    setLoading(false)
  }

  async function handleSave(empId) {
    const amount = parseFloat(editForm.amount || 0)
    if (isNaN(amount)) return
    setSaving(true)
    const existing = commissions[empId]
    const payload = {
      employee_id: empId,
      company_id: companyId,
      year, month,
      amount,
      description: editForm.description.trim() || null,
      created_by: currentUserId,
      updated_at: new Date().toISOString(),
    }
    if (existing) {
      await supabase.from('commissions').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('commissions').insert([payload])
    }
    setEditingId(null)
    setEditForm({ amount: '', description: '' })
    setSuccess(zh ? '已儲存' : 'Saved')
    setTimeout(() => setSuccess(''), 3000)
    await loadAll()
    setSaving(false)
  }

  async function handleConfirm(empId) {
    const c = commissions[empId]
    if (!c) return
    await supabase.from('commissions')
      .update({ status: 'confirmed', confirmed_by: currentUserId, confirmed_at: new Date().toISOString() })
      .eq('id', c.id)
    setSuccess(zh ? '已確認' : 'Confirmed')
    setTimeout(() => setSuccess(''), 3000)
    await loadAll()
  }

  async function handleDelete(empId) {
    const c = commissions[empId]
    if (!c) return
    if (!window.confirm(zh ? '確定刪除?' : 'Delete?')) return
    await supabase.from('commissions').delete().eq('id', c.id)
    await loadAll()
  }

  function startEdit(emp) {
    const c = commissions[emp.id]
    setEditingId(emp.id)
    setEditForm({
      amount: c ? String(c.amount) : '',
      description: c?.description || '',
    })
  }

  const totalCommission = Object.values(commissions).reduce((s, c) => s + Number(c.amount || 0), 0)
  const confirmedCount  = Object.values(commissions).filter(c => c.status === 'confirmed').length

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {zh ? '佣金管理' : 'Commission Management'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {zh ? '每月佣金輸入，確認後自動帶入薪資計算' : 'Monthly commission entry — confirmed amounts feed into payroll'}
          </p>
        </div>
        {/* 月份選擇 */}
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {MONTH_NAMES.slice(1).map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 統計條 */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs">
          <div className="text-blue-700 font-semibold text-base">S$ {fmtSGD(totalCommission)}</div>
          <div className="text-blue-500">{zh ? '本月佣金總額' : 'Total commission'}</div>
        </div>
        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs">
          <div className="text-green-700 font-semibold text-base">{confirmedCount}</div>
          <div className="text-green-500">{zh ? '已確認' : 'Confirmed'}</div>
        </div>
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-xs">
          <div className="text-gray-700 font-semibold text-base">{Object.keys(commissions).length}</div>
          <div className="text-gray-500">{zh ? '有佣金員工' : 'With commission'}</div>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ {success}
        </div>
      )}

      {/* 提示 */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        💡 {zh
          ? '請在薪資跑帳前完成佣金確認。只有「已確認」的佣金才會自動帶入薪資計算。'
          : 'Please confirm all commissions before running payroll. Only "Confirmed" commissions are included in payroll.'}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          {zh ? '載入中...' : 'Loading...'}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {zh ? '員工' : 'Employee'}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {zh ? '佣金 (SGD)' : 'Commission (SGD)'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {zh ? '說明' : 'Description'}
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {zh ? '狀態' : 'Status'}
                </th>
                {canEdit && (
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {zh ? '操作' : 'Actions'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const comm = commissions[emp.id]
                const isEditing = editingId === emp.id
                const isConfirmed = comm?.status === 'confirmed'

                return (
                  <tr key={emp.id} className={`border-b border-gray-100 last:border-0
                    ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    {/* 員工 */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-sm">{emp.full_name}</div>
                      {emp.position && <div className="text-xs text-gray-400">{emp.position}</div>}
                    </td>

                    {/* 佣金金額 */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                          className="border border-blue-300 rounded-lg px-2 py-1 text-sm text-right
                            w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="0.00"
                          autoFocus
                        />
                      ) : (
                        <span className={`font-medium ${comm ? 'text-gray-800' : 'text-gray-300'}`}>
                          {comm ? `S$ ${fmtSGD(comm.amount)}` : '—'}
                        </span>
                      )}
                    </td>

                    {/* 說明 */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={editForm.description}
                          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                          className="border border-blue-300 rounded-lg px-2 py-1 text-sm w-full
                            focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder={zh ? '說明（選填）' : 'Description (optional)'}
                        />
                      ) : (
                        <span className="text-xs text-gray-500">{comm?.description || '—'}</span>
                      )}
                    </td>

                    {/* 狀態 */}
                    <td className="px-4 py-3 text-center">
                      {comm ? (
                        isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100
                            text-green-700 rounded-full text-xs font-medium">
                            ✅ {zh ? '已確認' : 'Confirmed'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100
                            text-amber-700 rounded-full text-xs font-medium">
                            ⏳ {zh ? '待確認' : 'Pending'}
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* 操作 */}
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleSave(emp.id)}
                              disabled={saving}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg
                                hover:bg-blue-700 disabled:opacity-50">
                              {saving ? '...' : (zh ? '儲存' : 'Save')}
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditForm({ amount: '', description: '' }) }}
                              className="px-3 py-1 text-xs text-gray-600 border border-gray-300
                                rounded-lg hover:bg-gray-50">
                              {zh ? '取消' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            {!isConfirmed && (
                              <button
                                onClick={() => startEdit(emp)}
                                className="text-xs text-blue-600 hover:underline">
                                {comm ? (zh ? '編輯' : 'Edit') : (zh ? '添加' : 'Add')}
                              </button>
                            )}
                            {comm && !isConfirmed && (
                              <button
                                onClick={() => handleConfirm(emp.id)}
                                className="text-xs text-green-600 hover:underline">
                                {zh ? '確認' : 'Confirm'}
                              </button>
                            )}
                            {comm && isConfirmed && userRole === 'super_admin' && (
                              <button
                                onClick={() => handleDelete(emp.id)}
                                className="text-xs text-red-400 hover:underline">
                                {zh ? '重置' : 'Reset'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}