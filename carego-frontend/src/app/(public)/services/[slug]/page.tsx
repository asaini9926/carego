import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, PhoneIcon } from '@heroicons/react/24/solid';
import LeadForm from '@/src/components/public/LeadForm';

// Fetch data on the server (SEO Critical)
async function getServiceData(slug: string) {
  try {
    // Fetch all cities and services to find the matching one
    // (Optimization: Later we can add a specific backend endpoint for single service)
    const [citiesRes, servicesRes] = await Promise.all([
      fetch('http://localhost:5000/api/v1/public/cities', { next: { revalidate: 3600 } }),
      fetch('http://localhost:5000/api/v1/public/services', { next: { revalidate: 3600 } })
    ]);

    const cities = await citiesRes.json();
    const services = await servicesRes.json();
    
    const service = services.data?.find((s: any) => s.slug === slug);

    return { 
      service,
      cities: cities.data || [], 
      allServices: services.data || [] 
    };
  } catch (error) {
    return { service: null, cities: [], allServices: [] };
  }
}

// Generate Metadata for SEO automatically
export async function generateMetadata({ params }: { params: { slug: string } }) {
    // Await params as required in Next.js 15/16
    const { slug } = await params;
    const { service } = await getServiceData(slug);
  
    if (!service) return { title: 'Service Not Found' };
  
    return {
      title: `${service.title} in Jaipur | Verified Carego Staff`,
      description: service.short_description || `Professional ${service.title} available at home. Police verified staff.`,
    };
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  // Await params here too
  const { slug } = await params;
  const { service, cities, allServices } = await getServiceData(slug);

  if (!service) {
    return notFound();
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header / Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-600">Home</Link> 
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{service.title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Content */}
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full mb-4">
              {service.price_range}
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">{service.title}</h1>
            
            <div className="prose max-w-none text-gray-700 mb-8">
              <p className="text-xl leading-relaxed">{service.short_description}</p>
              {/* If you have long HTML content in DB, use dangerouslySetInnerHTML here later */}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-white p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500"/> Verified Staff
                </h3>
                <p className="text-gray-600 text-sm">Every caregiver undergoes police verification and background checks.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500"/> 24/7 Support
                </h3>
                <p className="text-gray-600 text-sm">Our medical team is available round the clock for emergencies.</p>
              </div>
            </div>
          </div>

          {/* Sidebar Booking Form */}
          <div className="w-full lg:w-[400px]">
            <div className="sticky top-8">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Book {service.title}</h3>
                  <p className="text-sm text-gray-500">Fill details to get a callback</p>
                </div>
                {/* Reusing the exact same form component */}
                <LeadForm cities={cities} services={allServices} />
                
                <div className="mt-6 pt-6 border-t text-center">
                   <p className="text-sm text-gray-500 mb-2">Prefer to call?</p>
                   <a href="tel:+919999999999" className="flex items-center justify-center gap-2 text-xl font-bold text-blue-600">
                     <PhoneIcon className="w-6 h-6" /> +91 999 999 9999
                   </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}