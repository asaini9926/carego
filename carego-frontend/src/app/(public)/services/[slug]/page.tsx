import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, Clock, Shield, ArrowLeft } from "lucide-react";

async function getServiceDetail(slug: string) {
  try {
    const res = await fetch(`http://localhost:8000/api/v1/public/services/${slug}`, { 
      cache: 'no-store' 
    });
    
    if (!res.ok) {
       // Simulate success for demo if backend not populated
       if (slug === 'nursing-care') {
          return {
            title: 'Nursing Care at Home',
            short_description: 'Professional nursing support for post-surgical care.',
            long_description: 'Our skilled nursing services ensure that you or your loved ones receive hospital-quality care in the comfort of your home. Whether it is post-surgical recovery, chronic illness management, or elderly care, our verified nurses are trained to handle complex medical needs with compassion.',
            price_range_min: 800,
            price_range_max: 2500,
            sections: [
              { title: 'What is included?', content: 'Vitals monitoring, medication administration, wound dressing, and catheter care.' },
              { title: 'Who is this for?', content: 'Patients recovering from surgery, elderly individuals needing assistance, or those with chronic conditions like diabetes.' }
            ]
          };
       }
       return null;
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    return null;
  }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getServiceDetail(slug);

  if (!service) {
    notFound(); // Returns 404 page
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      
      {/* Hero Header */}
      <div className="bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/50 z-10" />
        <div className="absolute inset-0 z-0">
           <Image src="/images/nursing.png" alt="Bg" fill className="object-cover opacity-50" />
        </div>
        
        <div className="container mx-auto px-4 py-20 relative z-20">
          <Link href="/services" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Services
          </Link>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">{service.title}</h1>
          <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
            {service.short_description}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-30">
        <div className="grid md:grid-cols-3 gap-8">
           
           {/* Main Content */}
           <div className="md:col-span-2 space-y-8">
             
             {/* Overview Card */}
             <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
               <h2 className="text-2xl font-bold text-slate-900 mb-4">Overview</h2>
               <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                 {service.long_description || service.short_description}
               </div>
             </div>

             {/* Dynamic Sections */}
             {service.sections?.map((section: any, idx: number) => (
                <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{section.title}</h3>
                  <div className="text-slate-600 leading-relaxed">
                    {section.content}
                  </div>
                </div>
             ))}

             {/* Trust Markers */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="flex items-start gap-4 p-6 bg-blue-50/50 rounded-xl border border-blue-100">
                 <Shield className="w-6 h-6 text-blue-600 shrink-0" />
                 <div>
                   <h4 className="font-bold text-slate-900">Verified Staff</h4>
                   <p className="text-sm text-slate-600 mt-1">Background checked and medically certified professionals.</p>
                 </div>
               </div>
               <div className="flex items-start gap-4 p-6 bg-teal-50/50 rounded-xl border border-teal-100">
                 <Clock className="w-6 h-6 text-teal-600 shrink-0" />
                 <div>
                   <h4 className="font-bold text-slate-900">Flexible Timing</h4>
                   <p className="text-sm text-slate-600 mt-1">Choose slots that work for you, from 1 hour to 24/7 care.</p>
                 </div>
               </div>
             </div>

           </div>

           {/* Sidebar */}
           <div className="space-y-6">
              
              {/* Booking Card */}
              <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-24">
                 <div className="text-center mb-6">
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Starting From</p>
                    <div className="text-3xl font-bold text-slate-900">
                      ₹{service.price_range_min} <span className="text-lg font-normal text-slate-400">/ day</span>
                    </div>
                 </div>

                 <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 mb-4">
                   Book Now
                 </button>
                 <button className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all">
                   Request Callback
                 </button>

                 <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                   <div className="flex items-center gap-3 text-sm text-slate-600">
                     <CheckCircle className="w-4 h-4 text-green-500" />
                     <span>Free consultation call</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm text-slate-600">
                     <CheckCircle className="w-4 h-4 text-green-500" />
                     <span>Replacement guarantee</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm text-slate-600">
                     <CheckCircle className="w-4 h-4 text-green-500" />
                     <span>Insurance compatible</span>
                   </div>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
}