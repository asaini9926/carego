'use client';

import { useState, useEffect, use } from 'react'; // 'use' for unwrapping params
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { api } from '@/src/lib/api';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap params using React.use() (Next.js 15+ requirement)
  const { id } = use(params);

  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { register, control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      title: '',
      city_id: '',
      slug: '',
      short_description: '',
      price_range: '',
      sections: [{ title: 'Why Choose Us?', content: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'sections' });

  // 1. Fetch Cities & Service Data
  useEffect(() => {
    async function init() {
      try {
        const [cityRes, serviceRes] = await Promise.all([
          api.get('/public/cities'),
          api.get(`/admin/services/${id}`)
        ]);
        
        setCities(cityRes.data.data);
        
        // Populate Form
        const serviceData = serviceRes.data.data;
        reset({
          title: serviceData.title,
          city_id: serviceData.city_id,
          slug: serviceData.slug,
          short_description: serviceData.short_description,
          price_range: serviceData.price_range,
          sections: serviceData.sections.length > 0 
            ? serviceData.sections 
            : [{ title: 'Why Choose Us?', content: '' }]
        });
      } catch (error) {
        console.error("Fetch error", error);
        alert("Could not load service data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, reset]);

  // 2. Submit Updates
 const onSubmit = async (data: any) => {
    try {
      // Logic is now enabled!
      await api.put(`/admin/services/${id}`, data);
      alert('Service Updated Successfully!');
      router.push('/admin/services');
    } catch (e) {
      console.error(e);
      alert('Failed to update service');
    }
  };

  if (loading) return <div className="p-8">Loading Service Data...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Service</h1>
        <button 
            type="button"
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700"
        >
            Cancel
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Same form fields as NewPage */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <h3 className="font-bold text-gray-900">1. Basic Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service Title</label>
              <input {...register('title')} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <select {...register('city_id')} className="w-full border p-2 rounded">
                <option value="">Select City</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Slug</label>
             <input {...register('slug')} className="w-full bg-gray-100 border p-2 rounded text-gray-500" />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Short Description</label>
             <input {...register('short_description')} className="w-full border p-2 rounded" />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Price Range</label>
             <input {...register('price_range')} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900">2. Content Sections</h3>
            <button type="button" onClick={() => append({ title: '', content: '' })} className="text-blue-600 text-sm flex items-center gap-1">
              <PlusIcon className="w-4 h-4"/> Add Section
            </button>
          </div>
          
          {fields.map((field, index) => (
            <div key={field.id} className="bg-gray-50 p-4 rounded-lg relative group">
              <button type="button" onClick={() => remove(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                <TrashIcon className="w-5 h-5" />
              </button>
              <div className="space-y-3">
                <input 
                  {...register(`sections.${index}.title` as const)} 
                  className="w-full border p-2 rounded font-medium"
                />
                <textarea 
                  {...register(`sections.${index}.content` as const)} 
                  className="w-full border p-2 rounded h-24"
                />
              </div>
            </div>
          ))}
        </div>

        <button className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black">
          Update Service
        </button>
      </form>
    </div>
  );
}