import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'

export default function LeaveTypesTab({text,language,companyId}){
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [saving,setSaving]=useState(false)
  const emptyLT={name:'',description:'',default_days:0,carry_forward_days:0,carry_forward_expiry_months:3,is_active:true}
  const [form,setForm]=useState(emptyLT)
  useEffect(()=>{if(companyId)fetchItems()},[companyId])
  async function fetchItems(){setLoading(true);const{data}=await supabase.from('leave_types').select('*').eq('company_id',companyId).order('sort_order',{ascending:true});setItems(data||[]);setLoading(false)}
  function startEdit(item){setForm({name:item.name||item.name_en||'',description:item.description||item.description_en||'',default_days:item.default_days||0,carry_forward_days:item.carry_forward_days||0,carry_forward_expiry_months:item.carry_forward_expiry_months||3,is_active:item.is_active!==false});setEditingId(item.id);setShowForm(true)}
  function resetForm(){setForm(emptyLT);setEditingId(null);setShowForm(false)}
  async function handleSave(){
    if(!form.name){alert(language==='zh'?'請填寫假期名稱':'Please enter leave type name');return}
    setSaving(true)
    const payload={name:form.name,description:form.description,name_zh:form.name,name_en:form.name,default_days:Number(form.default_days),carry_forward_days:Number(form.carry_forward_days),carry_forward_expiry_months:Number(form.carry_forward_expiry_months),is_active:form.is_active}
    if(editingId){await supabase.from('leave_types').update(payload).eq('id',editingId)}
    else{const maxOrder=items.length>0?Math.max(...items.map(i=>i.sort_order||0))+1:1;await supabase.from('leave_types').insert([{...payload,sort_order:maxOrder,company_id:companyId}])}
    resetForm();fetchItems();setSaving(false)
  }
  async function handleDelete(id){if(!window.confirm(language==='zh'?'確定要刪除這個假期類型嗎？':'Delete this leave type?'))return;await supabase.from('leave_types').delete().eq('id',id);fetchItems()}
  async function moveItem(fromIdx,toIdx){
    if(toIdx<0||toIdx>=items.length)return
    const newItems=[...items];const[moved]=newItems.splice(fromIdx,1);newItems.splice(toIdx,0,moved);setItems(newItems)
    await Promise.all(newItems.map((item,idx)=>supabase.from('leave_types').update({sort_order:idx+1}).eq('id',item.id)))
  }
  return(
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{language==='zh'?'假期類型設定':'Leave Type Settings'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{language==='zh'?'定義公司假期種類、預設天數及結轉規則':'Define leave types, default days and carry forward rules'}</p>
        </div>
        {!showForm&&<button onClick={()=>{resetForm();setShowForm(true)}} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+ {language==='zh'?'新增假期類型':'Add Leave Type'}</button>}
      </div>
      {showForm&&(
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{editingId?(language==='zh'?'編輯假期類型':'Edit Leave Type'):(language==='zh'?'新增假期類型':'Add Leave Type')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'假期名稱 *':'Leave Type Name *'}</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={inputClass} placeholder={language==='zh'?'例：年假 / Annual Leave':'e.g. Annual Leave'}/>
            </div>
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'描述':'Description'}</label>
              <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className={inputClass} placeholder={language==='zh'?'選填，說明此假期用途':'Optional description'}/>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'預設天數/年':'Default Days/Year'}</label>
              <input type="number" step="0.5" min="0" value={form.default_days} onChange={e=>setForm({...form,default_days:e.target.value})} className={inputClass}/>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'最多結轉天數':'Max Carry Forward Days'}</label>
              <input type="number" step="0.5" min="0" value={form.carry_forward_days} onChange={e=>setForm({...form,carry_forward_days:e.target.value})} className={inputClass}/>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'結轉天數作廢（月）':'CF Expiry (months)'}</label>
              <input type="number" min="0" value={form.carry_forward_expiry_months} onChange={e=>setForm({...form,carry_forward_expiry_months:e.target.value})} className={inputClass} placeholder="3"/>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} className="w-4 h-4 accent-blue-600"/>
                {language==='zh'?'啟用此假期類型':'Active'}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
          </div>
        </div>
      )}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :items.length===0&&!showForm?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{language==='zh'?'暫無假期類型':'No leave types'}</div>
        :(
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 px-2">
              <span className="w-8 text-center">{language==='zh'?'順序':'#'}</span>
              <span className="flex-1">{language==='zh'?'假期名稱':'Name'}</span>
              <span className="flex-1">{language==='zh'?'描述':'Description'}</span>
              <span className="w-20 text-center">{language==='zh'?'預設天數':'Days'}</span>
              <span className="w-24 text-center">{language==='zh'?'結轉天數/作廢':'CF/Expiry'}</span>
              <span className="w-16 text-center">{language==='zh'?'狀態':'Status'}</span>
              <span className="w-20 text-center">{text.actions}</span>
            </div>
            {items.map((item,idx)=>(
              <div key={item.id} className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${item.is_active?'border-gray-100 bg-gray-50':'border-gray-100 bg-gray-50 opacity-50'}`}>
                <div className="flex flex-col gap-0.5 w-8 items-center flex-shrink-0">
                  <button onClick={()=>moveItem(idx,idx-1)} disabled={idx===0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▲</button>
                  <span className="text-xs text-gray-400 font-mono">{idx+1}</span>
                  <button onClick={()=>moveItem(idx,idx+1)} disabled={idx===items.length-1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▼</button>
                </div>
                <div className="flex-1 text-sm font-medium text-gray-800">{item.name||item.name_en}</div>
                <div className="flex-1 text-sm text-gray-500">{item.description||'-'}</div>
                <div className="w-20 text-center text-sm text-gray-700">{item.default_days} {language==='zh'?'天':'days'}</div>
                <div className="w-24 text-center text-xs text-gray-500">{item.carry_forward_days>0?`${item.carry_forward_days}d / ${item.carry_forward_expiry_months}mo`:(language==='zh'?'不結轉':'No CF')}</div>
                <div className="w-16 text-center"><span className={`text-xs px-2 py-0.5 rounded ${item.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{item.is_active?(language==='zh'?'啟用':'Active'):(language==='zh'?'停用':'Inactive')}</span></div>
                <div className="flex gap-2 w-20 justify-center flex-shrink-0">
                  <button onClick={()=>startEdit(item)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
                  <button onClick={()=>handleDelete(item.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
                </div>
              </div>
            ))}
            <p className="mt-3 text-xs text-gray-400">* {language==='zh'?'結轉作廢月數：0 = 永不作廢':'CF Expiry months: 0 = never expires'}</p>
          </div>
        )}
    </div>
  )
}