import { CheckCircleIcon, PhoneIcon } from '@heroicons/react/24/outline';
import LeadForm from '@/src/components/public/LeadForm';

// Helper to fetch data safely
async function getPublicData() {
  try {
    // Note: In Server Components, we need the full URL
    // Ensure your backend is running on port 5000
    const [citiesRes, servicesRes] = await Promise.all([
      fetch('http://localhost:5000/api/v1/public/cities', { next: { revalidate: 3600 } }),
      fetch('http://localhost:5000/api/v1/public/services', { next: { revalidate: 3600 } })
    ]);

    const cities = await citiesRes.json();
    const services = await servicesRes.json();

    return { 
      cities: cities.data || [], 
      services: services.data || [] 
    };
  } catch (error) {
    console.error("Backend fetch error:", error);
    return { cities: [], services: [] };
  }
}

export const metadata = {
  title: 'Carego | Professional Home Healthcare',
  description: 'Verified nurses and patient care attendants in Jaipur and NCR.',
};

export default async function HomePage() {
  const { cities, services } = await getPublicData();

  return (
    <div className="bg-gray-50 min-h-screen">
      
      {/* Hero Section */}
      <section className="relative bg-white pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            
            {/* Text Content */}
            <div className="flex-1 text-center md:text-left">
              <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
                #1 Trusted Nursing Bureau
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                Hospital Quality Care, <br/>
                <span className="text-blue-600">Now at Home.</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto md:mx-0">
                Don't stress about post-surgery recovery or elderly care. 
                We provide verified, police-checked staff within 2 hours.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" /> 
                  <span>Police Verified</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" /> 
                  <span>Trained Staff</span>
                </div>
              </div>
            </div>

            {/* Lead Form - Floating Card */}
            <div className="w-full md:w-[450px] relative z-10">
              <LeadForm cities={cities} services={services} />
            </div>
            
          </div>
        </div>
      </section>

      {/* Services List (SEO Friendly) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service: any) => (
              <div key={service.id} className="bg-white p-6 rounded-xl border hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-blue-600 font-semibold mb-4">{service.price_range}</p>
                <p className="text-gray-600 text-sm mb-4">{service.short_description}</p>
                <button className="text-blue-600 font-semibold hover:underline">View Details →</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}