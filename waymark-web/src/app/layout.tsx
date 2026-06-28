import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waymark",
  description: "Know what to actually work on — without the overwhelm.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
