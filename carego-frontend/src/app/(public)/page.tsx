import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star, Shield, Clock } from "lucide-react";

async function getServices() {
  try {
    // 1. Get Cities
    const cityRes = await fetch('http://localhost:8000/api/v1/public/cities', { next: { revalidate: 3600 } });
    if (!cityRes.ok) throw new Error('Failed to fetch cities');
    const cityData = await cityRes.json();
    const cityId = cityData.data?.[0]?.id;

    if (!cityId) return null;

    // 2. Get Services for first city
    const servicesRes = await fetch(`http://localhost:8000/api/v1/public/services?cityId=${cityId}`, { cache: 'no-store' });
    if (!servicesRes.ok) throw new Error('Failed to fetch services');
    const servicesData = await servicesRes.json();
    
    return servicesData.data?.slice(0, 2) || [];
  } catch (error) {
    console.error("Error fetching services:", error);
    return null;
  }
}

export default async function Home() {
  const services = await getServices();
  
  // Fallback data if API fails or returns empty (simulating for UI dev if backend empty)
  const displayServices = services && services.length > 0 ? services : [
    {
      id: 'static-1',
      title: 'Nursing Care at Home',
      slug: 'nursing-care',
      short_description: 'Professional nursing support for post-surgical care, elderly care, and chronic condition management.',
      image: '/images/nursing.png'
    },
    {
      id: 'static-2',
      title: 'Physiotherapy',
      slug: 'physiotherapy',
      short_description: 'Expert physiotherapists to help you recover mobility and strength in the comfort of your home.',
      image: '/images/physio.png'
    }
  ];

  return (
    <div className="flex flex-col gap-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative w-full h-[600px] flex items-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
           <Image 
             src="/images/hero.png" 
             alt="Carego Hero" 
             fill
             className="object-cover opacity-60"
             priority
           />
           <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-2xl text-white space-y-6 animate-in slide-in-from-left-10 duration-700 fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm font-medium backdrop-blur-md">
              <Star className="w-3.5 h-3.5 fill-blue-200" />
              <span>#1 Trusted Home Healthcare Provider</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
              Expert Healthcare, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                Right at Home
              </span>
            </h1>
            
            <p className="text-lg text-slate-200 leading-relaxed opacity-90">
              We bring world-class medical care to your doorstep. From skilled nursing 
              to elderly care, experience professional support with a personal touch.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
               <Link href="/services" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2">
                 Explore Services
                 <ArrowRight className="w-5 h-5" />
               </Link>
               <Link href="/contact" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl backdrop-blur-md border border-white/10 transition-all flex items-center justify-center">
                 Book Consultation
               </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Values */}
      <section className="container mx-auto px-4 -mt-24 relative z-20">
        <div className="grid md:grid-cols-3 gap-6">
           <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 flex flex-col gap-4 border border-slate-100">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Verified Professionals</h3>
              <p className="text-slate-500 leading-relaxed">Every caregiver is rigorously vetted, background checked, and medically certified.</p>
           </div>
           <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 flex flex-col gap-4 border border-slate-100">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">24/7 Availability</h3>
              <p className="text-slate-500 leading-relaxed">Round-the-clock support for emergencies and scheduled care, whenever you need us.</p>
           </div>
           <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 flex flex-col gap-4 border border-slate-100">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Premium Care</h3>
              <p className="text-slate-500 leading-relaxed">Hospital-quality protocols tailored to the comfort and privacy of your home.</p>
           </div>
        </div>
      </section>

      {/* Services Snippet */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-end mb-12">
           <div>
             <h2 className="text-3xl font-bold text-slate-900 mb-2">Our Core Services</h2>
             <p className="text-slate-500">Comprehensive care solutions tailored to your needs</p>
           </div>
           
           <Link href="/services" className="hidden md:flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition">
             View All Services <ArrowRight className="w-4 h-4" />
           </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {displayServices.map((service, index) => (
            <div key={service.id} className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100">
               <div className="grid md:grid-cols-2 h-full">
                  <div className="relative h-64 md:h-full overflow-hidden">
                    <Image 
                      src={service.image || (index === 0 ? '/images/nursing.png' : '/images/physio.png')} 
                      alt={service.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{service.title}</h3>
                    <p className="text-slate-500 mb-6 leading-relaxed line-clamp-3">
                      {service.short_description}
                    </p>
                    <Link 
                      href={`/services/${service.slug}`} 
                      className="inline-flex items-center text-blue-600 font-bold hover:gap-2 transition-all"
                    >
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
               </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
           <Link href="/services" className="inline-flex items-center gap-2 text-blue-600 font-semibold">
             View All Services <ArrowRight className="w-4 h-4" />
           </Link>
        </div>
      </section>

    </div>
  );
}
