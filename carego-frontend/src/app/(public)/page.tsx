import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="py-20 bg-blue-50">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Professional Care, <br/> Delivered Home.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Verified nurses, trained attendants, and post-surgery care experts available in your city.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
              Book Now
            </button>
            <button className="px-8 py-3 bg-white text-blue-600 border border-blue-200 rounded-lg font-semibold hover:bg-blue-50">
              Explore Services
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              "Verified Staff",
              "24/7 Support", 
              "Affordable Plans"
            ].map((feature) => (
              <div key={feature} className="p-6 border rounded-xl hover:shadow-lg transition">
                <CheckCircleIcon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-2">{feature}</h3>
                <p className="text-gray-600">We ensure the highest quality standards for all our care services.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}