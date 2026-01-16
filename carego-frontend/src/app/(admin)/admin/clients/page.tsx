"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  UserIcon,
  NoSymbolIcon,
  EyeIcon
} from "@heroicons/react/24/outline";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/clients');
      setClients(res.data.data.clients || []);
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
         <p className="text-slate-500 text-sm">Manage registered client accounts</p>
       </div>

       <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Organization / Name</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contact Person</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">City</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {loading ? (
                   <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading clients...</td></tr>
                ) : clients.length === 0 ? (
                   <tr><td colSpan={4} className="p-8 text-center text-slate-400">No clients found.</td></tr>
                ) : clients.map((client: any) => (
                   <tr key={client.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                         <div className="font-bold text-slate-800">{client.organization_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{client.contact_person_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{client.city_name}</td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                         <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View Details">
                            <EyeIcon className="w-4 h-4" />
                         </button>
                         <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Suspend Account">
                            <NoSymbolIcon className="w-4 h-4" />
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}
