import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'
import AttachmentLink from '../components/AttachmentLink'
import { sendEmail, getEmployeeEmail, notifyApprovers } from '../utils/email'

// ✅ 新增 companyName prop
export default function LeaveManagementTab({text,language,userRole,currentUserId,companyId,companyName}){
  const [applications,setApplications]=useState([])
  const [employees,setEmployees]=useState([])
  const [loading,setLoading]=useState(true)
  const [filterStatus,setFilterStatus]=useState('pending')
  const [filterEmp,setFilterEmp]=useState('')
  const [savingId,setSavingId]=useState(null)
  const [remarkModal,setRemarkModal]=useState(null)
  const [remarkText,setRemarkText]=useState('')

  const leaveTypes=[
    {value:'annual',label:language==='zh'?'年假':'Annual Leave'},
    {value:'medical',label:language==='zh'?'病假':'Medical Leave'},
    {value:'unpaid',label:language==='zh'?'無薪假':'Unpaid Leave'},
    {value:'public_holiday',label:language==='zh'?'公共假期':'Public Holiday'},
    {value:'others',label:language==='zh'?'其他':'Others'},
  ]
  const typeLabel=(val)=>leaveTypes.find(t=>t.value===val)?.label||val
  const statusColor=(s)=>s==='approved'?'bg-green-100 text-green-700':s==='rejected'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-700'
  const statusLabel=(s)=>s==='approved'?(language==='zh'?'已批准':'Approved'):s==='rejected'?(language==='zh'?'已拒絕':'Rejected'):(language==='zh'?'待審批':'Pending')

  useEffect(()=>{if(companyId)fetchAll()},[companyId])

  async function fetchAll(){
    setLoading(true)

    // ✅ 先取得該公司所有員工
    const {data:emps}=await supabase
      .from('employees').select('id,full_name').eq('company_id',companyId)
    const empIds=(emps||[]).map(e=>e.id)

    // ✅ 用 employee_id IN (...) 代替不存在的 company_id 欄位
    const [{data:myEmpRecord},{data:apps}]=await Promise.all([
      supabase.from('employees').select('id').eq('auth_user_id',currentUserId).maybeSingle(),
      empIds.length>0
        ? supabase.from('leave_applications').select('*').in('employee_id',empIds).order('created_at',{ascending:false})
        : Promise.resolve({data:[]})
    ])

    const myEmpId=myEmpRecord?.id
    const isFullAdmin=['super_admin','hr_admin'].includes(userRole)
    let filtered=apps||[]

    if(!isFullAdmin&&myEmpId){
      // ✅ leave_approvers 用 auth user id（approver1/2_user_id），不是 employee id
      const{data:approverFor}=await supabase
        .from('leave_approvers').select('employee_id')
        .or(`approver1_user_id.eq.${currentUserId},approver2_user_id.eq.${currentUserId}`)
      const approverEmpIds=(approverFor||[]).map(a=>a.employee_id)
      filtered=filtered.filter(a=>approverEmpIds.includes(a.employee_id))
    }

    setApplications(filtered);setEmployees(emps||[]);setLoading(false)
  }

  function empName(id){return employees.find(e=>e.id===id)?.full_name||id?.slice(0,8)}

  async function handleApprove(app){
    setSavingId(app.id)
    await supabase.from('leave_applications')
      .update({status:'approved',approved_by:currentUserId,approved_at:new Date().toISOString()})
      .eq('id',app.id)

    // 更新 leave_balances
    const year=new Date(app.start_date).getFullYear()
    const{data:bal}=await supabase.from('leave_balances').select('*')
      .eq('employee_id',app.employee_id).eq('year',year).eq('leave_type',app.leave_type).maybeSingle()
    if(bal){
      await supabase.from('leave_balances').update({used:Number(bal.used||0)+Number(app.days)}).eq('id',bal.id)
    }else{
      await supabase.from('leave_balances').insert([{
        employee_id:app.employee_id,
        company_id:companyId,
        year,
        leave_type:app.leave_type,
        entitled:0,
        carried_forward:0,
        adjusted:0,
        used:Number(app.days)
      }])
    }

    // 發郵件給員工（personal_email）
    const empEmail=await getEmployeeEmail(app.employee_id)
    if(empEmail){
      await sendEmail('leave_approved',empEmail,{
        employeeName:empName(app.employee_id),
        leaveType:typeLabel(app.leave_type),
        startDate:app.start_date,
        endDate:app.end_date,
        days:app.days,
        companyName:companyName||'HR System', // ✅ 用傳入的 companyName
      })
    }
    fetchAll();setSavingId(null)
  }

  async function handleReject(app){
    await supabase.from('leave_applications')
      .update({status:'rejected',approved_by:currentUserId,approved_at:new Date().toISOString(),remarks:remarkText})
      .eq('id',app.id)

    const empEmail=await getEmployeeEmail(app.employee_id)
    if(empEmail){
      await sendEmail('leave_rejected',empEmail,{
        employeeName:empName(app.employee_id),
        leaveType:typeLabel(app.leave_type),
        startDate:app.start_date,
        endDate:app.end_date,
        days:app.days,
        reason:remarkText,
        companyName:companyName||'HR System', // ✅ 用傳入的 companyName
      })
    }
    setRemarkModal(null);setRemarkText('');fetchAll()
  }

  const filtered=applications.filter(a=>{
    const matchStatus=filterStatus==='all'||a.status===filterStatus
    const matchEmp=!filterEmp||a.employee_id===filterEmp
    return matchStatus&&matchEmp
  })

  return(
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{language==='zh'?'假期管理':'Leave Management'}</h2>
      </div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">{language==='zh'?'全部狀態':'All Status'}</option>
          <option value="pending">{language==='zh'?'待審批':'Pending'}</option>
          <option value="approved">{language==='zh'?'已批准':'Approved'}</option>
          <option value="rejected">{language==='zh'?'已拒絕':'Rejected'}</option>
        </select>
        <select value={filterEmp} onChange={e=>setFilterEmp(e.target.value)} className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">{language==='zh'?'全部員工':'All Employees'}</option>
          {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center">{filtered.length} {language==='zh'?'條':'records'}</span>
      </div>

      {loading
        ?<div className="text-sm text-gray-400 py-8 text-center">{text.loading}</div>
        :filtered.length===0
          ?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{language==='zh'?'暫無記錄':'No records'}</div>
          :(
            <div className="space-y-3">
              {filtered.map(app=>(
                <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm text-gray-800">{empName(app.employee_id)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColor(app.status)}`}>{statusLabel(app.status)}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{typeLabel(app.leave_type)}</span>
                        <span className="text-xs font-medium text-gray-700">{app.days} {language==='zh'?'天':'days'}</span>
                      </div>
                      <div className="text-sm text-gray-600">{app.start_date} → {app.end_date}</div>
                      {app.reason&&<div className="text-xs text-gray-400 mt-0.5">{language==='zh'?'原因：':'Reason: '}{app.reason}</div>}
                      {app.remarks&&<div className="text-xs text-red-400 mt-0.5">{language==='zh'?'拒絕原因：':'Reject reason: '}{app.remarks}</div>}
                      <AttachmentLink url={app.attachment_url} label={language==='zh'?'查看附件':'View attachment'}/>
                      <div className="text-xs text-gray-300 mt-1">{language==='zh'?'申請時間：':'Applied: '}{app.created_at?.slice(0,10)}</div>
                    </div>
                    {app.status==='pending'&&(
                      <div className="flex gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={()=>handleApprove(app)}
                          disabled={savingId===app.id}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                          {savingId===app.id?'...':(language==='zh'?'批准':'Approve')}
                        </button>
                        <button
                          onClick={()=>{setRemarkModal(app);setRemarkText('')}}
                          className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                          {language==='zh'?'拒絕':'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {remarkModal&&(
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">{language==='zh'?'拒絕原因':'Rejection Reason'}</h3>
            <textarea
              value={remarkText}
              onChange={e=>setRemarkText(e.target.value)}
              className={inputClass+' resize-none'}
              rows={3}
              placeholder={language==='zh'?'請輸入拒絕原因（可選）':'Enter reason (optional)'}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={()=>setRemarkModal(null)} className="px-3 py-1.5 text-sm text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
              <button onClick={()=>handleReject(remarkModal)} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600">{language==='zh'?'確認拒絕':'Confirm Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}