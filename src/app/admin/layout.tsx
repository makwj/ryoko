"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import Navbar from "@/components/Navbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
          <main>{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}


