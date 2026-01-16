import Link from "next/link";

export const metadata = {
  title: "Carego | Intelligent Home Healthcare",
  description: "Professional nursing, elderly care, and medical equipment delivered at home. Trusted by thousands of families.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900 font-sans">
        <div className="flex flex-col min-h-screen">
          
          {/* Top Bar - Emergency & Trust (Common in Elder Care sites) */}
          <div className="bg-slate-900 text-white py-2 text-xs font-medium tracking-wide">
            <div className="container mx-auto px-4 flex justify-between items-center">
              <span className="hidden sm:inline opacity-80">India's Most Trusted Family Care Network</span>
              <div className="flex gap-6">
                <a href="tel:+919999999999" className="hover:text-blue-300 transition flex items-center gap-2">
                  <span>📞 24/7 Support:</span>
                  <span className="font-bold">+91 99999 99999</span>
                </a>
              </div>
            </div>
          </div>

          {/* Main Navbar */}
          <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm/50 backdrop-blur-md bg-white/95">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
              
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-3xl font-black text-blue-700 tracking-tighter group-hover:text-blue-800 transition-colors">
                  Carego
                </span>
                <span className="hidden lg:inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                  Life Assistant
                </span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-slate-600">
                <Link href="/" className="hover:text-blue-700 transition-colors">
                  Home
                </Link>
                <Link href="/about" className="hover:text-blue-700 transition-colors">
                  Why Carego
                </Link>
                <Link href="/services" className="hover:text-blue-700 transition-colors">
                  Services
                </Link>
                <Link href="/contact" className="hover:text-blue-700 transition-colors">
                  Contact
                </Link>
              </nav>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="hidden lg:inline-flex px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-50 rounded-full transition"
                >
                  Family Login
                </Link>
                <button className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all duration-300">
                  Book Consultation
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-grow">{children}</main>

          {/* Footer - Trust & Links */}
          <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
             <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                   <div className="col-span-1 md:col-span-2">
                      <div className="text-2xl font-black text-blue-700 mb-6">Carego</div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-6">
                        We blend clinical expertise with deep human empathy to provide comprehensive care for your loved ones at home. Supported by intelligent technology for real-time peace of mind.
                      </p>
                      <div className="flex gap-4">
                         {/* Social Placeholders */}
                         <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition cursor-pointer">in</div>
                         <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition cursor-pointer">tw</div>
                         <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition cursor-pointer">fb</div>
                      </div>
                   </div>
                   
                   <div>
                      <h4 className="font-bold text-slate-900 mb-6">Quick Links</h4>
                      <ul className="space-y-3 text-sm text-slate-600">
                         <li><Link href="#" className="hover:text-blue-600">Our Care Team</Link></li>
                         <li><Link href="#" className="hover:text-blue-600">Services</Link></li>
                         <li><Link href="#" className="hover:text-blue-600">Pricing Plans</Link></li>
                         <li><Link href="#" className="hover:text-blue-600">Partner with Us</Link></li>
                      </ul>
                   </div>

                   <div>
                      <h4 className="font-bold text-slate-900 mb-6">Contact</h4>
                      <ul className="space-y-3 text-sm text-slate-600">
                         <li>support@carego.in</li>
                         <li>+91 99999 99999</li>
                         <li>Carego HQ, Sector 45,<br/>Gurugram, India</li>
                      </ul>
                   </div>
                </div>
                
                <div className="border-t border-slate-200 pt-8 text-center text-slate-400 text-sm">
                   © 2026 Carego Healthcare Pvt Ltd. All rights reserved.
                </div>
             </div>
          </footer>
        </div>
      </body>
    </html>
  );
}