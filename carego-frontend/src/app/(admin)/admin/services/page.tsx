"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  FunnelIcon
} from "@heroicons/react/24/outline";

export default function ServicesAdminPage() {
  const [services, setServices] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [form, setForm] = useState({
     title: '',
     slug: '',
     shortDescription: '',
     cityId: '', // Default to selected City
     priceMin: 0,
     priceMax: 0
  });

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      fetchServices();
    }
  }, [selectedCity]);

  const fetchCities = async () => {
    try {
      const res = await api.get('/public/cities');
      const data = res.data.data || [];
      setCities(data);
      if (data.length > 0) setSelectedCity(data[0].id);
    } catch (error) {
       console.error(error);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/public/services?cityId=${selectedCity}`);
      setServices(res.data.data || []);
    } catch (error) {
       console.error(error);
       setServices([]);
    } finally {
       setLoading(false);
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setForm({
       title: service.title,
       slug: service.slug,
       shortDescription: service.short_description || '',
       cityId: service.city_id || selectedCity,
       priceMin: service.price_range_min || 0,
       priceMax: service.price_range_max || 0
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
     if (!confirm("Are you sure?")) return;
     try {
        await api.delete(`/admin/services/${id}`);
        fetchServices();
     } catch (err) {
        alert("Failed to delete");
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, cityId: selectedCity }; // Ensure cityId is set
    try {
       if (editingService) {
         await api.put(`/admin/services/${editingService.id}`, payload);
       } else {
         await api.post('/admin/services', payload);
       }
       setModalOpen(false);
       setEditingService(null);
       fetchServices();
    } catch (err) {
       alert("Failed to save service");
    }
  };

  return (
    <div className="space-y-6">
       
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Services</h1>
            <p className="text-slate-500 text-sm">Manage offerings per city</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <FunnelIcon className="w-4 h-4 text-slate-400" />
                <select 
                  className="bg-transparent font-medium text-slate-700 outline-none w-40 text-sm"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                   {cities.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                </select>
             </div>
             
             <button 
               onClick={() => { setEditingService(null); setForm({ ...form, cityId: selectedCity }); setModalOpen(true); }}
               className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 text-sm whitespace-nowrap"
             >
                <PlusIcon className="w-5 h-5" /> New Service
             </button>
          </div>
       </div>

       <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
               <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Service Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Slug</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Price Range</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td></tr>
               ) : services.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">No services found for this city.</td></tr>
               ) : services.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                     <td className="px-6 py-4 font-bold text-slate-800">{s.title}</td>
                     <td className="px-6 py-4 text-sm text-slate-500 font-mono">{s.slug}</td>
                     <td className="px-6 py-4 text-sm font-medium text-slate-700">₹{s.price_range_min} - ₹{s.price_range_max}</td>
                     <td className="px-6 py-4 flex justify-end gap-2">
                        <button onClick={() => handleEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><PencilSquareIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                     </td>
                  </tr>
               ))}
            </tbody>
          </table>
       </div>

       {/* Modal */}
       {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-900">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
                 <button onClick={() => setModalOpen(false)}><XMarkIcon className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Title</label>
                       <input 
                          type="text" required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.title}
                          onChange={e => setForm({...form, title: e.target.value})}
                       />
                    </div>
                    
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug (URL)</label>
                       <input 
                          type="text" required
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.slug}
                          onChange={e => setForm({...form, slug: e.target.value})}
                       />
                    </div>

                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Short Description</label>
                       <textarea 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                          value={form.shortDescription}
                          onChange={e => setForm({...form, shortDescription: e.target.value})}
                       />
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Price</label>
                       <input 
                          type="number"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.priceMin}
                          onChange={e => setForm({...form, priceMin: parseInt(e.target.value)})}
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Price</label>
                       <input 
                          type="number"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.priceMax}
                          onChange={e => setForm({...form, priceMax: parseInt(e.target.value)})}
                       />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 mt-4 transition-all">
                    {editingService ? 'Update Service' : 'Create Service'}
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
