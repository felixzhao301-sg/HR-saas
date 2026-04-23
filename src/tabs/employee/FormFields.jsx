// src/tabs/employee/FormFields.jsx
import { COUNTRIES, inputClass } from '../../constants'

export default function FormFields({ f, setF, raceOptions, language, text, hasAccount = false }) {
  return (
    <div className="space-y-4">
      {/* Basic Info */}
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
              <div><label className="block text-sm text-gray-600 mb-1">{text.seamanNo}</label><input value={f.seaman_no||''} onChange={e=>setF({...f,seaman_no:e.target.value})} className={inputClass}/></div>
              <div><label className="block text-sm text-gray-600 mb-1">{text.seamanExpiry}</label><input type="date" value={f.seaman_expiry||''} onChange={e=>setF({...f,seaman_expiry:e.target.value})} className={inputClass}/></div>
            </div>
          )}
        </div>
      </div>

      {/* Passport */}
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

      {/* Work Info */}
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
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {language==='zh'?'公司電郵':'Work Email'}
            </label>
            {hasAccount ? (
              <div>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                  {f.work_email || '—'}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {language==='zh'?'此為登入帳號電郵，不可修改。如需更改請聯絡系統管理員。':'This is the login email and cannot be changed. Contact your admin to update.'}
                </p>
              </div>
            ) : (
              <input type="email" value={f.work_email||''} onChange={e=>setF({...f,work_email:e.target.value})} className={inputClass} placeholder="name@company.com"/>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">{text.basicSalary}</label><input type="number" value={f.basic_salary} onChange={e=>setF({...f,basic_salary:e.target.value})} className={inputClass}/></div>
            <div><label className="block text-sm text-gray-600 mb-1">{text.basicAllowance}</label><input type="number" value={f.basic_allowance} onChange={e=>setF({...f,basic_allowance:e.target.value})} className={inputClass}/></div>
          </div>
        </div>
      </div>

      {/* Bank Info */}
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