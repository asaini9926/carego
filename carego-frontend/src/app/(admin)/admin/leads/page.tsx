'use client';

import { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { PhoneIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string>("");

  // 1. Fetch Data
  const fetchData = async () => {
    try {
      const [leadsRes, citiesRes] = await Promise.all([
        api.get('/admin/leads'),
        api.get('/public/cities') // We reuse the public API to get the city list
      ]);
      setLeads(leadsRes.data.data);
      setCities(citiesRes.data.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Handle "Convert" Click
  const openConvertModal = (leadId: string) => {
    setSelectedLeadId(leadId);
    setSelectedCityId(""); // Reset selection
    setIsModalOpen(true);
  };

  // 3. Submit Conversion
  const handleConvert = async () => {
    if (!selectedCityId) return alert("Please select an operational city.");
    if (!selectedLeadId) return;

    try {
      await api.post(`/admin/leads/${selectedLeadId}/convert`, { 
        operational_city_id: selectedCityId 
      });
      alert("Success! Lead converted to Client.");
      setIsModalOpen(false);
      fetchData(); // Refresh list
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to convert lead.");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold mb-6">Lead Management</h1>
      
      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
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
                      onClick={() => openConvertModal(lead.id)}
                      className="text-blue-600 hover:text-blue-900 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50"
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

      {/* Conversion Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Convert to Client</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select the city where this client will be managed.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Operational City</label>
            <select 
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-full border rounded-md p-2 mb-6"
            >
              <option value="">-- Select City --</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>

            <button 
              onClick={handleConvert}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700"
            >
              Confirm Conversion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}