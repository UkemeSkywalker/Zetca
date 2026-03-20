import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zetca - AI-Powered Social Media Automation",
  description: "Automate your social media strategy with AI-powered tools for content creation, scheduling, and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${inter.variable} font-sans bg-surface`}>
        <AuthProvider>
          {/* Skip Navigation Link */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:text-on-primary focus:rounded-lg focus:shadow-ambient gradient-primary"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
