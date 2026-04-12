import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { COUNTRIES, EMPLOYEE_COLUMNS, emptyForm, emptyWorkHistory, emptyEducation, emptyMedical, emptyVisa, emptyDependent, inputClass } from '../constants'
import { can } from '../utils/permissions'
import { loadXLSX, uploadAttachment } from '../utils/attachments'
import Field from '../components/Field'
import AttachmentLink from '../components/AttachmentLink'
import AttachmentField from '../components/AttachmentField'
import SubTableForm from '../components/SubTableForm'
import { sendEmail } from '../utils/email'

function FormFields({f,setF,raceOptions,language,text}){
  return(
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.basicInfo}</h4>
        <div className="space-y-3">
          <div><label className="block text-sm text-gray-600 mb-1">{text.fullName} *</label><input value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} className={inputClass}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.dob} *</label><input type="date" value={f.date_of_birth} onChange={e=>setF({...f,date_of_birth:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.gender} *</label>
              <select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})} className={inputClass}>
                <option value="">{text.selectGender}</option>
                <option value="male">{text.male}</option>
                <option value="female">{text.female}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.nationality} *</label>
              <select value={f.nationality} onChange={e=>setF({...f,nationality:e.target.value})} className={inputClass}>
                <option value="">{text.selectNationality}</option>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.race} *</label>
              <select value={f.race} onChange={e=>setF({...f,race:e.target.value})} className={inputClass}>
                <option value="">{text.selectRace}</option>
                {raceOptions.map(r=><option key={r.value} value={r.value}>{language==='zh'?r.label_zh:r.label_en}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">{text.nric}</label><input value={f.nric_fin} onChange={e=>setF({...f,nric_fin:e.target.value})} className={inputClass}/></div>
          <div><label className="block text-sm text-gray-600 mb-1">{text.address}</label><input value={f.address} onChange={e=>setF({...f,address:e.target.value})} className={inputClass}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.personalMobile}</label><input type="tel" value={f.personal_mobile||''} onChange={e=>setF({...f,personal_mobile:e.target.value})} className={inputClass} placeholder="+65 9123 4567"/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.personalEmail}</label><input type="email" value={f.personal_email||''} onChange={e=>setF({...f,personal_email:e.target.value})} className={inputClass} placeholder="name@example.com"/></div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={f.is_pr} onChange={e=>setF({...f,is_pr:e.target.checked,pr_year:e.target.checked?f.pr_year:''})}/>{text.isPR}</label>
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={f.is_seaman} onChange={e=>setF({...f,is_seaman:e.target.checked,seaman_no:e.target.checked?f.seaman_no:'',seaman_expiry:e.target.checked?f.seaman_expiry:''})}/>{text.isSeaman}</label>
          </div>
          {f.is_pr&&(
            <div><label className="block text-sm text-gray-600 mb-1">{text.prYear} *</label>
              <select value={f.pr_year||''} onChange={e=>setF({...f,pr_year:e.target.value})} className={inputClass}>
                <option value="">{language==='zh'?'選擇PR年份':'Select PR Year'}</option>
                <option value="1">{language==='zh'?'PR 第一年':'PR Year 1'}</option>
                <option value="2">{language==='zh'?'PR 第二年':'PR Year 2'}</option>
                <option value="3+">{language==='zh'?'PR 第三年或以上':'PR Year 3+'}</option>
              </select>
            </div>
          )}
          {f.is_seaman&&(
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm text-gray-600 mb-1">{text.seamanNo}</label>
                <input value={f.seaman_no||''} onChange={e=>setF({...f,seaman_no:e.target.value})} className={inputClass}/>
              </div>
              <div><label className="block text-sm text-gray-600 mb-1">{text.seamanExpiry}</label>
                <input type="date" value={f.seaman_expiry||''} onChange={e=>setF({...f,seaman_expiry:e.target.value})} className={inputClass}/>
              </div>
            </div>
          )}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.passportInfo}</h4>
        <div className="space-y-3">
          <div><label className="block text-sm text-gray-600 mb-1">{text.passport}</label><input value={f.passport_no} onChange={e=>setF({...f,passport_no:e.target.value})} className={inputClass}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.passportIssue}</label><input type="date" value={f.passport_issue_date} onChange={e=>setF({...f,passport_issue_date:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.passportExpiry}</label><input type="date" value={f.passport_expiry_date} onChange={e=>setF({...f,passport_expiry_date:e.target.value})} className={inputClass}/></div>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.workInfo}</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.joinDate} *</label><input type="date" value={f.join_date} onChange={e=>setF({...f,join_date:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.employmentType} *</label>
              <select value={f.employment_type} onChange={e=>setF({...f,employment_type:e.target.value})} className={inputClass}>
                <option value="full_time">{text.fullTime}</option>
                <option value="part_time">{text.partTime}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.position}</label><input value={f.position} onChange={e=>setF({...f,position:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.annualLeave}</label><input type="number" value={f.annual_leave} onChange={e=>setF({...f,annual_leave:e.target.value})} className={inputClass}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.basicSalary}</label><input type="number" value={f.basic_salary} onChange={e=>setF({...f,basic_salary:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.basicAllowance}</label><input type="number" value={f.basic_allowance} onChange={e=>setF({...f,basic_allowance:e.target.value})} className={inputClass}/></div>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.bankInfo}</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.bankName}</label><input value={f.bank_name} onChange={e=>setF({...f,bank_name:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.bankCountry}</label>
              <select value={f.bank_country} onChange={e=>setF({...f,bank_country:e.target.value})} className={inputClass}>
                <option value="">-</option>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.bankAccountNo}</label><input value={f.bank_account_no} onChange={e=>setF({...f,bank_account_no:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.bankAccountName}</label><input value={f.bank_account_name} onChange={e=>setF({...f,bank_account_name:e.target.value})} className={inputClass}/></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">{text.bankRemarks}</label><input value={f.bank_remarks} onChange={e=>setF({...f,bank_remarks:e.target.value})} className={inputClass}/></div>
        </div>
      </div>
    </div>
  )
}

function WorkHistoryTab({employeeId,text}){
  const [records,setRecords]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [form,setForm]=useState(emptyWorkHistory)
  const [saving,setSaving]=useState(false)
  useEffect(()=>{fetchRecords()},[employeeId])
  async function fetchRecords(){setLoading(true);const{data}=await supabase.from('employee_work_history').select('*').eq('employee_id',employeeId).order('start_date',{ascending:false});setRecords(data||[]);setLoading(false)}
  async function handleSave(){setSaving(true);const payload={...form,employee_id:employeeId};let error;if(editingId){({error}=await supabase.from('employee_work_history').update(payload).eq('id',editingId))}else{({error}=await supabase.from('employee_work_history').insert([payload]))}
    if(error){alert('保存失敗: '+error.message);setSaving(false);return}
    setShowForm(false);setEditingId(null);setForm(emptyWorkHistory);fetchRecords();setSaving(false)}
  async function handleDelete(id){if(!window.confirm(text.deleteConfirmShort))return;await supabase.from('employee_work_history').delete().eq('id',id);fetchRecords()}
  function startEdit(rec){setForm({company_name:rec.company_name||'',position:rec.position||'',start_date:rec.start_date||'',end_date:rec.end_date||'',remarks:rec.remarks||''});setEditingId(rec.id);setShowForm(true)}
  const fields=[{key:'company_name',label:text.companyName},{key:'position',label:text.position},{key:'start_date',label:text.startDate,type:'date'},{key:'end_date',label:text.endDate,type:'date'},{key:'remarks',label:text.remarks,full:true,type:'textarea'}]
  return(
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!showForm&&<button onClick={()=>{setForm(emptyWorkHistory);setEditingId(null);setShowForm(true)}} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ {text.add}</button>}
      </div>
      {showForm&&<SubTableForm fields={fields} form={form} setForm={setForm} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditingId(null)}} saving={saving} text={text}/>}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :records.length===0&&!showForm?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{text.noRecords}</div>
        :<div className="space-y-2 mt-3">{records.map(rec=>(
          <div key={rec.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start group">
            <div>
              <div className="font-medium text-sm text-gray-800"><span className="text-gray-400 font-normal">{text.companyName}：</span>{rec.company_name}</div>
              <div className="text-xs text-gray-500 mt-0.5"><span className="text-gray-400">{text.position}：</span>{rec.position||'-'}</div>
              <div className="text-xs text-gray-400 mt-1"><span className="text-gray-400">{text.startDate}：</span>{rec.start_date} → {rec.end_date||text.present}</div>
              {rec.remarks&&<div className="text-xs text-gray-400 mt-1"><span className="text-gray-400">{text.remarks}：</span>{rec.remarks}</div>}
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>startEdit(rec)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
              <button onClick={()=>handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
            </div>
          </div>
        ))}</div>}
    </div>
  )
}

function EducationTab({employeeId,text,language}){
  const [records,setRecords]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [editingRec,setEditingRec]=useState(null)
  const [form,setForm]=useState(emptyEducation)
  const [attachmentFile,setAttachmentFile]=useState(null)
  const [saving,setSaving]=useState(false)
  useEffect(()=>{fetchRecords()},[employeeId])
  async function fetchRecords(){setLoading(true);const{data}=await supabase.from('employee_education').select('*').eq('employee_id',employeeId).order('start_date',{ascending:false});setRecords(data||[]);setLoading(false)}
  async function handleSave(){
    setSaving(true)
    let attachment_url=editingRec?.attachment_url||null
    if(attachmentFile){attachment_url=await uploadAttachment(attachmentFile,'education');if(!attachment_url){setSaving(false);return}}
    const payload={...form,employee_id:employeeId,attachment_url}
    if(payload.start_date==='')payload.start_date=null
    if(payload.end_date==='')payload.end_date=null
    let error
    if(editingId){({error}=await supabase.from('employee_education').update(payload).eq('id',editingId))}
    else{({error}=await supabase.from('employee_education').insert([payload]))}
    if(error){alert('保存失敗: '+error.message);setSaving(false);return}
    setShowForm(false);setEditingId(null);setEditingRec(null);setForm(emptyEducation);setAttachmentFile(null);fetchRecords();setSaving(false)
  }
  async function handleDelete(id){if(!window.confirm(text.deleteConfirmShort))return;await supabase.from('employee_education').delete().eq('id',id);fetchRecords()}
  function startEdit(rec){
    setForm({institution:rec.institution||'',qualification:rec.qualification||'',field_of_study:rec.field_of_study||'',start_date:rec.start_date||'',end_date:rec.end_date||'',remarks:rec.remarks||''})
    setEditingId(rec.id);setEditingRec(rec);setAttachmentFile(null);setShowForm(true)
  }
  return(
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!showForm&&<button onClick={()=>{setForm(emptyEducation);setEditingId(null);setEditingRec(null);setAttachmentFile(null);setShowForm(true)}} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ {text.add}</button>}
      </div>
      {showForm&&(
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{text.institution}</label><input value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.qualification}</label><input value={form.qualification} onChange={e=>setForm({...form,qualification:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.fieldOfStudy}</label><input value={form.field_of_study} onChange={e=>setForm({...form,field_of_study:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.startDate}</label><input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.endDate}</label><input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} className={inputClass}/></div>
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{text.remarks}</label><textarea value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} className={inputClass+' resize-none'} rows={2}/></div>
            <AttachmentField label={language==='zh'?'附件（證書/文憑）':'Attachment (Certificate/Diploma)'} existingUrl={editingRec?.attachment_url} existingLabel={language==='zh'?'查看現有附件':'View existing attachment'} onFileChange={setAttachmentFile}/>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={()=>{setShowForm(false);setEditingId(null);setEditingRec(null);setAttachmentFile(null)}} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
          </div>
        </div>
      )}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :records.length===0&&!showForm?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{text.noRecords}</div>
        :<div className="space-y-2 mt-3">{records.map(rec=>(
          <div key={rec.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start group">
            <div>
              <div className="font-medium text-sm text-gray-800"><span className="text-gray-400 font-normal">{text.institution}：</span>{rec.institution}</div>
              <div className="text-xs text-gray-500 mt-0.5"><span className="text-gray-400">{text.qualification}：</span>{rec.qualification}</div>
              <div className="text-xs text-gray-500 mt-0.5"><span className="text-gray-400">{text.fieldOfStudy}：</span>{rec.field_of_study||'-'}</div>
              <div className="text-xs text-gray-400 mt-1"><span className="text-gray-400">{text.startDate}：</span>{rec.start_date} → {rec.end_date||text.present}</div>
              {rec.remarks&&<div className="text-xs text-gray-400 mt-0.5"><span className="text-gray-400">{text.remarks}：</span>{rec.remarks}</div>}
              <AttachmentLink url={rec.attachment_url} label={language==='zh'?'查看附件':'View attachment'}/>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>startEdit(rec)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
              <button onClick={()=>handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
            </div>
          </div>
        ))}</div>}
    </div>
  )
}

function MedicalTab({employeeId,text,language}){
  const [records,setRecords]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [editingRec,setEditingRec]=useState(null)
  const [form,setForm]=useState(emptyMedical)
  const [attachmentFile,setAttachmentFile]=useState(null)
  const [saving,setSaving]=useState(false)
  useEffect(()=>{fetchRecords()},[employeeId])
  async function fetchRecords(){setLoading(true);const{data}=await supabase.from('employee_medical').select('*').eq('employee_id',employeeId).order('record_date',{ascending:false});setRecords(data||[]);setLoading(false)}
  async function handleSave(){
    setSaving(true)
    let attachment_url=editingRec?.attachment_url||null
    if(attachmentFile){attachment_url=await uploadAttachment(attachmentFile,'medical');if(!attachment_url){setSaving(false);return}}
    const payload={...form,employee_id:employeeId,attachment_url}
    if(payload.record_date==='')payload.record_date=null
    if(payload.mc_days==='')payload.mc_days=null
    if(payload.amount==='')payload.amount=null
    let error
    if(editingId){({error}=await supabase.from('employee_medical').update(payload).eq('id',editingId))}
    else{({error}=await supabase.from('employee_medical').insert([payload]))}
    if(error){alert('保存失敗: '+error.message);setSaving(false);return}
    setShowForm(false);setEditingId(null);setEditingRec(null);setForm(emptyMedical);setAttachmentFile(null);fetchRecords();setSaving(false)
  }
  async function handleDelete(id){if(!window.confirm(text.deleteConfirmShort))return;await supabase.from('employee_medical').delete().eq('id',id);fetchRecords()}
  function startEdit(rec){
    setForm({record_date:rec.record_date||'',medical_type:rec.medical_type||'',doctor_name:rec.doctor_name||'',clinic_name:rec.clinic_name||'',diagnosis:rec.diagnosis||'',mc_days:rec.mc_days??'',amount:rec.amount??'',remarks:rec.remarks||''})
    setEditingId(rec.id);setEditingRec(rec);setAttachmentFile(null);setShowForm(true)
  }
  const medicalTypeOptions=[
    {value:'outpatient',label:text.outpatient},{value:'specialist',label:text.specialist},
    {value:'hospitalization',label:text.hospitalization},{value:'dental',label:text.dental},
    {value:'optical',label:text.optical},{value:'others',label:text.others}
  ]
  const typeLabel=(val)=>medicalTypeOptions.find(o=>o.value===val)?.label||val
  return(
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!showForm&&<button onClick={()=>{setForm(emptyMedical);setEditingId(null);setEditingRec(null);setAttachmentFile(null);setShowForm(true)}} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ {text.add}</button>}
      </div>
      {showForm&&(
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{text.recordDate}</label><input type="date" value={form.record_date} onChange={e=>setForm({...form,record_date:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.medicalType}</label>
              <select value={form.medical_type} onChange={e=>setForm({...form,medical_type:e.target.value})} className={inputClass}>
                <option value="">-</option>
                {medicalTypeOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.clinicName}</label><input value={form.clinic_name} onChange={e=>setForm({...form,clinic_name:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.doctorName}</label><input value={form.doctor_name} onChange={e=>setForm({...form,doctor_name:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.diagnosis}</label><input value={form.diagnosis} onChange={e=>setForm({...form,diagnosis:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.mcDays}</label><input type="number" value={form.mc_days} onChange={e=>setForm({...form,mc_days:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.amount}</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className={inputClass}/></div>
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{text.remarks}</label><textarea value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} className={inputClass+' resize-none'} rows={2}/></div>
            <AttachmentField label={language==='zh'?'附件（MC單/收據）':'Attachment (MC/Receipt)'} existingUrl={editingRec?.attachment_url} existingLabel={language==='zh'?'查看現有附件':'View existing attachment'} onFileChange={setAttachmentFile}/>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={()=>{setShowForm(false);setEditingId(null);setEditingRec(null);setAttachmentFile(null)}} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
          </div>
        </div>
      )}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :records.length===0&&!showForm?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{text.noRecords}</div>
        :<div className="space-y-2 mt-3">{records.map(rec=>(
          <div key={rec.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start group">
            <div>
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm text-gray-800"><span className="text-gray-400 font-normal">{text.recordDate}：</span>{rec.record_date}</div>
                {rec.medical_type&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{typeLabel(rec.medical_type)}</span>}
                {rec.mc_days&&<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">MC {rec.mc_days}d</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5"><span className="text-gray-400">{text.clinicName}：</span>{rec.clinic_name||'-'}{rec.doctor_name?` · ${rec.doctor_name}`:''}</div>
              {rec.diagnosis&&<div className="text-xs text-gray-500 mt-0.5"><span className="text-gray-400">{text.diagnosis}：</span>{rec.diagnosis}</div>}
              {rec.amount&&<div className="text-xs text-green-600 mt-0.5"><span className="text-gray-400">{text.amount}：</span>${rec.amount}</div>}
              {rec.remarks&&<div className="text-xs text-gray-400 mt-0.5"><span className="text-gray-400">{text.remarks}：</span>{rec.remarks}</div>}
              <AttachmentLink url={rec.attachment_url} label={language==='zh'?'查看附件':'View attachment'}/>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>startEdit(rec)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
              <button onClick={()=>handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
            </div>
          </div>
        ))}</div>}
    </div>
  )
}

function VisaTab({employeeId,text,language}){
  const [records,setRecords]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [editingRec,setEditingRec]=useState(null)
  const [form,setForm]=useState(emptyVisa)
  const [attachmentFile,setAttachmentFile]=useState(null)
  const [saving,setSaving]=useState(false)
  const today=new Date().toISOString().split('T')[0]
  useEffect(()=>{fetchRecords()},[employeeId])
  async function fetchRecords(){setLoading(true);const{data}=await supabase.from('employee_visa').select('*').eq('employee_id',employeeId).order('expiry_date',{ascending:false});setRecords(data||[]);setLoading(false)}
  async function handleSave(){
    setSaving(true)
    let attachment_url=editingRec?.attachment_url||null
    if(attachmentFile){attachment_url=await uploadAttachment(attachmentFile,'visa');if(!attachment_url){setSaving(false);return}}
    const payload={...form,employee_id:employeeId,attachment_url}
    if(payload.issue_date==='')payload.issue_date=null
    if(payload.expiry_date==='')payload.expiry_date=null
    let error
    if(editingId){({error}=await supabase.from('employee_visa').update(payload).eq('id',editingId))}
    else{({error}=await supabase.from('employee_visa').insert([payload]))}
    if(error){alert('保存失敗: '+error.message);setSaving(false);return}
    setShowForm(false);setEditingId(null);setEditingRec(null);setForm(emptyVisa);setAttachmentFile(null);fetchRecords();setSaving(false)
  }
  async function handleDelete(id){if(!window.confirm(text.deleteConfirmShort))return;await supabase.from('employee_visa').delete().eq('id',id);fetchRecords()}
  function startEdit(rec){
    setForm({visa_type:rec.visa_type||'',visa_number:rec.visa_number||'',issue_date:rec.issue_date||'',expiry_date:rec.expiry_date||'',issued_by:rec.issued_by||'',remarks:rec.remarks||''})
    setEditingId(rec.id);setEditingRec(rec);setAttachmentFile(null);setShowForm(true)
  }
  const visaTypeOptions=[
    {value:'EP',label:'Employment Pass (EP)'},{value:'SP',label:'S Pass (SP)'},
    {value:'WP',label:'Work Permit (WP)'},{value:'DP',label:'Dependant Pass (DP)'},
    {value:'LTVP',label:'Long Term Visit Pass (LTVP)'},{value:'PEP',label:'Personalised Employment Pass (PEP)'},
    {value:'EntrePass',label:'EntrePass'},{value:'Others',label:text.others}
  ]
  return(
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!showForm&&<button onClick={()=>{setForm(emptyVisa);setEditingId(null);setEditingRec(null);setAttachmentFile(null);setShowForm(true)}} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ {text.add}</button>}
      </div>
      {showForm&&(
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{text.visaType}</label>
              <select value={form.visa_type} onChange={e=>setForm({...form,visa_type:e.target.value})} className={inputClass}>
                <option value="">-</option>
                {visaTypeOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.visaNumber}</label><input value={form.visa_number} onChange={e=>setForm({...form,visa_number:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.issueDate}</label><input type="date" value={form.issue_date} onChange={e=>setForm({...form,issue_date:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.expiryDate}</label><input type="date" value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.issuedBy}</label><input value={form.issued_by} onChange={e=>setForm({...form,issued_by:e.target.value})} className={inputClass}/></div>
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{text.remarks}</label><textarea value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} className={inputClass+' resize-none'} rows={2}/></div>
            <AttachmentField label={language==='zh'?'附件（簽證副本）':'Attachment (Visa copy)'} existingUrl={editingRec?.attachment_url} existingLabel={language==='zh'?'查看現有附件':'View existing attachment'} onFileChange={setAttachmentFile}/>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={()=>{setShowForm(false);setEditingId(null);setEditingRec(null);setAttachmentFile(null)}} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
          </div>
        </div>
      )}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :records.length===0&&!showForm?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{text.noRecords}</div>
        :<div className="space-y-2 mt-3">{records.map(rec=>{
          const isExpired=rec.expiry_date&&rec.expiry_date<today
          const isExpiringSoon=rec.expiry_date&&!isExpired&&new Date(rec.expiry_date)-new Date(today)<30*24*60*60*1000
          return(
            <div key={rec.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start group">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm text-gray-800"><span className="text-gray-400 font-normal">{text.visaType}：</span>{rec.visa_type}</div>
                  {isExpired&&<span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">{text.expired}</span>}
                  {isExpiringSoon&&<span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">{text.expiringSoon}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5"><span className="text-gray-400">{text.visaNumber}：</span>{rec.visa_number||'-'}</div>
                <div className="text-xs text-gray-400 mt-1"><span className="text-gray-400">{text.issueDate}：</span>{rec.issue_date||'-'} → <span className={isExpired?'text-red-500 font-medium':''}>{rec.expiry_date||'-'}</span></div>
                {rec.issued_by&&<div className="text-xs text-gray-400"><span className="text-gray-400">{text.issuedBy}：</span>{rec.issued_by}</div>}
                {rec.remarks&&<div className="text-xs text-gray-400 mt-0.5"><span className="text-gray-400">{text.remarks}：</span>{rec.remarks}</div>}
                <AttachmentLink url={rec.attachment_url} label={language==='zh'?'查看附件':'View attachment'}/>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={()=>startEdit(rec)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
                <button onClick={()=>handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
              </div>
            </div>
          )
        })}</div>}
    </div>
  )
}

function DependentsTab({employeeId,text}){
  const [records,setRecords]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [form,setForm]=useState(emptyDependent)
  const [saving,setSaving]=useState(false)
  useEffect(()=>{fetchRecords()},[employeeId])
  async function fetchRecords(){setLoading(true);const{data}=await supabase.from('employee_dependents').select('*').eq('employee_id',employeeId).order('created_at',{ascending:true});setRecords(data||[]);setLoading(false)}
  async function handleSave(){setSaving(true);const payload={...form,employee_id:employeeId};let error;if(editingId){({error}=await supabase.from('employee_dependents').update(payload).eq('id',editingId))}else{({error}=await supabase.from('employee_dependents').insert([payload]))}
    if(error){alert('保存失敗: '+error.message);setSaving(false);return}
    setShowForm(false);setEditingId(null);setForm(emptyDependent);fetchRecords();setSaving(false)}
  async function handleDelete(id){if(!window.confirm(text.deleteConfirmShort))return;await supabase.from('employee_dependents').delete().eq('id',id);fetchRecords()}
  function startEdit(rec){setForm({name:rec.name||'',relationship:rec.relationship||'',date_of_birth:rec.date_of_birth||'',nationality:rec.nationality||'',nric_fin:rec.nric_fin||'',remarks:rec.remarks||''});setEditingId(rec.id);setShowForm(true)}
  const relationshipOptions=[{value:'spouse',label:text.spouse},{value:'child',label:text.child},{value:'parent',label:text.parent},{value:'sibling',label:text.sibling},{value:'others',label:text.others}]
  const fields=[{key:'name',label:text.fullName},{key:'relationship',label:text.relationship,type:'select',options:relationshipOptions},{key:'date_of_birth',label:text.dob,type:'date'},{key:'nationality',label:text.nationality,type:'select',options:COUNTRIES.map(c=>({value:c,label:c}))},{key:'nric_fin',label:text.nric},{key:'remarks',label:text.remarks,full:true,type:'textarea'}]
  const relLabel=(val)=>relationshipOptions.find(o=>o.value===val)?.label||val
  return(
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!showForm&&<button onClick={()=>{setForm(emptyDependent);setEditingId(null);setShowForm(true)}} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ {text.add}</button>}
      </div>
      {showForm&&<SubTableForm fields={fields} form={form} setForm={setForm} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditingId(null)}} saving={saving} text={text}/>}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :records.length===0&&!showForm?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{text.noRecords}</div>
        :<div className="space-y-2 mt-3">{records.map(rec=>(
          <div key={rec.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start group">
            <div>
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm text-gray-800"><span className="text-gray-400 font-normal">{text.fullName}：</span>{rec.name}</div>
                {rec.relationship&&<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{relLabel(rec.relationship)}</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5"><span className="text-gray-400">{text.nationality}：</span>{rec.nationality||'-'}</div>
              {rec.date_of_birth&&<div className="text-xs text-gray-400 mt-0.5"><span className="text-gray-400">{text.dob}：</span>{rec.date_of_birth}</div>}
              {rec.nric_fin&&<div className="text-xs text-gray-400 mt-0.5"><span className="text-gray-400">{text.nric}：</span>{rec.nric_fin}</div>}
              {rec.remarks&&<div className="text-xs text-gray-400 mt-0.5"><span className="text-gray-400">{text.remarks}：</span>{rec.remarks}</div>}
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>startEdit(rec)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
              <button onClick={()=>handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
            </div>
          </div>
        ))}</div>}
    </div>
  )
}

function BulkUploadModal({onClose,onDone,language,text}){
  const [step,setStep]=useState('upload')
  const [rows,setRows]=useState([])
  const [errors,setErrors]=useState([])
  const [importing,setImporting]=useState(false)
  const [progress,setProgress]=useState(0)
  const fileRef=useRef()
  async function handleFile(e){
    const file=e.target.files[0];if(!file)return
    const xl=await loadXLSX()
    const buf=await file.arrayBuffer()
    const wb=xl.read(buf,{type:'array',cellDates:true})
    const ws=wb.Sheets[wb.SheetNames[0]]
    const raw=xl.utils.sheet_to_json(ws,{defval:'',raw:false,dateNF:'yyyy-mm-dd'})
    if(!raw.length){alert(language==='zh'?'檔案是空的':'File is empty');return}
    const labelToKey={}
    EMPLOYEE_COLUMNS.forEach(c=>{labelToKey[c.label]=c.key})
    const dataRows=raw.filter(row=>{const firstVal=Object.values(row)[0];return firstVal!=='(Required)'&&firstVal!=='(Optional)'&&firstVal!==''&&firstVal!=null})
    if(!dataRows.length){alert(language==='zh'?'沒有找到有效資料，請確認格式正確':'No valid data found');return}
    const parsed=dataRows.map((row,idx)=>{
      const obj={_row:idx+3}
      Object.keys(row).forEach(header=>{const key=labelToKey[header]||header;let val=row[header];if(val===null||val===undefined)val='';obj[key]=String(val).trim()})
      obj.is_pr=obj.is_pr?.toLowerCase()==='true'
      obj.is_seaman=obj.is_seaman?.toLowerCase()==='true'
      obj.annual_leave=obj.annual_leave===''?null:Number(obj.annual_leave)||null
      obj.basic_salary=obj.basic_salary===''?null:Number(obj.basic_salary)||null
      obj.basic_allowance=obj.basic_allowance===''?null:Number(obj.basic_allowance)||null
      if(obj.seaman_expiry==='')obj.seaman_expiry=null
      if(obj.passport_issue_date==='')obj.passport_issue_date=null
      if(obj.passport_expiry_date==='')obj.passport_expiry_date=null
      if(obj.date_of_birth==='')obj.date_of_birth=null
      if(obj.join_date==='')obj.join_date=null
      return obj
    })
    const errs=[]
    parsed.forEach(row=>{EMPLOYEE_COLUMNS.filter(c=>c.required).forEach(c=>{if(!row[c.key])errs.push(`Row ${row._row}: ${c.label} is required`)})})
    setErrors(errs);setRows(parsed);setStep('preview')
  }
  async function handleImport(){
    setImporting(true);setStep('importing')
    const validRows=rows.map(r=>{const{_row,...rest}=r;return rest})
    let done=0
    const thisYear=new Date().getFullYear()
    for(const row of validRows){
      const{data:newEmp}=await supabase.from('employees').insert([row]).select('id').single()
      if(newEmp?.id&&row.annual_leave){
        await supabase.from('leave_balances').upsert({
          employee_id:newEmp.id,year:thisYear,leave_type:'annual',
          entitled:Number(row.annual_leave),carried_forward:0,adjusted:0,used:0
        },{onConflict:'employee_id,year,leave_type'})
      }
      done++;setProgress(Math.round(done/validRows.length*100))
    }
    setImporting(false);onDone()
  }
  return(
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{language==='zh'?'批量上傳員工':'Bulk Import Employees'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {step==='upload'&&(
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                {language==='zh'?'請先下載範本，填寫後再上傳。必填欄位：姓名、出生日期、性別、國籍、種族、入職日期、類型。':'Please download the template first, fill it in, then upload. Required: Full Name, DOB, Gender, Nationality, Race, Join Date, Employment Type.'}
              </div>
              <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-4xl mb-3">📂</div>
                <div className="text-gray-600 font-medium">{language==='zh'?'點擊選擇 Excel 或 CSV 檔案':'Click to select Excel or CSV file'}</div>
                <div className="text-gray-400 text-sm mt-1">.xlsx / .csv</div>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile}/>
              </div>
            </div>
          )}
          {step==='preview'&&(
            <div className="space-y-4">
              <div className={`p-3 rounded-lg text-sm ${errors.length?'bg-red-50 border border-red-200 text-red-700':'bg-green-50 border border-green-200 text-green-700'}`}>
                {errors.length
                  ?<><div className="font-medium mb-1">{language==='zh'?`發現 ${errors.length} 個錯誤，請修正後重新上傳`:`Found ${errors.length} errors, please fix and re-upload`}</div>
                     <ul className="list-disc pl-4 space-y-0.5">{errors.slice(0,5).map((e,i)=><li key={i}>{e}</li>)}</ul>
                     {errors.length>5&&<div className="mt-1 text-xs">...{language==='zh'?`還有 ${errors.length-5} 個錯誤`:`and ${errors.length-5} more errors`}</div>}
                   </>
                  :<div>{language==='zh'?`預覽：${rows.length} 筆員工資料，確認後開始匯入`:`Preview: ${rows.length} employees ready to import`}</div>
                }
              </div>
              {!errors.length&&(
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-gray-50">{['full_name','gender','nationality','employment_type','join_date','position'].map(k=><th key={k} className="px-3 py-2 text-left font-medium text-gray-600 border-b">{k}</th>)}</tr></thead>
                    <tbody>{rows.slice(0,10).map((row,i)=><tr key={i} className="border-b border-gray-100 hover:bg-gray-50">{['full_name','gender','nationality','employment_type','join_date','position'].map(k=><td key={k} className="px-3 py-2 text-gray-700">{String(row[k]||'-')}</td>)}</tr>)}</tbody>
                  </table>
                  {rows.length>10&&<div className="text-xs text-gray-400 text-center mt-2">...{language==='zh'?`還有 ${rows.length-10} 筆`:`and ${rows.length-10} more`}</div>}
                </div>
              )}
            </div>
          )}
          {step==='importing'&&(
            <div className="py-12 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-gray-700 font-medium mb-3">{language==='zh'?'匯入中...':'Importing...'}</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{width:`${progress}%`}}/></div>
              <div className="text-sm text-gray-400">{progress}%</div>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
          <button onClick={()=>{setStep('upload');setRows([]);setErrors([])}} className="text-sm text-gray-500 hover:text-gray-700">
            {step==='preview'?`← ${language==='zh'?'重新選擇':'Re-select'}`:' '}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            {step==='preview'&&!errors.length&&(
              <button onClick={handleImport} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                {language==='zh'?`確認匯入 ${rows.length} 筆`:`Import ${rows.length} records`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaveTab({employeeId,companyId,employeeName,text,language,userRole,currentUserId,employeeJoinDate}){
  const [balances,setBalances]=useState([])
  const [applications,setApplications]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [saving,setSaving]=useState(false)
  const [showAdjust,setShowAdjust]=useState(false)
  const [adjustForm,setAdjustForm]=useState({leave_type:'annual',year:new Date().getFullYear(),adjusted:0,entitled:0,carried_forward:0})
  const [leaveFile,setLeaveFile]=useState(null)
  const thisYear=new Date().getFullYear()
  const leaveTypes=[
    {value:'annual',label:language==='zh'?'年假':'Annual Leave',color:'bg-blue-100 text-blue-700'},
    {value:'medical',label:language==='zh'?'病假':'Medical Leave',color:'bg-green-100 text-green-700'},
    {value:'unpaid',label:language==='zh'?'無薪假':'Unpaid Leave',color:'bg-gray-100 text-gray-700'},
    {value:'public_holiday',label:language==='zh'?'公共假期':'Public Holiday',color:'bg-purple-100 text-purple-700'},
    {value:'others',label:language==='zh'?'其他':'Others',color:'bg-yellow-100 text-yellow-700'},
  ]
  const typeLabel=(val)=>leaveTypes.find(t=>t.value===val)?.label||val
  const typeColor=(val)=>leaveTypes.find(t=>t.value===val)?.color||'bg-gray-100 text-gray-600'
  const [form,setForm]=useState({leave_type:'annual',start_date:'',end_date:'',days:'',reason:''})
  useEffect(()=>{fetchAll()},[employeeId])
  async function fetchAll(){
    setLoading(true)
    const[{data:bal},{data:apps}]=await Promise.all([
      supabase.from('leave_balances').select('*').eq('employee_id',employeeId).eq('year',thisYear),
      supabase.from('leave_applications').select('*').eq('employee_id',employeeId).order('created_at',{ascending:false})
    ])
    setBalances(bal||[]);setApplications(apps||[]);setLoading(false)
  }
  function getBalance(type){
    const b=balances.find(b=>b.leave_type===type)
    if(!b)return{entitled:0,carried_forward:0,used:0,adjusted:0,remaining:0}
    const remaining=Number(b.entitled)+Number(b.carried_forward)+Number(b.adjusted)-Number(b.used)
    return{...b,remaining}
  }
  async function handleApply(){
    if(!form.start_date||!form.end_date||!form.days){alert(language==='zh'?'請填寫所有必填欄位':'Please fill all required fields');return}
    setSaving(true)
    let attachment_url=null
    if(leaveFile){attachment_url=await uploadAttachment(leaveFile,'leave');if(!attachment_url){setSaving(false);return}}
    await supabase.from('leave_applications').insert([{employee_id:employeeId,leave_type:form.leave_type,start_date:form.start_date,end_date:form.end_date,days:Number(form.days),reason:form.reason,status:'pending',attachment_url}])

    // 通知批准人
    try{
      const{data:approverRow}=await supabase
        .from('leave_approvers')
        .select('approver1_user_id, approver2_user_id')
        .eq('company_id',companyId)
        .eq('leave_type',form.leave_type)
        .maybeSingle()
      if(approverRow){
        const userIds=[approverRow.approver1_user_id,approverRow.approver2_user_id].filter(Boolean)
        if(userIds.length>0){
          const{data:roles}=await supabase
            .from('user_roles')
            .select('email,display_name')
            .in('user_id',userIds)
            .eq('company_id',companyId)
          for(const approver of (roles||[])){
            if(approver.email){
              await sendEmail('leave_submitted',approver.email,{
                approverName:approver.display_name,
                employeeName:employeeName,
                leaveType:typeLabel(form.leave_type),
                startDate:form.start_date,
                endDate:form.end_date,
                days:form.days,
                companyName:'YLL Offshore',
              })
            }
          }
        }
      }
    }catch(err){
      console.error('Approver notify failed:',err)
    }

    setForm({leave_type:'annual',start_date:'',end_date:'',days:'',reason:''});setLeaveFile(null);setShowForm(false);fetchAll();setSaving(false)
  }
  async function handleAdjust(){
    setSaving(true)
    await supabase.from('leave_balances').upsert({employee_id:employeeId,year:adjustForm.year,leave_type:adjustForm.leave_type,entitled:Number(adjustForm.entitled),carried_forward:Number(adjustForm.carried_forward),adjusted:Number(adjustForm.adjusted)},{onConflict:'employee_id,year,leave_type'})
    setShowAdjust(false);fetchAll();setSaving(false)
  }
  async function handleCancel(id){
    if(!window.confirm(language==='zh'?'確定要取消這個申請嗎？':'Cancel this application?'))return
    await supabase.from('leave_applications').delete().eq('id',id);fetchAll()
  }
  const canManage=['super_admin','hr_admin','hr_staff'].includes(userRole)
  const statusColor=(s)=>s==='approved'?'bg-green-100 text-green-700':s==='rejected'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-700'
  const statusLabel=(s)=>s==='approved'?(language==='zh'?'已批准':'Approved'):s==='rejected'?(language==='zh'?'已拒絕':'Rejected'):(language==='zh'?'待審批':'Pending')
  if(loading)return<div className="text-sm text-gray-400 py-8 text-center">{text.loading}</div>
  return(
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">{thisYear} {language==='zh'?'假期餘額':'Leave Balance'}</h3>
            {employeeJoinDate&&<div className="text-xs text-gray-400 mt-0.5">
              {language==='zh'?'入職：':'Joined: '}{employeeJoinDate}{' · '}
              {(()=>{
                const join=new Date(employeeJoinDate);const now=new Date();
                const months=Math.floor((now-join)/(1000*60*60*24*30.44));
                const y=Math.floor(months/12);const m=months%12;
                return language==='zh'?`工齡：${y}年${m}個月`:`Service: ${y}y ${m}m`
              })()}
            </div>}
          </div>
          {canManage&&<button onClick={()=>setShowAdjust(!showAdjust)} className="text-xs text-blue-600 border border-blue-300 px-3 py-1 rounded hover:bg-blue-50">{language==='zh'?'調整額度':'Adjust'}</button>}
        </div>
        {showAdjust&&canManage&&(
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'假期類型':'Type'}</label>
                <select value={adjustForm.leave_type} onChange={e=>setAdjustForm({...adjustForm,leave_type:e.target.value})} className={inputClass}>
                  {leaveTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'年份':'Year'}</label>
                <input type="number" value={adjustForm.year} onChange={e=>setAdjustForm({...adjustForm,year:e.target.value})} className={inputClass}/>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'應得天數':'Entitled'}</label>
                <input type="number" step="0.5" value={adjustForm.entitled} onChange={e=>setAdjustForm({...adjustForm,entitled:e.target.value})} className={inputClass}/>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'結轉天數':'Carried Forward'}</label>
                <input type="number" step="0.5" value={adjustForm.carried_forward} onChange={e=>setAdjustForm({...adjustForm,carried_forward:e.target.value})} className={inputClass}/>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'額外調整':'Adjustment'}</label>
                <input type="number" step="0.5" value={adjustForm.adjusted} onChange={e=>setAdjustForm({...adjustForm,adjusted:e.target.value})} className={inputClass}/>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowAdjust(false)} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
              <button onClick={handleAdjust} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {leaveTypes.filter(t=>t.value!=='public_holiday').map(t=>{
            const b=getBalance(t.value)
            return(
              <div key={t.value} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className={`inline-block text-xs px-2 py-0.5 rounded mb-2 ${t.color}`}>{t.label}</div>
                <div className={`text-2xl font-bold ${b.remaining<0?'text-red-500':'text-gray-800'}`}>{b.remaining}<span className="text-sm font-normal text-gray-400 ml-1">{language==='zh'?'天':'days'}</span></div>
                <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                  <div>{language==='zh'?'應得':'Entitled'}: <span className="text-gray-600">{b.entitled}</span></div>
                  <div>{language==='zh'?'結轉CF':'Carry Fwd'}: <span className="text-gray-600">{b.carried_forward}</span></div>
                  {Number(b.adjusted)!==0&&<div>{language==='zh'?'額外調整':'Adjusted'}: <span className={Number(b.adjusted)>0?'text-blue-500':'text-orange-400'}>{Number(b.adjusted)>0?'+':''}{b.adjusted}</span></div>}
                  <div className="border-t border-gray-100 pt-0.5 mt-0.5">
                    {language==='zh'?'合計應得':'Total Entitled'}: <span className="text-gray-700 font-medium">{Number(b.entitled)+Number(b.carried_forward)+Number(b.adjusted)}</span>
                  </div>
                  <div>{language==='zh'?'已用':'Used'}: <span className="text-red-400">{b.used}</span></div>
                  <div className="border-t border-gray-100 pt-0.5 mt-0.5">
                    {language==='zh'?'餘額':'Balance'}: <span className={b.remaining<0?'text-red-500 font-medium':'text-green-600 font-medium'}>{b.remaining}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{language==='zh'?'申請記錄':'Applications'}</h3>
          {!showForm&&<button onClick={()=>setShowForm(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ {language==='zh'?'申請請假':'Apply'}</button>}
        </div>
        {showForm&&(
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'假期類型':'Leave Type'}</label>
                <select value={form.leave_type} onChange={e=>setForm({...form,leave_type:e.target.value})} className={inputClass}>
                  {leaveTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'開始日期':'Start Date'} *</label>
                <input type="date" value={form.start_date} onChange={e=>{
                  const start=e.target.value
                  const days=form.end_date&&start?Math.round((new Date(form.end_date)-new Date(start))/(1000*60*60*24))+1:form.days
                  setForm({...form,start_date:start,days:days>0?days:form.days})
                }} className={inputClass}/>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'結束日期':'End Date'} *</label>
                <input type="date" value={form.end_date} onChange={e=>{
                  const end=e.target.value
                  const days=form.start_date&&end?Math.round((new Date(end)-new Date(form.start_date))/(1000*60*60*24))+1:form.days
                  setForm({...form,end_date:end,days:days>0?days:form.days})
                }} className={inputClass}/>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'天數':'Days'} *</label>
                <input type="number" step="0.5" min="0.5" value={form.days} onChange={e=>setForm({...form,days:e.target.value})} className={inputClass} placeholder="1"/>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'原因':'Reason'}</label>
                <input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} className={inputClass}/>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">{language==='zh'?'附件（如病假請附 MC 單）':'Attachment (e.g. MC for sick leave)'}</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e=>setLeaveFile(e.target.files[0]||null)} className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                {leaveFile&&<div className="text-xs text-blue-600 mt-1">📎 {leaveFile.name}</div>}
                <div className="text-xs text-gray-400 mt-0.5">支援 PDF、JPG、PNG，最大 10MB</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={()=>{setShowForm(false);setLeaveFile(null)}} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
              <button onClick={handleApply} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':(language==='zh'?'提交申請':'Submit')}</button>
            </div>
          </div>
        )}
        {applications.length===0&&!showForm
          ?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{language==='zh'?'暫無申請記錄':'No applications'}</div>
          :<div className="space-y-2">{applications.map(app=>(
            <div key={app.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${typeColor(app.leave_type)}`}>{typeLabel(app.leave_type)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor(app.status)}`}>{statusLabel(app.status)}</span>
                  <span className="text-xs text-gray-500 font-medium">{app.days} {language==='zh'?'天':'days'}</span>
                </div>
                <div className="text-sm text-gray-700">{app.start_date} → {app.end_date}</div>
                {app.reason&&<div className="text-xs text-gray-400 mt-0.5">{app.reason}</div>}
                {app.remarks&&<div className="text-xs text-orange-500 mt-0.5">{language==='zh'?'備注：':'Note: '}{app.remarks}</div>}
                <AttachmentLink url={app.attachment_url} label={language==='zh'?'查看附件':'View attachment'}/>
                <div className="text-xs text-gray-300 mt-1">{app.created_at?.slice(0,10)}</div>
              </div>
              {app.status==='pending'&&userRole!=='employee'&&(
                <button onClick={()=>handleCancel(app.id)} className="text-xs text-red-400 hover:underline opacity-0 group-hover:opacity-100">{language==='zh'?'撤回':'Withdraw'}</button>
              )}
            </div>
          ))}</div>
        }
      </div>
    </div>
  )
}

export default function EmployeesTab({
  text,language,userRole,currentUserId,permissions,
  companyId,raceOptions,myEmployeeRecord,
  selectedEmployee,setSelectedEmployee,
  mainTab,setMainTab
}){
  const [employees,setEmployees]=useState([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [showForm,setShowForm]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editMode,setEditMode]=useState(false)
  const [form,setForm]=useState(emptyForm)
  const [showDeleteConfirm,setShowDeleteConfirm]=useState(false)
  const [activeSubTab,setActiveSubTab]=useState('profile')
  const [sortKey,setSortKey]=useState('full_name')
  const [sortDir,setSortDir]=useState('asc')
  const [showBulkUpload,setShowBulkUpload]=useState(false)

  const subTabs=[
    {key:'work_history',label:text.tabWorkHistory},
    {key:'education',label:text.tabEducation},
    {key:'medical',label:text.tabMedical},
    {key:'visa',label:text.tabVisa},
    {key:'dependents',label:text.tabDependents},
    {key:'leave',label:language==='zh'?'年假':'Leave'}
  ]

  useEffect(()=>{if(companyId)fetchEmployees()},[companyId])

  async function fetchEmployees(){
    setLoading(true)
    let query=supabase.from('employees').select('id,full_name,position,employment_type,join_date').eq('company_id',companyId).order('created_at',{ascending:false})
    const{data,error}=await query
    if(!error)setEmployees(data||[])
    setLoading(false)
  }

  async function viewEmployee(id){
    const{data,error}=await supabase.from('employees').select('*').eq('id',id).single()
    if(!error){setSelectedEmployee(data);setEditMode(false);setActiveSubTab('profile')}
  }

  function startEdit(){
    setForm({
      full_name:selectedEmployee.full_name||'',date_of_birth:selectedEmployee.date_of_birth||'',
      gender:selectedEmployee.gender||'',nationality:selectedEmployee.nationality||'',
      race:selectedEmployee.race||'',nric_fin:selectedEmployee.nric_fin||'',
      join_date:selectedEmployee.join_date||'',employment_type:selectedEmployee.employment_type||'full_time',
      position:selectedEmployee.position||'',is_pr:selectedEmployee.is_pr||false,
      is_seaman:selectedEmployee.is_seaman||false,pr_year:selectedEmployee.pr_year||'',
      seaman_no:selectedEmployee.seaman_no||'',seaman_expiry:selectedEmployee.seaman_expiry||'',
      passport_no:selectedEmployee.passport_no||'',
      passport_issue_date:selectedEmployee.passport_issue_date||'',
      passport_expiry_date:selectedEmployee.passport_expiry_date||'',
      basic_salary:selectedEmployee.basic_salary||'',basic_allowance:selectedEmployee.basic_allowance||'',
      bank_name:selectedEmployee.bank_name||'',bank_country:selectedEmployee.bank_country||'',
      bank_account_no:selectedEmployee.bank_account_no||'',bank_account_name:selectedEmployee.bank_account_name||'',
      bank_remarks:selectedEmployee.bank_remarks||'',address:selectedEmployee.address||'',
      annual_leave:selectedEmployee.annual_leave||'',
      personal_mobile:selectedEmployee.personal_mobile||'',personal_email:selectedEmployee.personal_email||'',
    });setEditMode(true)
  }

  async function saveEdit(){
    if(!form.full_name||!form.date_of_birth||!form.gender||!form.nationality||!form.race||!form.join_date||!form.employment_type){alert('請填寫所有必填欄位');return}
    setSaving(true)
    const payload={...form}
    if(payload.basic_salary==='')payload.basic_salary=null
    if(payload.basic_allowance==='')payload.basic_allowance=null
    if(payload.annual_leave==='')payload.annual_leave=null
    if(payload.passport_issue_date==='')payload.passport_issue_date=null
    if(payload.passport_expiry_date==='')payload.passport_expiry_date=null
    if(payload.date_of_birth==='')payload.date_of_birth=null
    if(payload.join_date==='')payload.join_date=null
    if(payload.seaman_expiry==='')payload.seaman_expiry=null
    if(payload.passport_issue_date==='')payload.passport_issue_date=null
    if(payload.passport_expiry_date==='')payload.passport_expiry_date=null
    if(payload.date_of_birth==='')payload.date_of_birth=null
    if(payload.join_date==='')payload.join_date=null
    const{error}=await supabase.from('employees').update(payload).eq('id',selectedEmployee.id)
    if(error){alert('保存失敗: '+error.message);setSaving(false);return}
    setSelectedEmployee({...selectedEmployee,...payload});setEditMode(false);fetchEmployees();setSaving(false)
  }

  async function deleteEmployee(){
    const{error}=await supabase.from('employees').delete().eq('id',selectedEmployee.id)
    if(error){alert('刪除失敗: '+error.message);return}
    setShowDeleteConfirm(false);setSelectedEmployee(null);fetchEmployees()
  }

  async function saveEmployee(){
    if(!form.full_name||!form.date_of_birth||!form.gender||!form.nationality||!form.race||!form.join_date||!form.employment_type){alert('請填寫所有必填欄位');return}
    setSaving(true)
    const payload={...form,company_id:companyId}
    if(payload.basic_salary==='')payload.basic_salary=null
    if(payload.basic_allowance==='')payload.basic_allowance=null
    if(payload.annual_leave==='')payload.annual_leave=null
    if(payload.seaman_expiry==='')payload.seaman_expiry=null
    if(payload.passport_issue_date==='')payload.passport_issue_date=null
    if(payload.passport_expiry_date==='')payload.passport_expiry_date=null
    if(payload.date_of_birth==='')payload.date_of_birth=null
    if(payload.join_date==='')payload.join_date=null
    const{data:newEmp,error}=await supabase.from('employees').insert([payload]).select('id').single()
    if(error){alert('保存失敗: '+error.message);setSaving(false);return}
    if(newEmp?.id&&payload.annual_leave){
      await supabase.from('leave_balances').upsert({
        employee_id:newEmp.id,year:new Date().getFullYear(),leave_type:'annual',
        entitled:Number(payload.annual_leave),carried_forward:0,adjusted:0,used:0,
        company_id:companyId
      },{onConflict:'employee_id,year,leave_type'})
    }
    setShowForm(false);setForm(emptyForm);fetchEmployees();setSaving(false)
  }

  async function downloadTemplate(){
    const xl=await loadXLSX()
    const ws=xl.utils.aoa_to_sheet([EMPLOYEE_COLUMNS.map(c=>c.label),EMPLOYEE_COLUMNS.map(c=>c.required?'(Required)':'(Optional)')])
    ws['!cols']=EMPLOYEE_COLUMNS.map(()=>({wch:30}))
    const wb=xl.utils.book_new();xl.utils.book_append_sheet(wb,ws,'Employees');xl.writeFile(wb,'HR_Employee_Template.xlsx')
  }

  async function downloadAllEmployees(){
    const xl=await loadXLSX()
    const{data}=await supabase.from('employees').select('*').eq('company_id',companyId).order('created_at',{ascending:false})
    if(!data||!data.length){alert(language==='zh'?'暫無員工資料':'No employee data');return}
    const headers=EMPLOYEE_COLUMNS.map(c=>c.label)
    const rows=data.map(emp=>EMPLOYEE_COLUMNS.map(c=>{const v=emp[c.key];if(typeof v==='boolean')return v?'true':'false';return v||''}))
    const ws=xl.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=EMPLOYEE_COLUMNS.map(()=>({wch:28}))
    const wb=xl.utils.book_new();xl.utils.book_append_sheet(wb,ws,'Employees');xl.writeFile(wb,`HR_Employees_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const filtered=employees.filter(emp=>emp.full_name?.toLowerCase().includes(search.toLowerCase())||emp.position?.toLowerCase().includes(search.toLowerCase()))
  const sorted=[...filtered].sort((a,b)=>{const av=a[sortKey]||'';const bv=b[sortKey]||'';return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av)})
  const raceLabel=raceOptions.find(r=>r.value===selectedEmployee?.race)
  const raceName=raceLabel?(language==='zh'?raceLabel.label_zh:raceLabel.label_en):selectedEmployee?.race

  // ── 員工詳情頁 ──
  if(selectedEmployee){
    const emp=selectedEmployee
    return(
      <div>
        {userRole==='employee'
          ?<button onClick={()=>setMainTab('dashboard')} className="text-blue-600 text-sm mb-4 hover:underline">← {language==='zh'?'返回首頁':'Back to Home'}</button>
          :<button onClick={()=>setSelectedEmployee(null)} className="text-blue-600 text-sm mb-4 hover:underline">{text.back}</button>
        }
        {editMode?(
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">{text.editEmployee}</h3>
            <FormFields f={form} setF={setForm} raceOptions={raceOptions} language={language} text={text}/>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setEditMode(false)} className="px-4 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
            </div>
          </div>
        ):(
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xl font-bold flex-shrink-0">{emp.full_name?.[0]?.toUpperCase()}</div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{emp.full_name}</h2>
                    <p className="text-gray-500 text-sm">{emp.position||'-'}</p>
                    <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-medium ${emp.employment_type==='full_time'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{emp.employment_type==='full_time'?text.fullTime:text.partTime}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {can(permissions,userRole,'edit_employee')&&<button onClick={startEdit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">{text.edit}</button>}
                  {can(permissions,userRole,'delete_employee')&&<button onClick={()=>setShowDeleteConfirm(true)} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">{text.delete}</button>}
                </div>
              </div>
            </div>
            <div className="border-b border-gray-200 bg-gray-50 px-6">
              <div className="flex gap-0 overflow-x-auto">
                {[{key:'profile',label:language==='zh'?'員工資料':'Profile'},...subTabs].map(tab=>(
                  <button key={tab.key} onClick={()=>setActiveSubTab(tab.key)}
                    className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeSubTab===tab.key?'border-blue-600 text-blue-600 bg-white':'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6">
              {activeSubTab==='profile'&&(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.basicInfo}</h3>
                    <Field label={text.fullName} value={emp.full_name}/>
                    <Field label={text.dob} value={emp.date_of_birth}/>
                    <Field label={text.gender} value={emp.gender==='male'?text.male:emp.gender==='female'?text.female:emp.gender}/>
                    <Field label={text.nationality} value={emp.nationality}/>
                    <Field label={text.race} value={raceName}/>
                    <Field label={text.nric} value={emp.nric_fin}/>
                    <Field label={text.isPR} value={emp.is_pr?text.yes:text.no}/>
                    {emp.is_pr&&emp.pr_year&&<Field label={text.prYear} value={language==='zh'?`PR 第${emp.pr_year}年`:`PR Year ${emp.pr_year}`}/>}
                    <Field label={text.address} value={emp.address}/>
                    <Field label={text.personalMobile} value={emp.personal_mobile}/>
                    <Field label={text.personalEmail} value={emp.personal_email}/>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.workInfo}</h3>
                    <Field label={text.joinDate} value={emp.join_date}/>
                    <Field label={text.employmentType} value={emp.employment_type==='full_time'?text.fullTime:text.partTime}/>
                    <Field label={text.position} value={emp.position}/>
                    <Field label={text.isSeaman} value={emp.is_seaman?text.yes:text.no}/>
                    {emp.is_seaman&&<Field label={text.seamanNo} value={emp.seaman_no}/>}
                    {emp.is_seaman&&emp.seaman_expiry&&<Field label={text.seamanExpiry} value={emp.seaman_expiry}/>}
                    <Field label={text.annualLeave} value={emp.annual_leave}/>
                    {can(permissions,userRole,'view_salary')&&<>
                      <Field label={text.basicSalary} value={emp.basic_salary?`$${emp.basic_salary}`:null}/>
                      <Field label={text.basicAllowance} value={emp.basic_allowance?`$${emp.basic_allowance}`:null}/>
                    </>}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.passportInfo}</h3>
                    <Field label={text.passport} value={emp.passport_no}/>
                    <Field label={text.passportIssue} value={emp.passport_issue_date}/>
                    <Field label={text.passportExpiry} value={emp.passport_expiry_date}/>
                  </div>
                  {can(permissions,userRole,'view_salary')&&(
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.bankInfo}</h3>
                      <Field label={text.bankName} value={emp.bank_name}/>
                      <Field label={text.bankCountry} value={emp.bank_country}/>
                      <Field label={text.bankAccountNo} value={emp.bank_account_no}/>
                      <Field label={text.bankAccountName} value={emp.bank_account_name}/>
                      <Field label={text.bankRemarks} value={emp.bank_remarks}/>
                    </div>
                  )}
                </div>
              )}
              {activeSubTab==='work_history'&&<WorkHistoryTab employeeId={emp.id} text={text}/>}
              {activeSubTab==='education'&&<EducationTab employeeId={emp.id} text={text} language={language}/>}
              {activeSubTab==='medical'&&(can(permissions,userRole,'view_medical')?<MedicalTab employeeId={emp.id} text={text} language={language}/>:<div className="text-sm text-gray-400 py-8 text-center">{text.noPermission}</div>)}
              {activeSubTab==='visa'&&(can(permissions,userRole,'view_visa')?<VisaTab employeeId={emp.id} text={text} language={language}/>:<div className="text-sm text-gray-400 py-8 text-center">{text.noPermission}</div>)}
              {activeSubTab==='dependents'&&<DependentsTab employeeId={emp.id} text={text}/>}
              {activeSubTab==='leave'&&<LeaveTab employeeId={emp.id} companyId={companyId} employeeName={emp.full_name} text={text} language={language} userRole={userRole} currentUserId={currentUserId} employeeJoinDate={emp.join_date}/>}
            </div>
          </div>
        )}
        {showDeleteConfirm&&(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{text.deleteEmployee}</h3>
              <p className="text-sm text-gray-500 mb-6">{text.deleteConfirm}</p>
              <div className="flex justify-end gap-3">
                <button onClick={()=>setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
                <button onClick={deleteEmployee} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">{text.delete}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── 員工列表頁 ──
  return(
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{text.employees}</h2>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="border border-gray-300 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-50">📥 {language==='zh'?'下載範本':'Template'}</button>
          <button onClick={downloadAllEmployees} className="border border-gray-300 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-50">📤 {language==='zh'?'匯出員工':'Export'}</button>
          {can(permissions,userRole,'create_employee')&&<button onClick={()=>setShowBulkUpload(true)} className="border border-blue-400 text-blue-600 px-3 py-2 rounded text-sm hover:bg-blue-50">📂 {language==='zh'?'批量上傳':'Bulk Import'}</button>}
          {can(permissions,userRole,'create_employee')&&<button onClick={()=>{setForm(emptyForm);setShowForm(true)}} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ {text.addEmployee}</button>}
        </div>
      </div>
      <input type="text" placeholder={text.search} value={search} onChange={e=>setSearch(e.target.value)} className="w-full border border-gray-300 rounded px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
      <div className="bg-white rounded shadow overflow-hidden">
        {loading?<div className="p-8 text-center text-gray-500">{text.loading}</div>
          :filtered.length===0?<div className="p-8 text-center text-gray-500">{text.noData}</div>
          :(
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-600 text-sm">
                <tr>
                  {[{key:'full_name',label:text.name},{key:'position',label:text.position,hide:'hidden sm:table-cell'},{key:'employment_type',label:text.employmentType,hide:'hidden md:table-cell'},{key:'join_date',label:text.joinDate,hide:'hidden md:table-cell'}].map(col=>(
                    <th key={col.key} className={`px-3 sm:px-6 py-3 cursor-pointer select-none hover:bg-gray-200 transition-colors ${col.hide||''}`}
                      onClick={()=>{if(sortKey===col.key){setSortDir(d=>d==='asc'?'desc':'asc')}else{setSortKey(col.key);setSortDir('asc')}}}>
                      <span className="flex items-center gap-1">{col.label}<span className="text-gray-400 text-xs">{sortKey===col.key?(sortDir==='asc'?'▲':'▼'):'⇅'}</span></span>
                    </th>
                  ))}
                  <th className="px-6 py-3">{text.actions}</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                {sorted.map(emp=>(
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 font-medium">{emp.full_name}</td>
                    <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">{emp.position||'-'}</td>
                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell"><span className={`px-2 py-1 rounded text-xs font-medium ${emp.employment_type==='full_time'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{emp.employment_type==='full_time'?text.fullTime:text.partTime}</span></td>
                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell">{emp.join_date}</td>
                    <td className="px-3 sm:px-6 py-4"><button onClick={()=>viewEmployee(emp.id)} className="text-blue-600 hover:underline">{text.view}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      {showBulkUpload&&<BulkUploadModal language={language} text={text} companyId={companyId} onClose={()=>setShowBulkUpload(false)} onDone={()=>{setShowBulkUpload(false);fetchEmployees()}}/>}
      {showForm&&(
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">{text.newEmployee}</h3>
            <FormFields f={form} setF={setForm} raceOptions={raceOptions} language={language} text={text}/>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
              <button onClick={saveEmployee} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
