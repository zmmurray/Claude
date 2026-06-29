// A clean, cinematic "you made it" moment: the route draws itself up the peak,
// then the summit blooms with light. Pure SVG + CSS (see globals.css), on-palette.
export default function SummitCelebration() {
  return (
    <div className="mx-auto mb-4 w-[240px] max-w-full">
      <svg viewBox="0 0 240 180" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <radialGradient id="cineGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#eafff0" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#bfe0c8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#bfe0c8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cinePeak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6a57" />
            <stop offset="100%" stopColor="#0B2B26" />
          </linearGradient>
        </defs>

        {/* soft halo behind the summit, blooms at the end */}
        <circle className="cine-bloom" cx="120" cy="46" r="46" fill="url(#cineGlow)" />

        {/* back ridge */}
        <path className="cine-peak" style={{ animationDelay: "0.05s" }}
          d="M-10,180 L70,96 L150,180 Z" fill="#8EB69B" opacity="0.4" />
        {/* main peak */}
        <path className="cine-peak" d="M30,180 L120,44 L210,180 Z" fill="url(#cinePeak)" />
        {/* snow cap */}
        <path className="cine-peak" d="M120,44 L106,66 L134,66 Z" fill="#eafff0" opacity="0.9" />

        {/* the route, drawing itself up to the summit */}
        <path className="cine-trail" pathLength={1}
          d="M188,176 C 150,156 168,122 132,104 S 118,72 120,50"
          fill="none" stroke="#DAF1DE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* summit marker + rays */}
        <circle className="cine-bloom" cx="120" cy="46" r="5" fill="#eafff0" />
        <g className="cine-ray" stroke="#bfe0c8" strokeWidth="2.4" strokeLinecap="round">
          <line x1="120" y1="30" x2="120" y2="20" />
          <line x1="106" y1="34" x2="100" y2="28" />
          <line x1="134" y1="34" x2="140" y2="28" />
          <line x1="112" y1="30" x2="107" y2="23" />
          <line x1="128" y1="30" x2="133" y2="23" />
        </g>
      </svg>
    </div>
  );
}
