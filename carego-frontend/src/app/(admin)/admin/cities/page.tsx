"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MapPinIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export default function CitiesPage() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  
  const [form, setForm] = useState({
     name: '',
     state: '',
     latitude: '',
     longitude: '',
     isActive: true
  });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/public/cities'); // Using public endpoint for list
      setCities(res.data.data || []);
    } catch (error) {
      console.error("Error fetching cities", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (city: any) => {
    setEditingCity(city);
    setForm({
       name: city.name,
       state: city.state,
       latitude: city.latitude || '',
       longitude: city.longitude || '',
       isActive: true // Assuming active for now or fetching detail 
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this city?")) return;
    try {
       await api.delete(`/admin/cities/${id}`);
       fetchCities();
    } catch (error) {
       alert("Failed to delete city");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       if (editingCity) {
          await api.put(`/admin/cities/${editingCity.id}`, form);
       } else {
          await api.post('/admin/cities', form);
       }
       setModalOpen(false);
       setEditingCity(null);
       setForm({ name: '', state: '', latitude: '', longitude: '', isActive: true });
       fetchCities();
    } catch (error) {
       alert("Operation failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Cities</h1>
            <p className="text-slate-500 text-sm">Manage operational locations</p>
         </div>
         <button 
           onClick={() => { setEditingCity(null); setForm({ name: '', state: '', latitude: '', longitude: '', isActive: true }); setModalOpen(true); }}
           className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
         >
            <PlusIcon className="w-5 h-5" /> Add City
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-400">Loading cities...</div>
         ) : cities.map((city: any) => (
            <div key={city.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-lg transition-all">
               <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                     <MapPinIcon className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleEdit(city)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <PencilSquareIcon className="w-5 h-5" />
                     </button>
                     <button onClick={() => handleDelete(city.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <TrashIcon className="w-5 h-5" />
                     </button>
                  </div>
               </div>
               
               <div>
                  <h3 className="text-lg font-bold text-slate-800">{city.name}</h3>
                  <p className="text-slate-500 font-medium">{city.state}</p>
               </div>
               
               {(city.latitude || city.longitude) && (
                  <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-400 font-mono">
                     Lat: {city.latitude} • Long: {city.longitude}
                  </div>
               )}
            </div>
         ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-900">{editingCity ? 'Edit City' : 'Add New City'}</h3>
                 <button onClick={() => setModalOpen(false)}><XMarkIcon className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City Name</label>
                    <input 
                       type="text" required
                       className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                       value={form.name}
                       onChange={e => setForm({...form, name: e.target.value})}
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State</label>
                    <input 
                       type="text" required
                       className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                       value={form.state}
                       onChange={e => setForm({...form, state: e.target.value})}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Latitude</label>
                       <input 
                          type="text"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.latitude}
                          onChange={e => setForm({...form, latitude: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Longitude</label>
                       <input 
                          type="text"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.longitude}
                          onChange={e => setForm({...form, longitude: e.target.value})}
                       />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 mt-4 transition-all">
                    {editingCity ? 'Update City' : 'Create City'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
