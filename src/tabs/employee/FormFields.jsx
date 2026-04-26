// src/tabs/employee/FormFields.jsx
import { COUNTRIES, inputClass } from '../../constants'

const errorClass = 'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white'

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">⚠ {error}</p>}
    </div>
  )
}

export default function FormFields({ f, setF, raceOptions, language, text, hasAccount = false, errors = {} }) {
  const zh = language === 'zh'
  const ic = (field) => errors[field] ? errorClass : inputClass

  return (
    <div className="space-y-4">

      {/* ── Basic Info ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.basicInfo}</h4>
        <div className="space-y-3">

          <Field label={text.fullName} required error={errors.full_name}>
            <input value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} className={ic('full_name')}/>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={text.dob} required error={errors.date_of_birth}>
              <input type="date" value={f.date_of_birth} onChange={e=>setF({...f,date_of_birth:e.target.value})} className={ic('date_of_birth')}/>
            </Field>
            <Field label={text.gender} required error={errors.gender}>
              <select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})} className={ic('gender')}>
                <option value="">{text.selectGender}</option>
                <option value="male">{text.male}</option>
                <option value="female">{text.female}</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={text.nationality} required error={errors.nationality}>
              <select value={f.nationality} onChange={e=>setF({...f,nationality:e.target.value})} className={ic('nationality')}>
                <option value="">{text.selectNationality}</option>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={text.race} required error={errors.race}>
              <select value={f.race} onChange={e=>setF({...f,race:e.target.value})} className={ic('race')}>
                <option value="">{text.selectRace}</option>
                {raceOptions.map(r=><option key={r.value} value={r.value}>{zh?r.label_zh:r.label_en}</option>)}
              </select>
            </Field>
          </div>

          <Field label={text.nric} required error={errors.nric_fin}>
            <input value={f.nric_fin} onChange={e=>setF({...f,nric_fin:e.target.value})} className={ic('nric_fin')} placeholder="S1234567A / FIN"/>
          </Field>

          <Field label={text.address}>
            <input value={f.address} onChange={e=>setF({...f,address:e.target.value})} className={inputClass}/>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={text.personalMobile}>
              <input type="tel" value={f.personal_mobile||''} onChange={e=>setF({...f,personal_mobile:e.target.value})} className={inputClass} placeholder="+65 9123 4567"/>
            </Field>
            <Field label={text.personalEmail} required error={errors.personal_email}>
              <input type="email" value={f.personal_email||''} onChange={e=>setF({...f,personal_email:e.target.value})} className={ic('personal_email')} placeholder="name@example.com"/>
            </Field>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={f.is_pr} onChange={e=>setF({...f,is_pr:e.target.checked,pr_year:e.target.checked?f.pr_year:''})}/>
              {text.isPR}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={f.is_seaman} onChange={e=>setF({...f,is_seaman:e.target.checked,seaman_no:e.target.checked?f.seaman_no:'',seaman_expiry:e.target.checked?f.seaman_expiry:''})}/>
              {text.isSeaman}
            </label>
          </div>

          {f.is_pr && (
            <Field label={text.prYear} required error={errors.pr_year}>
              <select value={f.pr_year||''} onChange={e=>setF({...f,pr_year:e.target.value})} className={ic('pr_year')}>
                <option value="">{zh?'選擇PR年份':'Select PR Year'}</option>
                <option value="1">{zh?'PR 第一年':'PR Year 1'}</option>
                <option value="2">{zh?'PR 第二年':'PR Year 2'}</option>
                <option value="3+">{zh?'PR 第三年或以上':'PR Year 3+'}</option>
              </select>
            </Field>
          )}

          {f.is_seaman && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={text.seamanNo}>
                <input value={f.seaman_no||''} onChange={e=>setF({...f,seaman_no:e.target.value})} className={inputClass}/>
              </Field>
              <Field label={text.seamanExpiry}>
                <input type="date" value={f.seaman_expiry||''} onChange={e=>setF({...f,seaman_expiry:e.target.value})} className={inputClass}/>
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* ── Passport ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.passportInfo}</h4>
        <div className="space-y-3">
          <Field label={text.passport}>
            <input value={f.passport_no} onChange={e=>setF({...f,passport_no:e.target.value})} className={inputClass}/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={text.passportIssue}>
              <input type="date" value={f.passport_issue_date} onChange={e=>setF({...f,passport_issue_date:e.target.value})} className={inputClass}/>
            </Field>
            <Field label={text.passportExpiry}>
              <input type="date" value={f.passport_expiry_date} onChange={e=>setF({...f,passport_expiry_date:e.target.value})} className={inputClass}/>
            </Field>
          </div>
        </div>
      </div>

      {/* ── Work Info ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.workInfo}</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={text.joinDate} required error={errors.join_date}>
              <input type="date" value={f.join_date} onChange={e=>setF({...f,join_date:e.target.value})} className={ic('join_date')}/>
            </Field>
            <Field label={text.employmentType} required error={errors.employment_type}>
              <select value={f.employment_type} onChange={e=>setF({...f,employment_type:e.target.value})} className={ic('employment_type')}>
                <option value="full_time">{text.fullTime}</option>
                <option value="part_time">{text.partTime}</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={text.position}>
              <input value={f.position} onChange={e=>setF({...f,position:e.target.value})} className={inputClass}/>
            </Field>
            <Field label={text.annualLeave}>
              <input type="number" min="0" value={f.annual_leave} onChange={e=>setF({...f,annual_leave:e.target.value})} className={inputClass}/>
            </Field>
          </div>

          <Field label={zh?'公司電郵':'Work Email'}>
            {hasAccount ? (
              <div>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">{f.work_email||'—'}</div>
                <p className="text-xs text-gray-400 mt-1">{zh?'此為登入帳號電郵，不可修改。':'This is the login email and cannot be changed.'}</p>
              </div>
            ) : (
              <input type="email" value={f.work_email||''} onChange={e=>setF({...f,work_email:e.target.value})} className={inputClass} placeholder="name@company.com"/>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={text.basicSalary} required error={errors.basic_salary}>
              <input type="number" min="0" value={f.basic_salary} onChange={e=>setF({...f,basic_salary:e.target.value})} className={ic('basic_salary')} placeholder="0"/>
            </Field>
            <Field label={text.basicAllowance}>
              <input type="number" min="0" value={f.basic_allowance} onChange={e=>setF({...f,basic_allowance:e.target.value})} className={inputClass} placeholder="0"/>
            </Field>
          </div>
        </div>
      </div>

      {/* ── Bank Info ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 border-b pb-1">{text.bankInfo}</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={text.bankName} required error={errors.bank_name}>
              <input value={f.bank_name} onChange={e=>setF({...f,bank_name:e.target.value})} className={ic('bank_name')}/>
            </Field>
            <Field label={text.bankCountry}>
              <select value={f.bank_country} onChange={e=>setF({...f,bank_country:e.target.value})} className={inputClass}>
                <option value="">-</option>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={text.bankAccountNo} required error={errors.bank_account_no}>
              <input value={f.bank_account_no} onChange={e=>setF({...f,bank_account_no:e.target.value})} className={ic('bank_account_no')}/>
            </Field>
            <Field label={text.bankAccountName}>
              <input value={f.bank_account_name} onChange={e=>setF({...f,bank_account_name:e.target.value})} className={inputClass}/>
            </Field>
          </div>
          <Field label={text.bankRemarks}>
            <input value={f.bank_remarks} onChange={e=>setF({...f,bank_remarks:e.target.value})} className={inputClass}/>
          </Field>
        </div>
      </div>

      <p className="text-xs text-gray-400"><span className="text-red-500">*</span> {zh?'為必填欄位':'Required fields'}</p>
    </div>
  )
}