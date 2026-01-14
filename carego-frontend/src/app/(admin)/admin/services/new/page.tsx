'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { api } from '@/src/lib/api';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function NewServicePage() {
  const router = useRouter();
  const [cities, setCities] = useState<any[]>([]);
  
  const { register, control, handleSubmit, watch, setValue } = useForm({
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

  // Auto-generate slug from Title + City
  const title = watch('title');
  const cityId = watch('city_id');

  useEffect(() => {
    api.get('/public/cities').then(res => setCities(res.data.data));
  }, []);

  useEffect(() => {
    if (title && cityId) {
      const city = cities.find(c => c.id === cityId)?.name || '';
      const slug = `${city}-${title}`.toLowerCase().replace(/ /g, '-');
      setValue('slug', slug);
    }
  }, [title, cityId, cities, setValue]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/admin/services', data);
      alert('Service Launched!');
      router.push('/admin/services');
    } catch (e) {
      alert('Failed to create service');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-6">Launch New Service</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <h3 className="font-bold text-gray-900">1. Basic Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service Title</label>
              <input {...register('title')} placeholder="e.g. Elder Care" className="w-full border p-2 rounded" />
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
             <label className="block text-sm font-medium mb-1">SEO Slug (Auto-generated)</label>
             <input {...register('slug')} readOnly className="w-full bg-gray-100 border p-2 rounded text-gray-500" />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Short Description (for Cards)</label>
             <input {...register('short_description')} className="w-full border p-2 rounded" />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Price Range</label>
             <input {...register('price_range')} placeholder="e.g. ₹1200-1500/day" className="w-full border p-2 rounded" />
          </div>
        </div>

        {/* Dynamic Sections */}
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
                  placeholder="Section Title (e.g. Who is this for?)" 
                  className="w-full border p-2 rounded font-medium"
                />
                <textarea 
                  {...register(`sections.${index}.content` as const)} 
                  placeholder="Content..." 
                  className="w-full border p-2 rounded h-24"
                />
              </div>
            </div>
          ))}
        </div>

        <button className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black">
          Publish Service
        </button>
      </form>
    </div>
  );
}