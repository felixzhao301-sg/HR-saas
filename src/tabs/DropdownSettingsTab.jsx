import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'

export default function DropdownSettingsTab({text,language,onRaceUpdated,companyId}){
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editingId,setEditingId]=useState(null)
  const [formZh,setFormZh]=useState('')
  const [formEn,setFormEn]=useState('')
  const [saving,setSaving]=useState(false)
  const [dragOver,setDragOver]=useState(null)
  useEffect(()=>{if(companyId)fetchItems()},[companyId])
  async function fetchItems(){setLoading(true);const{data}=await supabase.from('dropdown_options').select('*').eq('category','race').eq('company_id',companyId).order('sort_order',{ascending:true});setItems(data||[]);setLoading(false)}
  function resetForm(){setFormZh('');setFormEn('');setEditingId(null);setShowForm(false)}
  async function handleSave(){
    if(!formZh||!formEn){alert(language==='zh'?'請填寫中英文名稱':'Please fill both Chinese and English names');return}
    setSaving(true)
    if(editingId){await supabase.from('dropdown_options').update({label_zh:formZh,label_en:formEn}).eq('id',editingId)}
    else{const maxOrder=items.length>0?Math.max(...items.map(i=>i.sort_order||0))+1:1;const value=formEn.toLowerCase().replace(/\s+/g,'_');await supabase.from('dropdown_options').insert([{category:'race',value,label_zh:formZh,label_en:formEn,sort_order:maxOrder,company_id:companyId}])}
    resetForm();fetchItems();setSaving(false);if(onRaceUpdated)onRaceUpdated()
  }
  async function handleDelete(id){
    if(!window.confirm(language==='zh'?'確定要刪除這個種族選項嗎？':'Delete this race option?'))return
    await supabase.from('dropdown_options').delete().eq('id',id);fetchItems();if(onRaceUpdated)onRaceUpdated()
  }
  function startEdit(item){setFormZh(item.label_zh||'');setFormEn(item.label_en||'');setEditingId(item.id);setShowForm(true)}
  async function moveItem(fromIdx,toIdx){
    if(toIdx<0||toIdx>=items.length)return
    const newItems=[...items];const[moved]=newItems.splice(fromIdx,1);newItems.splice(toIdx,0,moved);setItems(newItems)
    await Promise.all(newItems.map((item,idx)=>supabase.from('dropdown_options').update({sort_order:idx+1}).eq('id',item.id)))
    if(onRaceUpdated)onRaceUpdated()
  }
  return(
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{language==='zh'?'種族選項設定':'Race Options Settings'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{language==='zh'?'管理員工種族下拉選單的選項':'Manage race dropdown options for employees'}</p>
        </div>
        {!showForm&&<button onClick={()=>{resetForm();setShowForm(true)}} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+ {language==='zh'?'新增種族':'Add Race'}</button>}
      </div>
      {showForm&&(
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{editingId?(language==='zh'?'編輯種族':'Edit Race'):(language==='zh'?'新增種族':'Add Race')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'中文名稱':'Chinese Name'}</label><input value={formZh} onChange={e=>setFormZh(e.target.value)} className={inputClass} placeholder={language==='zh'?'例：華人':'e.g. 華人'}/></div>
            <div><label className="block text-xs text-gray-600 mb-1">{language==='zh'?'英文名稱':'English Name'}</label><input value={formEn} onChange={e=>setFormEn(e.target.value)} className={inputClass} placeholder="e.g. Chinese"/></div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving?'...':text.save}</button>
          </div>
        </div>
      )}
      {loading?<div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        :items.length===0?<div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{language==='zh'?'暫無種族選項':'No race options'}</div>
        :(
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 px-2">
              <span className="w-8 text-center">{language==='zh'?'順序':'Order'}</span>
              <span className="flex-1">{language==='zh'?'中文':'Chinese'}</span>
              <span className="flex-1">{language==='zh'?'英文':'English'}</span>
              <span className="w-24 text-center">{text.actions}</span>
            </div>
            <div className="space-y-1">
              {items.map((item,idx)=>(
                <div key={item.id}
                  onDragOver={e=>{e.preventDefault();setDragOver(idx)}}
                  onDrop={e=>{e.preventDefault();if(dragOver!==null&&dragOver!==idx){moveItem(dragOver,idx)};setDragOver(null)}}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${dragOver===idx?'border-blue-400 bg-blue-50':'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex flex-col gap-0.5 w-8 items-center flex-shrink-0">
                    <button onClick={()=>moveItem(idx,idx-1)} disabled={idx===0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▲</button>
                    <span className="text-xs text-gray-400 font-mono">{idx+1}</span>
                    <button onClick={()=>moveItem(idx,idx+1)} disabled={idx===items.length-1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▼</button>
                  </div>
                  <div className="flex-1 text-sm font-medium text-gray-800">{item.label_zh}</div>
                  <div className="flex-1 text-sm text-gray-500">{item.label_en}</div>
                  <div className="flex gap-3 w-24 justify-center flex-shrink-0">
                    <button onClick={()=>startEdit(item)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
                    <button onClick={()=>handleDelete(item.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">* {language==='zh'?'可用 ▲▼ 按鈕調整排列順序，即時生效':'Use ▲▼ buttons to reorder. Changes apply immediately.'}</p>
          </div>
        )}
    </div>
  )
}
