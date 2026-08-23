"use client";

import { Dumbbell } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 bg-blue-600 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-20"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Dumbbell size={32} />
          </div>
          <span className="text-3xl font-bold tracking-tight">Gymation</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight mb-6">
            The premium way to manage your fitness business.
          </h1>
          <p className="text-blue-100 text-lg">
            Streamline your gym operations, track attendance, manage memberships, and grow your revenue all in one place.
          </p>
        </div>

        <div className="relative z-10 text-sm text-blue-200">
          © {new Date().getFullYear()} Gymation Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 relative">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Dumbbell size={28} />
            </div>
            <span className="text-3xl font-bold tracking-tight text-slate-800">Gymation</span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-slate-500 mt-2">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
