import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Cormorant_Garamond({
  subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap",
});

export const metadata: Metadata = {
  title: "Waymark",
  description: "Find what matters today.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
