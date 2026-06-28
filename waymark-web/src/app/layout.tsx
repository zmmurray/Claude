import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MountainBackdrop from "@/components/MountainBackdrop";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Waymark",
  description: "Find what matters today.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <MountainBackdrop />
        {children}
      </body>
    </html>
  );
}
