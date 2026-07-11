import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AppProvider } from "@/lib/context/AppContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Gymation - Gym Management System",
  description: "Modern SaaS Dashboard for Gym Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans text-slate-800 bg-slate-50 transition-colors duration-200">
        <AppProvider>
          {children}
        </AppProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
