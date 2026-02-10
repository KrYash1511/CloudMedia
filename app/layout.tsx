import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CloudMedia — Compress, Convert & Manage Media in the Cloud",
  description:
    "A cloud-based SaaS platform for video compression, image optimization, and media management. No heavy tools — just upload and go.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable}>
      <body className="bg-base-100 text-base-content">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}