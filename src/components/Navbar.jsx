// src/components/Navbar.jsx
import { useState, useRef, useEffect } from 'react'
import { ROLE_LABELS } from '../constants'

export default function Navbar({ title, language, setLanguage, currentUser, userRole, userDisplayName, companyName, onLogout, setMainTab, mainTab, permissions, can }) {

  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // 點外面關閉下拉
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const settingsItems = [
    { key: 'permissions', labelZh: '權限設定', labelEn: 'Permissions', show: can && can(permissions, userRole, 'manage_dropdown') },
    { key: 'dropdown',    labelZh: '種族設定', labelEn: 'Race Settings', show: can && can(permissions, userRole, 'manage_dropdown') },
    { key: 'leavetypes',  labelZh: '假期設定', labelEn: 'Leave Types', show: can && can(permissions, userRole, 'manage_dropdown') },
    { key: 'approvers',   labelZh: '批准人設定', labelEn: 'Approvers', show: can && can(permissions, userRole, 'manage_dropdown') },
    { key: 'users',       labelZh: '用戶管理', labelEn: 'Users', show: ['super_admin','hr_admin'].includes(userRole) },
    { key: 'settings',    labelZh: '個人設定', labelEn: 'My Settings', show: true },
  ].filter(i => i.show)

  const settingsTabs = ['permissions','dropdown','leavetypes','approvers','users','settings']
  const isSettingsTab = settingsTabs.includes(mainTab)

  return (
    <nav className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center shadow sticky top-0 z-40">
      <h1 className="text-lg sm:text-xl font-bold truncate max-w-[140px] sm:max-w-none">{title}</h1>
      <div className="flex items-center gap-2">
        {currentUser && (
          <div className="flex items-center gap-2 text-sm">
            <div className="text-right hidden sm:block">
              <div className="text-white font-medium text-sm">{userDisplayName || currentUser.email}</div>
              {userDisplayName && <div className="text-blue-200 text-xs">{currentUser.email}</div>}
              {companyName && <div className="text-blue-300 text-xs">{companyName}</div>}
            </div>
            <span className="bg-blue-500 px-2 py-0.5 rounded text-xs hidden sm:inline">
              {ROLE_LABELS[userRole] || userRole}
            </span>
          </div>
        )}

        <select value={language} onChange={e => setLanguage(e.target.value)}
          className="bg-white text-blue-700 px-1 sm:px-2 py-1 rounded text-xs sm:text-sm font-medium hover:bg-blue-50 border-0 cursor-pointer">
          <option value="zh">中文</option>
          <option value="en">EN</option>
          <option value="ms">BM</option>
        </select>

        {currentUser && (
          <div className="flex items-center gap-2">
            {/* ⚙️ 設定下拉 */}
            {settingsItems.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setSettingsOpen(v => !v)}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-xs border transition-colors ${isSettingsTab ? 'bg-white text-blue-700 border-white' : 'bg-blue-600 border-blue-400 text-white hover:bg-blue-800'}`}
                >
                  ⚙️ {language === 'zh' ? '設定' : language === 'ms' ? 'Tetapan' : 'Settings'}
                  <span className="text-xs">{settingsOpen ? '▲' : '▼'}</span>
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded shadow-lg border border-gray-200 z-50 py-1">
                    {settingsItems.map(item => (
                      <button
                        key={item.key}
                        onClick={() => { setMainTab(item.key); setSettingsOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${mainTab === item.key ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'}`}
                      >
                        {language === 'zh' ? item.labelZh : item.labelEn}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={onLogout}
              className="bg-blue-600 border border-blue-400 text-white px-3 py-1 rounded text-xs hover:bg-blue-800">
              {language === 'zh' ? '登出' : language === 'ms' ? 'Log Keluar' : 'Logout'}
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}