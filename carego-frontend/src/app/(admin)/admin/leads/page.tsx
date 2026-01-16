"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon
} from "@heroicons/react/24/outline";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("NEW"); // NEW (Pending), CONVERTED
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
     userType: 'CLIENT',
     password: '',
     cityId: '', // Ideally fetch cities for dropdown
     notes: ''
  });

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/leads?status=${filter}`);
      setLeads(res.data.data.leads || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertClick = (lead: any) => {
    setSelectedLead(lead);
    setConvertForm({ ...convertForm, cityId: lead.city_id || '' });
    setConvertModalOpen(true);
  };

  const submitConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    
    try {
       await api.post(`/admin/leads/${selectedLead.id}/convert`, convertForm);
       setConvertModalOpen(false);
       fetchLeads(); // Refresh list
    } catch (error) {
       alert("Conversion Failed: " + (error as any).response?.data?.message);
    }
  };

  const filteredLeads = leads.filter((l: any) => 
    l.name?.toLowerCase().includes(search.toLowerCase()) || 
    l.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
           <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search by name or phone..." 
             className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>

        {/* Filters */}
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
           <button 
             onClick={() => setFilter('NEW')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'NEW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Pending
           </button>
           <button 
             onClick={() => setFilter('CONVERTED')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'CONVERTED' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Converted
           </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Interest</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading leads...</td></tr>
              ) : filteredLeads.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-slate-400">No leads found.</td></tr>
              ) : (
                filteredLeads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{lead.name}</div>
                      <div className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-700">{lead.phone}</div>
                      <div className="text-xs text-slate-400">{lead.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {lead.lead_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       {lead.lead_status === 'NEW' ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-sm font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Pending
                          </span>
                       ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                             <CheckCircleIcon className="w-4 h-4" /> Converted
                          </span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       {lead.lead_status === 'NEW' && (
                         <button 
                           onClick={() => handleConvertClick(lead)}
                           className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                         >
                           <UserPlusIcon className="w-3.5 h-3.5" /> Convert
                         </button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion Modal */}
      {convertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                 <h3 className="text-lg font-bold text-slate-900">Convert Lead to User</h3>
                 <button onClick={() => setConvertModalOpen(false)} className="bg-white p-1 rounded-full hover:bg-gray-100 text-gray-500"><XCircleIcon className="w-6 h-6" /></button>
              </div>
              <form onSubmit={submitConversion} className="p-6 space-y-4">
                 <div className="p-4 bg-blue-50 rounded-xl mb-4 border border-blue-100">
                    <p className="text-sm text-blue-800 font-medium">Converting <span className="font-bold">{selectedLead?.name}</span></p>
                    <p className="text-xs text-blue-600 mt-1">{selectedLead?.phone}</p>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User Type</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      value={convertForm.userType}
                      onChange={(e) => setConvertForm({...convertForm, userType: e.target.value})}
                    >
                       <option value="CLIENT">Client (Patient Family)</option>
                       <option value="STAFF">Staff (Nurse/Caregiver)</option>
                       <option value="STUDENT">Student (Training)</option>
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Set Password</label>
                    <input 
                       type="text" 
                       required
                       minLength={6}
                       className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="Create secure password"
                       value={convertForm.password}
                       onChange={(e) => setConvertForm({...convertForm, password: e.target.value})}
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Notes</label>
                    <textarea 
                       className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                       placeholder="Optional notes..."
                       value={convertForm.notes}
                       onChange={(e) => setConvertForm({...convertForm, notes: e.target.value})}
                    />
                 </div>

                 <button type="submit" className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 mt-4 transition-all">
                    Confirm Conversion
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}