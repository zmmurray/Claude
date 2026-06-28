// Hand-drawn misty mountain header — layered ridgelines in the brand palette.
// Bright fog up top, sage haze in the distance, deep pine ridges in front. It's
// vector, so it's always crisp and always on-palette (no stray sky or sun), and
// it fades into the page so the body gradient can carry on down to dark.
export default function MountainBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10"
      style={{
        height: "72vh",
        WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%)",
      }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 820"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* soft fog wash that brightens the very top */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4faf5" />
            <stop offset="45%" stopColor="#e6f3e9" />
            <stop offset="100%" stopColor="#dcefe1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ridgeFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c463c" />
            <stop offset="100%" stopColor="#0B2B26" />
          </linearGradient>
          <filter id="haze" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* bright sky / fog */}
        <rect x="0" y="0" width="1440" height="820" fill="url(#sky)" />

        {/* farthest ridge — palest, hazy */}
        <path
          fill="#8EB69B" opacity="0.32"
          d="M0,372 C 180,318 320,346 460,316 C 620,282 760,300 920,318 C 1120,340 1280,374 1440,332 L1440,820 L0,820 Z"
        />
        {/* second ridge */}
        <path
          fill="#6e977f" opacity="0.45"
          d="M0,470 C 220,408 380,448 540,418 C 720,384 880,402 1040,432 C 1240,470 1330,470 1440,430 L1440,820 L0,820 Z"
        />
        {/* mist band between the far and mid ranges */}
        <rect x="-40" y="452" width="1520" height="60" fill="#eef7f0" opacity="0.55" filter="url(#haze)" />

        {/* third ridge */}
        <path
          fill="#235347" opacity="0.7"
          d="M0,572 C 240,506 440,552 640,528 C 840,504 1000,498 1180,540 C 1320,572 1380,566 1440,548 L1440,820 L0,820 Z"
        />
        {/* low mist drifting across the front ranges */}
        <rect x="-40" y="556" width="1520" height="70" fill="#eaf5ed" opacity="0.45" filter="url(#haze)" />

        {/* front ridge — deep pine */}
        <path
          fill="url(#ridgeFront)"
          d="M0,672 C 260,612 470,664 690,640 C 900,618 1080,612 1280,652 C 1360,668 1410,664 1440,656 L1440,820 L0,820 Z"
        />
      </svg>
    </div>
  );
}
