// A small triumphant moment: a climber reaches the summit, plants a flag that
// sways, and a sparkle flourish bursts. Pure SVG + CSS (see globals.css), on-palette.
export default function SummitCelebration() {
  const spark = (cx: number, cy: number, delay: string) => (
    <circle className="summit-spark" cx={cx} cy={cy} r={2.4} fill="#DAF1DE"
      style={{ animationDelay: delay, transformBox: "fill-box", transformOrigin: "center" }} />
  );
  return (
    <div className="mx-auto mb-4 w-[220px] max-w-full">
      <svg viewBox="0 0 220 170" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <radialGradient id="summitGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bfe0c8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#bfe0c8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="summitPeak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6a57" />
            <stop offset="100%" stopColor="#0B2B26" />
          </linearGradient>
        </defs>

        {/* glow behind the summit */}
        <circle className="summit-glow" cx="108" cy="60" r="52" fill="url(#summitGlow)"
          style={{ transformBox: "fill-box", transformOrigin: "center" }} />

        {/* back ridge */}
        <path d="M-10,170 L70,92 L142,170 Z" fill="#8EB69B" opacity="0.4" />
        {/* main peak */}
        <path d="M38,170 L110,52 L186,170 Z" fill="url(#summitPeak)" />
        {/* snow cap */}
        <path d="M110,52 L97,73 L123,73 Z" fill="#e8f3ea" opacity="0.85" />
        {/* dashed trail winding up */}
        <path d="M156,168 C 134,142 138,112 120,88 S 112,62 110,55"
          fill="none" stroke="#bfe0c8" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" opacity="0.7" />

        {/* sparkle flourish */}
        {spark(78, 42, "0.85s")}
        {spark(140, 38, "1.0s")}
        {spark(96, 22, "1.15s")}
        {spark(126, 24, "1.3s")}
        {spark(110, 14, "1.1s")}

        {/* climber + flag rise into place */}
        <g className="summit-rise" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          {/* flag */}
          <g className="summit-flag" style={{ transformBox: "fill-box", transformOrigin: "bottom" }}>
            <line x1="124" y1="52" x2="124" y2="30" stroke="#163832" strokeWidth="2" strokeLinecap="round" />
            <path d="M124,30 L139,34 L124,39 Z" fill="#6e977f" />
          </g>
          {/* person, arms raised in triumph */}
          <g stroke="#0B2B26" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <circle cx="103" cy="30" r="4.2" fill="#0B2B26" stroke="none" />
            <line x1="103" y1="34" x2="103" y2="46" />
            <line x1="103" y1="37" x2="96" y2="28" />
            <line x1="103" y1="37" x2="110" y2="28" />
            <line x1="103" y1="46" x2="98" y2="53" />
            <line x1="103" y1="46" x2="108" y2="53" />
          </g>
        </g>
      </svg>
    </div>
  );
}
