'use client';

import { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/admin/leads');
      setLeads(res.data.data);
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setLoading(false);
    }
  };

  const convertLead = async (leadId: string, cityId: string) => {
    if(!confirm("Are you sure you want to convert this lead to a client?")) return;
    
    try {
      await api.post(`/admin/leads/${leadId}/convert`, { operational_city_id: cityId });
      alert("Success! User created.");
      fetchLeads(); // Refresh list
    } catch (error) {
      alert("Failed to convert lead.");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Lead Management</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Interest</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{lead.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <PhoneIcon className="w-3 h-3" /> {lead.phone}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3" /> {lead.city_name}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {lead.service_name || lead.type}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    lead.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'CONVERTED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {lead.status === 'NEW' && (
                    <button 
                      onClick={() => convertLead(lead.id, 'temp-city-id')} // You might want a dropdown for city selection in a real modal
                      className="text-blue-600 hover:text-blue-900 border border-blue-200 px-3 py-1 rounded"
                    >
                      Convert
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}