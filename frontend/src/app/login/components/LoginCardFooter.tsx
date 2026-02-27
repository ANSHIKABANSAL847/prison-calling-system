"use client";

export default function LoginCardFooter() {
  return (
    <div
      className="px-8 py-4 text-center space-y-1"
      style={{ background: "#F2F4F7", borderTop: "1px solid #CBD0D8" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7A0000" }}>
        ⚠ RESTRICTED GOVERNMENT SYSTEM
      </p>
      <p className="text-[10px]" style={{ color: "#5A6073" }}>
        Unauthorised access is a criminal offence under IT Act 2000.
      </p>
      <p className="text-[10px]" style={{ color: "#5A6073" }}>
        All sessions are monitored and logged.
      </p>
    </div>
  );
}
