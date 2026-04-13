import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { can, MODULES } from '../utils/permissions'

const ROLES = ['hr_admin', 'hr_staff', 'manager', 'employee', 'finance', 'read_only']
const ROLE_LABELS = {
  hr_admin: 'HR Admin', hr_staff: 'HR Staff', manager: 'Manager',
  employee: 'Employee', finance: 'Finance', read_only: 'Read Only',
}
const LOCKED_ACTIONS = ['system.manage_roles']

export default function PermissionsTab({ userRole, permissions: permMap, text, language, companyId }) {
  const [matrix, setMatrix] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('role_permissions').select('*').eq('company_id', companyId)
      .then(({ data }) => {
        if (!data) return
        const m = {}
        data.forEach(({ role, action, allowed }) => {
          if (!m[role]) m[role] = {}
          m[role][action] = allowed
        })
        setMatrix(m)
      })
  }, [companyId])

  function toggle(role, action) {
    if (LOCKED_ACTIONS.includes(action)) return
    setMatrix(prev => ({
      ...prev,
      [role]: { ...prev[role], [action]: !prev[role]?.[action] }
    }))
  }

  async function save() {
    setSaving(true)
    const updates = []
    ROLES.forEach(role =>
      MODULES.forEach(mod =>
        mod.actions.forEach(({ key }) =>
          updates.push({
            role,
            action: key,
            allowed: !!matrix[role]?.[key],
            company_id: companyId,
          })
        )
      )
    )
    // 先刪除再插入，避免 upsert conflict 問題
    await supabase.from('role_permissions').delete().eq('company_id', companyId)
    const { error } = await supabase.from('role_permissions').insert(updates)
    if (error) console.error('[permissions] save error:', error)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!['super_admin', 'hr_admin'].includes(userRole))
    return <div className="p-8 text-center text-gray-400">{text.noPermission}</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{text.permissionsTitle}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {language === 'zh' ? 'Super Admin 擁有全部權限且不可修改' : 'Super Admin has all permissions and cannot be modified'}
          </p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving
            ? (language === 'zh' ? '儲存中...' : 'Saving...')
            : saved
              ? '✓ ' + (language === 'zh' ? '已儲存' : 'Saved')
              : (language === 'zh' ? '儲存變更' : 'Save Changes')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-600 border-b min-w-[220px]">
                {language === 'zh' ? '功能' : 'Feature'}
              </th>
              {ROLES.map(r => (
                <th key={r} className="p-3 font-medium text-gray-600 border-b text-center min-w-[90px]">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => (
              <React.Fragment key={mod.key}>
                <tr className="bg-blue-50">
                  <td colSpan={ROLES.length + 1} className="px-3 py-2 text-xs font-bold text-blue-700 tracking-wide">
                    {language === 'zh' ? mod.label_zh : mod.label_en}
                  </td>
                </tr>
                {mod.actions.map(({ key, label_zh, label_en }) => {
                  const locked = LOCKED_ACTIONS.includes(key)
                  return (
                    <tr key={key} className="hover:bg-gray-50 border-b border-gray-100">
                      <td className="p-3 text-gray-700 pl-6">
                        <div>{language === 'zh' ? label_zh : label_en}</div>
                        <div className="text-xs text-gray-400 font-mono">{key}</div>
                      </td>
                      {ROLES.map(role => {
                        const checked = !!matrix[role]?.[key]
                        return (
                          <td key={role} className="p-3 text-center">
                            {locked
                              ? <span className="text-xs text-gray-300">—</span>
                              : <input type="checkbox" checked={checked}
                                  onChange={() => toggle(role, key)}
                                  className="w-4 h-4 rounded cursor-pointer accent-blue-600" />
                            }
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
        <div>* Super Admin 擁有全部權限且不可修改</div>
        <div>* <code className="bg-gray-200 px-1 rounded">view_own</code> 系列由代碼邏輯控制，所有登入用戶預設擁有</div>
        <div>* <code className="bg-gray-200 px-1 rounded">system.manage_roles</code> 僅 Super Admin 可操作</div>
      </div>
    </div>
  )
}