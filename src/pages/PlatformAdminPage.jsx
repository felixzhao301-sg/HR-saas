import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PLANS, upgradePlan } from '../utils/subscription'

export default function PlatformAdminPage({ onLogout }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchCompanies() }, [])

  async function fetchCompanies() {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    setCompanies(data || [])
    setLoading(false)
  }

  async function handleStatusChange(companyId, status) {
    setSavingId(companyId)
    await supabase.from('companies').update({ status }).eq('id', companyId)
    await fetchCompanies()
    setSavingId(null)
  }

  async function handlePlanChange(companyId, plan) {
    setSavingId(companyId)
    await upgradePlan(companyId, plan)
    await fetchCompanies()
    setSavingId(null)
  }

  const statusColor = (s) =>
    s === 'active' ? 'bg-green-100 text-green-700' :
    s === 'pending' ? 'bg-yellow-100 text-yellow-700' :
    s === 'suspended' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.uen?.toLowerCase().includes(search.toLowerCase())
  )

  function getDaysLeft(company) {
    const date = company.plan === 'trial'
      ? company.trial_ends_at
      : company.subscription_ends_at
    if (!date) return '—'
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? `${diff} days` : 'Expired'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <div>
          <h1 className="text-lg font-bold">Platform Admin</h1>
          <p className="text-gray-400 text-xs">HR SaaS Management Console</p>
        </div>
        <button onClick={onLogout}
          className="text-gray-400 hover:text-white text-sm">
          Logout
        </button>
      </nav>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Companies', value: companies.length },
            { label: 'Active', value: companies.filter(c => c.status === 'active').length },
            { label: 'Pending', value: companies.filter(c => c.status === 'pending').length },
            { label: 'Suspended', value: companies.filter(c => c.status === 'suspended').length },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl shadow p-4">
              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 搜索 */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by company name or UEN..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 公司列表 */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Company', 'UEN', 'Status', 'Plan', 'Expires', 'Employees', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No companies found</td></tr>
              ) : filtered.map(company => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{company.name}</div>
                    {company.address && <div className="text-xs text-gray-400">{company.address}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{company.uen || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColor(company.status)}`}>
                      {company.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={company.plan || 'trial'}
                      onChange={e => handlePlanChange(company.id, e.target.value)}
                      disabled={savingId === company.id}
                      className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      {Object.entries(PLANS).map(([key, p]) => (
                        <option key={key} value={key}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{getDaysLeft(company)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {company.max_employees ?? 20}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {company.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(company.id, 'active')}
                          disabled={savingId === company.id}
                          className="text-xs text-green-600 hover:underline disabled:opacity-50">
                          Activate
                        </button>
                      )}
                      {company.status !== 'suspended' && (
                        <button
                          onClick={() => handleStatusChange(company.id, 'suspended')}
                          disabled={savingId === company.id}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50">
                          Suspend
                        </button>
                      )}
                      {company.status !== 'pending' && (
                        <button
                          onClick={() => handleStatusChange(company.id, 'pending')}
                          disabled={savingId === company.id}
                          className="text-xs text-gray-400 hover:underline disabled:opacity-50">
                          Set Pending
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}