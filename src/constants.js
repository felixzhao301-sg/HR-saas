// src/constants/index.js

export const COUNTRIES = [
  'Singapore','Malaysia','China','India','Indonesia','Philippines','Myanmar','Bangladesh',
  'Pakistan','Sri Lanka','Thailand','Vietnam','South Korea','Japan','Australia',
  'United Kingdom','United States','Canada','New Zealand','Hong Kong','Taiwan',
  'Nepal','Cambodia','Laos','Brunei','Timor-Leste','Mongolia','Others'
]

export const ROLE_LABELS = {
  super_admin:'Super Admin', hr_admin:'HR Admin', hr_staff:'HR Staff',
  manager:'Manager', employee:'Employee', finance:'Finance', read_only:'Read Only'
}

export const EMPLOYEE_COLUMNS = [
  {key:'full_name',      label:'Full Name / 姓名',                          required:true},
  {key:'date_of_birth',  label:'Date of Birth / 出生日期 (YYYY-MM-DD)',     required:true},
  {key:'gender',         label:'Gender / 性別 (male/female)',               required:true},
  {key:'nationality',    label:'Nationality / 國籍',                        required:true},
  {key:'race',           label:'Race / 種族',                               required:true},
  {key:'nric_fin',       label:'NRIC/IC/FIN',                               required:false},
  {key:'join_date',      label:'Join Date / 入職日期 (YYYY-MM-DD)',         required:true},
  {key:'employment_type',label:'Employment Type / 類型 (full_time/part_time)',required:true},
  {key:'position',       label:'Position / 職位',                           required:false},
  {key:'annual_leave',   label:'Annual Leave Days / 年假天數',              required:false},
  {key:'basic_salary',   label:'Basic Salary / 基本薪資',                   required:false},
  {key:'basic_allowance',label:'Basic Allowance / 基本津貼',                required:false},
  {key:'is_pr',          label:'Is PR / 是否PR (true/false)',               required:false},
  {key:'pr_year',        label:'PR Year / PR年份 (1/2/3+)',                 required:false},
  {key:'is_seaman',      label:'Is Seaman / 是否海員 (true/false)',         required:false},
  {key:'seaman_no',      label:'Seaman No / 海員號碼',                      required:false},
  {key:'seaman_expiry',  label:'Seaman Expiry / 海員證過期日 (YYYY-MM-DD)', required:false},
  {key:'passport_no',    label:'Passport No / 護照號碼',                    required:false},
  {key:'passport_issue_date', label:'Passport Issue Date / 護照發出日 (YYYY-MM-DD)', required:false},
  {key:'passport_expiry_date',label:'Passport Expiry / 護照到期日 (YYYY-MM-DD)',     required:false},
  {key:'address',        label:'Address / 地址',                            required:false},
  {key:'personal_mobile',label:'Personal Mobile / 私人手機號',              required:false},
  {key:'personal_email', label:'Personal Email / 私人電郵',                 required:false},
  {key:'bank_name',      label:'Bank Name / 銀行名稱',                      required:false},
  {key:'bank_country',   label:'Bank Country / 銀行國家',                   required:false},
  {key:'bank_account_no',label:'Bank Account No / 銀行帳號',                required:false},
  {key:'bank_account_name',label:'Bank Account Name / 帳戶名稱',            required:false},
  {key:'bank_remarks',   label:'Bank Remarks / 銀行備注',                   required:false},
]

export const emptyForm = {
  full_name:'', date_of_birth:'', gender:'', nationality:'', race:'', nric_fin:'',
  join_date:'', employment_type:'full_time', position:'', is_pr:false, is_seaman:false,
  pr_year:'', seaman_no:'', seaman_expiry:'',
  passport_no:'', passport_issue_date:'', passport_expiry_date:'',
  basic_salary:'', basic_allowance:'', bank_name:'', bank_country:'',
  bank_account_no:'', bank_account_name:'', bank_remarks:'', address:'', annual_leave:'',
  personal_mobile:'', personal_email:'',
}

export const emptyWorkHistory  = {company_name:'', position:'', start_date:'', end_date:'', remarks:''}
export const emptyEducation    = {institution:'', qualification:'', field_of_study:'', start_date:'', end_date:'', remarks:''}
export const emptyMedical      = {record_date:'', medical_type:'', doctor_name:'', clinic_name:'', diagnosis:'', mc_days:'', amount:'', remarks:''}
export const emptyVisa         = {visa_type:'', visa_number:'', issue_date:'', expiry_date:'', issued_by:'', remarks:''}
export const emptyDependent    = {name:'', relationship:'', date_of_birth:'', nationality:'', nric_fin:'', remarks:''}

export const inputClass = "w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"