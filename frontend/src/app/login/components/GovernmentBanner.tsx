const EmblemSVG = () => (
  <svg viewBox="0 0 56 56" width="48" height="48">
    <path d="M28 4 L50 12 L50 32 Q50 46 28 52 Q6 46 6 32 L6 12 Z" fill="#0B1F4B" stroke="#C9A227" strokeWidth="2" />
    <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#C9A227" fontFamily="serif">HP</text>
  </svg>
);

const Emblem = () => (
  <div
    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
    style={{ background: "#fff", border: "2px solid #C9A227" }}
  >
    <EmblemSVG />
  </div>
);

export default function GovernmentBanner() {
  return (
    <>
      <div
        className="w-full flex items-center justify-center gap-4 py-3 px-6"
        style={{
          background: "linear-gradient(to right, #0B1F4B, #162d6b, #0B1F4B)",
          borderBottom: "3px solid #C9A227",
        }}
      >
        <Emblem />
        <div className="text-center">
          <p className="text-lg font-bold uppercase tracking-widest leading-tight" style={{ color: "#C9A227" }}>
            Government of Haryana
          </p>
          <p className="text-white text-sm font-semibold uppercase tracking-wide">
            Department of Prisons &amp; Correctional Services
          </p>
          <p className="text-white/50 text-[10px] tracking-widest mt-0.5">
            PRISON CALL MONITORING SYSTEM (PCMS)
          </p>
        </div>
        <Emblem />
      </div>
      {/* Gold stripe */}
      <div style={{ height: 3, background: "linear-gradient(to right, #C9A227, #e8c84a, #C9A227)" }} />
    </>
  );
}
