import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass, ROLE_LABELS } from '../constants'

export default function UserManagementTab({text,language,currentUserRole,companyId}){
  const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingUser,setEditingUser]=useState(null)
  const [editName,setEditName]=useState('')
  const [editEmail,setEditEmail]=useState('')
  const [newEmail,setNewEmail]=useState('')
  const [newPassword,setNewPassword]=useState('')
  const [newRole,setNewRole]=useState('hr_staff')
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const [newName,setNewName]=useState('')
  const [employees,setEmployees]=useState([])
  const [newEmployeeId,setNewEmployeeId]=useState('')
  const [showNewPwd,setShowNewPwd]=useState(false)

  useEffect(()=>{if(companyId){fetchUsers();fetchAllEmployees()}},[companyId])

  async function fetchAllEmployees(){
    const{data}=await supabase.from('employees').select('id,full_name').eq('company_id',companyId).order('full_name')
    setEmployees(data||[])
  }

  async function fetchUsers(){
    setLoading(true)
    const{data}=await supabase.from('user_roles').select('*').eq('company_id',companyId).order('created_at',{ascending:false})
    setUsers(data||[]);setLoading(false)
  }

  async function handleSendResetEmail(email){
    if(!email){setError(language==='zh'?'此用戶沒有 Email':'No email for this user');return}
    setSaving(true);setError('')
    const{error:e}=await supabase.auth.resetPasswordForEmail(email,{
      redirectTo:window.location.origin
    })
    if(e)setError(e.message)
    else setSuccess(language==='zh'?`重設密碼郵件已發送至 ${email}`:`Password reset email sent to ${email}`)
    setSaving(false)
    setTimeout(()=>setSuccess(''),5000)
  }

  async function handleCreateUser(){
    if(!newEmail||!newPassword||!newName){setError(language==='zh'?'請填寫所有欄位（包括姓名）':'Please fill all fields including name');return}
    if(newPassword.length<6){setError(language==='zh'?'密碼至少 6 位':'Password must be at least 6 characters');return}
    setSaving(true);setError('');setSuccess('')
    const{data:{session:currentSession}}=await supabase.auth.getSession()
    const{data:signUpData,error:signUpError}=await supabase.auth.signUp({email:newEmail,password:newPassword})
    if(signUpError){setError(signUpError.message);setSaving(false);return}
    if(signUpData.user){
      await supabase.from('user_roles').insert([{user_id:signUpData.user.id,role:newRole,display_name:newName,email:newEmail,company_id:companyId}])
      if(newEmployeeId){
        await supabase.from('employees').update({auth_user_id:signUpData.user.id}).eq('id',newEmployeeId)
      }
      setSuccess(language==='zh'?`用戶 ${newName} (${newEmail}) 建立成功！`:`User ${newName} (${newEmail}) created!`)
    }
    if(currentSession){await supabase.auth.setSession({access_token:currentSession.access_token,refresh_token:currentSession.refresh_token})}
    setNewEmail('');setNewPassword('');setNewRole('hr_staff');setNewName('');setNewEmployeeId('');setShowForm(false);fetchUsers();setSaving(false)
  }

  async function handleSaveEdit(){
    if(!editName){setError(language==='zh'?'姓名不能為空':'Name cannot be empty');return}
    setSaving(true);setError('')
    await supabase.from('user_roles').update({display_name:editName,email:editEmail}).eq('user_id',editingUser.user_id)
    setSuccess(language==='zh'?'更新成功':'Updated successfully')
    setEditingUser(null);setEditName('');setEditEmail('');fetchUsers();setSaving(false)
    setTimeout(()=>setSuccess(''),5000)
  }

  async function handleChangeRole(userId,newRoleVal){await supabase.from('user_roles').update({role:newRoleVal}).eq('user_id',userId);fetchUsers()}
  async function handleDeleteUser(userId){
    if(!window.confirm(language==='zh'?'確定要移除這個用戶的角色嗎？':'Remove this user role?'))return
    await supabase.from('user_roles').delete().eq('user_id',userId);fetchUsers()
  }
  const roles=['super_admin','hr_admin','hr_staff','manager','employee','finance','read_only']
  return(
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{text.userMgmt}</h2>
        {!showForm&&!editingUser&&<button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+ {text.addUser}</button>}
      </div>
      {success&&<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">{success}</div>}
      {showForm&&(
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{language==='zh'?'新增用戶':'Add User'}</h3>
          {error&&<div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'姓名 *':'Name *'}</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} className={inputClass} placeholder={language==='zh'?'例：張小明':'e.g. John Smith'}/>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">Email</label>
              <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className={inputClass} placeholder="user@example.com"/>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{text.password}</label>
              <div className="relative">
                <input type={showNewPwd?'text':'password'} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={inputClass+' pr-16'} placeholder="••••••"/>
                <button type="button" onClick={()=>setShowNewPwd(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs font-medium select-none">
                  {showNewPwd?(language==='zh'?'隱藏':'Hide'):(language==='zh'?'顯示':'Show')}
                </button>
              </div>
            </div>
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{text.role}</label>
              <select value={newRole} onChange={e=>setNewRole(e.target.value)} className={inputClass}>
                {roles.filter(r=>r!=='super_admin').map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'關聯員工記錄（Employee角色必填）':'Link to Employee Record (required for Employee role)'}</label>
              <select value={newEmployeeId} onChange={e=>setNewEmployeeId(e.target.value)} className={inputClass}>
                <option value="">{language==='zh'?'— 不關聯 —':'— None —'}</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={()=>{setShowForm(false);setError('')}} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleCreateUser} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.createUser}</button>
          </div>
        </div>
      )}
      {editingUser&&(
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{language==='zh'?`編輯用戶：${editingUser.display_name||editingUser.user_id?.slice(0,8)}`:`Edit User: ${editingUser.display_name||editingUser.user_id?.slice(0,8)}`}</h3>
          {error&&<div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'姓名 *':'Name *'}</label>
              <input value={editName} onChange={e=>setEditName(e.target.value)} className={inputClass}/>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">Email</label>
              <input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} className={inputClass} placeholder="user@example.com"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{language==='zh'?'重設密碼':'Reset Password'}</label>
              <button type="button" onClick={()=>handleSendResetEmail(editingUser.email)} disabled={saving} className="w-full py-2 text-sm border border-blue-300 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50">
                📧 {language==='zh'?`發送重設密碼郵件給 ${editingUser?.display_name||editingUser?.email}`:`Send reset email to ${editingUser?.display_name||editingUser?.email}`}
              </button>
              <p className="text-xs text-gray-400 mt-1">{language==='zh'?'用戶會收到郵件，點擊連結自行重設密碼':'User will receive an email to reset their own password'}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">* {language==='zh'?'角色請在下方表格直接修改':'Change role in the table below'}</p>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={()=>{setEditingUser(null);setEditName('');setEditEmail('');setError('')}} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSaveEdit} disabled={saving} className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">{saving?'...':(language==='zh'?'儲存':'Save')}</button>
          </div>
        </div>
      )}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :users.length===0?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{text.noUsers}</div>
        :(
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-600 border-b">{language==='zh'?'姓名':'Name'}</th>
              <th className="text-left p-3 font-medium text-gray-600 border-b">Email</th>
              <th className="text-left p-3 font-medium text-gray-600 border-b">{text.role}</th>
              <th className="text-left p-3 font-medium text-gray-600 border-b">{text.joinDate}</th>
              <th className="p-3 font-medium text-gray-600 border-b text-center">{text.actions}</th>
            </tr></thead>
            <tbody>{users.map(u=>(
              <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 ${editingUser?.user_id===u.user_id?'bg-amber-50':''}`}>
                <td className="p-3 text-gray-800 font-medium">{u.display_name||'-'}</td>
                <td className="p-3 text-gray-500 text-xs">{u.email||<span className="text-gray-300">{u.user_id?.slice(0,8)}...</span>}</td>
                <td className="p-3">
                  <select value={u.role} onChange={e=>handleChangeRole(u.user_id,e.target.value)}
                    disabled={u.role==='super_admin'&&currentUserRole!=='super_admin'}
                    className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50">
                    {roles.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="p-3 text-xs text-gray-400">{u.created_at?.slice(0,10)}</td>
                <td className="p-3 text-center">
                  <div className="flex gap-3 justify-center">
                    <button onClick={()=>{setEditingUser(u);setEditName(u.display_name||'');setEditEmail(u.email||'');setShowForm(false);setError('')}} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
                    {u.role!=='super_admin'&&<button onClick={()=>handleDeleteUser(u.user_id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      <p className="mt-4 text-xs text-gray-400">* {text.userMgmtNote}</p>
    </div>
  )
}