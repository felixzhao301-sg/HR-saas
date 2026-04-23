// src/tabs/employee/RecordsTab.jsx
import { useState } from 'react'
import { can } from '../../utils/permissions'
import WorkHistoryTab from './WorkHistoryTab'
import EducationTab from './EducationTab'
import MedicalTab from './MedicalTab'
import DependentsTab from './DependentsTab'
import VisaInlineTab from './VisaInlineTab'

export default function RecordsTab({ employeeId, language, text, readOnly, permissions, userRole }) {
  const zh = language === 'zh'
  const [section, setSection] = useState('work_history')

  const sections = [
    { key: 'work_history', label: zh ? '工作經歷' : 'Work History' },
    { key: 'education',    label: zh ? '學歷'     : 'Education' },
    { key: 'medical',      label: zh ? '醫療記錄' : 'Medical' },
    { key: 'dependents',   label: zh ? '家屬'     : 'Dependents' },
    { key: 'visa',         label: zh ? '簽證'     : 'Visa' },
  ]

  return (
    <div>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {sections.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors
              ${section === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'work_history' && <WorkHistoryTab employeeId={employeeId} text={text} readOnly={readOnly} />}
      {section === 'education'    && <EducationTab employeeId={employeeId} text={text} language={language} readOnly={readOnly} />}
      {section === 'medical'      && (
        can(permissions, userRole, 'medical.view_all') || readOnly
          ? <MedicalTab employeeId={employeeId} text={text} language={language} readOnly={readOnly} />
          : <div className="text-sm text-gray-400 py-8 text-center">{text.noPermission}</div>
      )}
      {section === 'dependents'   && <DependentsTab employeeId={employeeId} text={text} readOnly={readOnly} />}
      {section === 'visa'         && <VisaInlineTab employeeId={employeeId} language={language} text={text} readOnly={readOnly} />}
    </div>
  )
}