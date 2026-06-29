"use client";

import { usePathname } from "next/navigation";

// Misty mountain header — a real photo (bright fog up top, pine forest below),
// pinned to the top and dissolving into the page's green gradient. A whisper of
// sage is laid over it to keep everything in the brand palette, and a soft pale
// wash up top keeps the wordmark + heading legible.
export default function MountainBackdrop() {
  // The chat page uses its own calm light gradient instead of the photo.
  const pathname = usePathname();
  if (pathname === "/chat") return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10"
      style={{
        height: "86vh",
        backgroundImage:
          "linear-gradient(180deg, rgba(244,250,245,0.45) 0%, rgba(244,250,245,0.10) 16%, rgba(110,151,127,0.10) 55%, rgba(110,151,127,0.18) 100%), url('/mountains.png')",
        backgroundSize: "cover, cover",
        backgroundPosition: "center top, center top",
        backgroundRepeat: "no-repeat, no-repeat",
        WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 62%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, #000 0%, #000 62%, transparent 100%)",
      }}
    />
  );
}
