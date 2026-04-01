import { useState } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'

export default function SettingsTab({language}){
  const [newPassword,setNewPassword]=useState('')
  const [confirmPassword,setConfirmPassword]=useState('')
  const [showPwd,setShowPwd]=useState(false)
  const [loading,setLoading]=useState(false)
  const [msg,setMsg]=useState({type:'',content:''})

  async function handleUpdatePassword(e){
    e.preventDefault()
    if(newPassword!==confirmPassword){setMsg({type:'error',content:language==='zh'?'密碼不一致':'Passwords do not match'});return}
    if(newPassword.length<6){setMsg({type:'error',content:language==='zh'?'密碼至少 6 位':'Password must be at least 6 characters'});return}
    setLoading(true)
    const{error}=await supabase.auth.updateUser({password:newPassword})
    if(error){setMsg({type:'error',content:error.message})}
    else{setMsg({type:'success',content:language==='zh'?'密碼修改成功！':'Password updated!'});setNewPassword('');setConfirmPassword('')}
    setLoading(false)
  }

  return(
    <div className="p-6 max-w-md">
      <h2 className="text-xl font-bold mb-6 text-gray-800">{language==='zh'?'個人設定':'Settings'}</h2>
      <section className="bg-white p-4 border rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold mb-4 text-gray-600 border-b pb-2">{language==='zh'?'修改密碼':'Change Password'}</h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs mb-1 text-gray-500">{language==='zh'?'新密碼':'New Password'}</label>
            <div className="relative">
              <input type={showPwd?'text':'password'} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={inputClass+' pr-16'} required/>
              <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                {showPwd?(language==='zh'?'隱藏':'Hide'):(language==='zh'?'顯示':'Show')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-500">{language==='zh'?'確認新密碼':'Confirm Password'}</label>
            <input type={showPwd?'text':'password'} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={inputClass} required/>
          </div>
          {msg.content&&<div className={`p-2 text-xs rounded ${msg.type==='success'?'bg-green-50 text-green-600':'bg-red-50 text-red-600'}`}>{msg.content}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading?'...':(language==='zh'?'更換密碼':'Update Password')}
          </button>
        </form>
      </section>
    </div>
  )
}