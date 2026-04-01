import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { can } from '../utils/permissions'

export default function PermissionsTab({userRole,permissions:permMap,text,language,companyId}){
  const [matrix,setMatrix]=useState({})
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(false)
  const roles=['hr_admin','hr_staff','manager','employee','finance','read_only']
  const actions=[
    {key:'view_employees',label:language==='zh'?'查看員工列表':'View Employees'},
    {key:'create_employee',label:language==='zh'?'新增員工':'Create Employee'},
    {key:'edit_employee',label:language==='zh'?'編輯員工資料':'Edit Employee'},
    {key:'delete_employee',label:language==='zh'?'刪除員工':'Delete Employee'},
    {key:'view_salary',label:language==='zh'?'查看薪酬/銀行':'View Salary/Bank'},
    {key:'view_medical',label:language==='zh'?'查看醫療記錄':'View Medical'},
    {key:'view_visa',label:language==='zh'?'查看簽證記錄':'View Visa'},
    {key:'manage_dropdown',label:language==='zh'?'管理下拉選項':'Manage Dropdowns'},
    {key:'manage_roles',label:language==='zh'?'管理角色權限':'Manage Roles'},
  ]
  const roleLabels={hr_admin:'HR Admin',hr_staff:'HR Staff',manager:'Manager',employee:'Employee',finance:'Finance',read_only:'Read Only'}
  useEffect(()=>{
    supabase.from('role_permissions').select('*').eq('company_id',companyId).then(({data})=>{
      if(!data)return;const m={};data.forEach(({role,action,allowed})=>{if(!m[role])m[role]={};m[role][action]=allowed});setMatrix(m)
    })
  },[companyId])
  const toggle=(role,action)=>{if(action==='manage_roles')return;setMatrix(prev=>({...prev,[role]:{...prev[role],[action]:!prev[role]?.[action]}}))}
  const save=async()=>{setSaving(true);const updates=[];roles.forEach(role=>actions.forEach(({key})=>updates.push({role,action:key,allowed:!!matrix[role]?.[key],company_id:companyId})));await supabase.from('role_permissions').upsert(updates,{onConflict:'role,action'});setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000)}
  if(!can(permMap,userRole,'manage_dropdown'))return<div className="p-8 text-center text-gray-400">{text.noPermission}</div>
  return(
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{text.permissionsTitle}</h2>
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving?(language==='zh'?'儲存中...':'Saving...'):saved?('✓ '+(language==='zh'?'已儲存':'Saved')):(language==='zh'?'儲存變更':'Save Changes')}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">
            <th className="text-left p-3 font-medium text-gray-600 border-b">{text.feature}</th>
            {roles.map(r=><th key={r} className="p-3 font-medium text-gray-600 border-b text-center min-w-[90px]">{roleLabels[r]}</th>)}
          </tr></thead>
          <tbody>{actions.map(({key,label})=>(
            <tr key={key} className="hover:bg-gray-50 border-b border-gray-100">
              <td className="p-3 text-gray-700">{label}</td>
              {roles.map(role=>{
                const checked=!!matrix[role]?.[key];const locked=key==='manage_roles'
                return<td key={role} className="p-3 text-center"><input type="checkbox" checked={checked} disabled={locked} onChange={()=>toggle(role,key)} className="w-4 h-4 rounded cursor-pointer accent-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"/></td>
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">{text.permissionsNote}</p>
    </div>
  )
}