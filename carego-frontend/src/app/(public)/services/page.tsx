import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

async function getServices() {
  try {
    // 1. Get Cities (Default to first one for now)
    const cityRes = await fetch('http://localhost:8000/api/v1/public/cities', { next: { revalidate: 3600 } });
    if (!cityRes.ok) return [];
    
    const cityData = await cityRes.json();
    const cityId = cityData.data?.[0]?.id;
    if (!cityId) return [];

    // 2. Get Services
    const servicesRes = await fetch(`http://localhost:8000/api/v1/public/services?cityId=${cityId}`, { cache: 'no-store' });
    if (!servicesRes.ok) return [];
    
    const servicesData = await servicesRes.json();
    return servicesData.data || [];
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getServices();
  
  // Simulated data if API empty
  const displayServices = services.length > 0 ? services : [
    {
       id: 'static-1',
       title: 'Nursing Care at Home',
       slug: 'nursing-care',
       short_description: 'Professional nursing support including post-surgical care, wound dressing, and vitals monitoring.',
       price_range_min: 800,
       price_range_max: 2500,
       image: '/images/nursing.png'
    },
    {
       id: 'static-2',
       title: 'Physiotherapy',
       slug: 'physiotherapy',
       short_description: 'Expert mobility rehabilitation, pain management, and strength training in your living room.',
       price_range_min: 600,
       price_range_max: 1500,
       image: '/images/physio.png'
    },
    {
      id: 'static-3',
      title: 'Elderly Companion Care',
      slug: 'elderly-care',
      short_description: 'Compassionate assistance with daily activities, medication reminders, and emotional support.',
      price_range_min: 15000,
      price_range_max: 25000,
      image: '/images/hero.png' 
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 text-white py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h1>
          <p className="text-slate-300 text-lg">
            Explore our comprehensive range of home healthcare services designed 
            to bring hospital-quality care to your doorstep.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-10 relative z-10">
        
        {/* City Filter Placeholder */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-10 flex items-center gap-4 max-w-md mx-auto">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-grow">
             <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Location</label>
             <select className="w-full bg-transparent font-semibold text-slate-900 border-none outline-none p-0 focus:ring-0">
               <option>Jaipur, Rajasthan</option>
               <option>Gurugram, Haryana</option>
               <option>Delhi, NCR</option>
             </select>
          </div>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {displayServices.map((service) => (
            <div key={service.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group border border-slate-100 flex flex-col">
              <div className="relative h-56 overflow-hidden bg-slate-200">
                 <Image 
                    src={service.image || '/images/nursing.png'} 
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                 />
                 <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                    ₹{service.price_range_min} - ₹{service.price_range_max}
                 </div>
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">
                  {service.short_description}
                </p>
                
                <Link 
                  href={`/services/${service.slug}`} 
                  className="mt-auto w-full py-3 rounded-xl bg-slate-50 text-slate-700 font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-200"
                >
                  View Details <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
