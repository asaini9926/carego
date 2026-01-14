"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { PlusIcon, MapPinIcon, PencilIcon } from "@heroicons/react/24/outline";

export default function ServiceListPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await api.get("/admin/services");
        setServices(res.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  if (loading) return <div className="p-8">Loading Services...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Services & Content</h1>
        <Link
          href="/admin/services/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" /> Add New Service
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white p-6 rounded-xl border hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <MapPinIcon className="w-3 h-3" /> {service.city_name}
              </span>
              <span
                className={`w-3 h-3 rounded-full ${
                  service.is_active ? "bg-green-500" : "bg-gray-300"
                }`}
              ></span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {service.title}
            </h3>
            <p className="text-gray-500 text-sm mb-4 line-clamp-2">
              {service.short_description}
            </p>
            <p className="font-semibold text-gray-700 mb-4">
              {service.price_range}
            </p>

            <div className="pt-4 border-t flex justify-between items-center text-sm">
              <span className="text-gray-400 font-mono text-xs">
                {service.slug}
              </span>
              <Link
                href={`/admin/services/${service.id}`}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <PencilIcon className="w-4 h-4" /> Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
