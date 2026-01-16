import LeadForm from "@/src/components/public/LeadForm";

// --- Types ---
interface Service {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  price_range?: string;
  city_name?: string;
  image_url?: string;
}

interface City {
  id: string | number;
  name: string;
}

// --- Data Fetching ---
async function getServices(): Promise<Service[]> {
  try {
    const res = await fetch(`http://localhost:5000/api/v1/public/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("Failed to fetch services");
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  } catch (error) {
    console.error("Service fetch error:", error);
    return [];
  }
}

async function getCities(): Promise<City[]> {
  try {
    const res = await fetch(`http://localhost:5000/api/v1/public/cities`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Failed to fetch cities");
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  } catch (error) {
    console.error("City fetch error:", error);
    return [];
  }
}

// --- Static Content (Styled after "Samarth" Vibe) ---
const features = [
  {
    title: "Monitor & Predict",
    desc: "AI-driven vitals monitoring to detect health changes before they become emergencies.",
    icon: "📊",
  },
  {
    title: "Coordinate & Act",
    desc: "A dedicated Care Manager coordinates doctors, nurses, and meds so you don't have to.",
    icon: "🤝",
  },
  {
    title: "Connect & Reassure",
    desc: "Real-time updates on your phone. Know your loved ones are safe, even from miles away.",
    icon: "📱",
  },
];

const testimonials = [
  {
    name: "Dr. R.K. Gupta",
    role: "Son of Patient",
    location: "Delhi",
    review:
      "It is a huge relief for NRI children like me. Knowing my parents are in safe hands with Carego's verified staff makes all the difference.",
  },
  {
    name: "Mrs. Shalini Iyer",
    role: "Post-Op Patient",
    location: "Mumbai",
    review:
      "The nurse was not just skilled but deeply human. She became a part of our family during my 6-week recovery.",
  },
  {
    name: "Col. Pratap Singh",
    role: "Senior Citizen",
    location: "Chandigarh",
    review:
      "Dignity and independence—that is what Carego gave me back. Their physio team is world-class.",
  },
];

const faqs = [
  {
    q: "How does the Care Manager system work?",
    a: "Every family is assigned a dedicated Care Manager who acts as a single point of contact for scheduling, emergencies, and doctor coordination.",
  },
  {
    q: "Is the staff medically verified?",
    a: "Yes. We conduct rigorous police verification, medical certification checks, and psychometric assessments for all staff.",
  },
  {
    q: "Can I monitor my parents' health remotely?",
    a: "Absolutely. Our app provides daily vitals logs, medication adherence reports, and direct chat with the nurse.",
  },
  {
    q: "What if we don't like the caregiver?",
    a: "We offer a 'No-Questions-Asked' replacement guarantee within 24 hours to ensure your complete comfort.",
  },
];

export const metadata = {
  title: "Carego | Comprehensive Elder & Home Care",
  description:
    "Intelligently connected, deeply human home healthcare services.",
};

export default async function HomePage() {
  const services = await getServices();
  const cities = await getCities();

  return (
    <main className="flex flex-col bg-white">
      {/* ================= HERO SECTION (Human & Warm) ================= */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="container mx-auto px-4 grid lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Text Content */}
          <div className="lg:col-span-7">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold tracking-wide mb-6 uppercase">
              ★ India's Most Trusted Home Care
            </div>

            <h1 className="text-4xl lg:text-6xl font-black leading-[1.1] text-slate-900 mb-6 tracking-tight">
              Because Your Family <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Deserves the Best
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-lg leading-relaxed font-medium">
              Intelligently connected, deeply human care. We combine technology
              with compassionate nursing to support recovery and independent
              living.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div className="text-sm">
                  <p className="font-bold text-slate-900">100% Verified</p>
                  <p className="text-slate-500">Staff Background Checks</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                  🏥
                </div>
                <div className="text-sm">
                  <p className="font-bold text-slate-900">ICU Standards</p>
                  <p className="text-slate-500">Clinical Protocols</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Form - Prominent & Trusted */}
          <div className="lg:col-span-5">
            <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-blue-900/10 border border-gray-100 relative">
              {/* Badge */}
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-slate-900 text-xs font-bold px-4 py-2 rounded-full shadow-md">
                Get a Free Care Plan
              </div>
              <LeadForm cities={cities} services={services} />
            </div>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent -z-10 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-50 rounded-full blur-3xl -z-10"></div>
      </section>

      {/* ================= STATS STRIP (Like the PDF) ================= */}
      <section className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-blue-500/50">
            <div>
              <div className="text-4xl font-black mb-1">350+</div>
              <div className="text-blue-100 text-sm font-medium">
                Cities Covered
              </div>
            </div>
            <div>
              <div className="text-4xl font-black mb-1">9,500+</div>
              <div className="text-blue-100 text-sm font-medium">
                Lives Touched
              </div>
            </div>
            <div>
              <div className="text-4xl font-black mb-1">100%</div>
              <div className="text-blue-100 text-sm font-medium">
                Verified Staff
              </div>
            </div>
            <div>
              <div className="text-4xl font-black mb-1">24/7</div>
              <div className="text-blue-100 text-sm font-medium">
                Emergency Support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TECH-ENABLED CARE (Structure from PDF) ================= */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Empowered by Technology, <br />
              Backed by Heart
            </h2>
            <p className="text-slate-600 text-lg">
              We believe technology should empower human connection, not replace
              it. Our secure intelligent platform ensures your loved ones are
              never out of sight.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-3xl p-8 hover:bg-blue-50 transition-colors duration-300 border border-slate-100 hover:border-blue-100"
              >
                <div className="text-4xl mb-6">{f.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {f.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SERVICES LIST (Backend Data) ================= */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(#4b5563 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        ></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Comprehensive Care Services
              </h2>
              <p className="text-slate-400">
                Tailored to medical needs and personal preferences.
              </p>
            </div>
            <a
              href="/services"
              className="px-6 py-3 rounded-full border border-slate-600 text-white hover:bg-white hover:text-slate-900 transition font-semibold"
            >
              View All Services
            </a>
          </div>

          {services.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <a
                  key={service.id}
                  href={`/services/${service.slug}`}
                  className="group bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-blue-500 hover:bg-slate-800/80 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {/* Dynamic Icon based on title logic could go here, for now generic */}
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                    {service.price_range && (
                      <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-600">
                        {service.price_range}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                    {service.short_description ||
                      "Specialized care delivered by trained professionals."}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-700 rounded-2xl">
              <p className="text-slate-500">Services are being updated...</p>
            </div>
          )}
        </div>
      </section>

      {/* ================= WHY CHOOSE US (Values) ================= */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full transform rotate-3 blur-3xl opacity-50"></div>
              <img
                src="https://images.unsplash.com/photo-1516733968668-dbdce39c4651?auto=format&fit=crop&q=80&w=1000"
                alt="Happy senior citizen"
                className="relative rounded-3xl shadow-2xl transform hover:scale-[1.02] transition duration-500"
              />
            </div>

            <div className="order-1 lg:order-2 space-y-8">
              <h2 className="text-4xl font-bold text-slate-900">
                A Care Team Like No Other
              </h2>
              <p className="text-lg text-slate-600">
                Empathetic, resourceful, and committed to your family's
                well-being. We understand the complex needs of the elderly and
                the anxieties of the children who care for them.
              </p>

              <div className="space-y-4">
                {[
                  "Dedicated Care Managers (Ex-Hospital Staff)",
                  "Daily Digital Reporting & Vitals Tracking",
                  "Emergency Response Protocol (Amber Alert)",
                  "Physiotherapy & Nutrition Integration",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                    <span className="font-semibold text-slate-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">
            Families That Trust Carego
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col"
              >
                <div className="flex text-yellow-400 mb-4 text-sm">★★★★★</div>
                <p className="text-slate-600 italic leading-relaxed mb-6 flex-grow">
                  "{t.review}"
                </p>
                <div className="flex items-center gap-4 mt-auto border-t border-gray-100 pt-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.role}, {t.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="bg-white py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group bg-slate-50 p-6 rounded-2xl border border-slate-200 cursor-pointer open:bg-white open:shadow-md transition-all duration-300"
              >
                <summary className="font-bold text-slate-800 list-none flex justify-between items-center text-lg">
                  {f.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed animate-in fade-in slide-in-from-top-2">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
