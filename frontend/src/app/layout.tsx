import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ShellProvider from "@/components/ShellProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Prison Voice Monitoring System - Admin Dashboard",
  description: "A secure dashboard for monitoring and managing prison voice communications, powered by AI analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <ShellProvider>{children}</ShellProvider>
      </body>
    </html>
  );
}
