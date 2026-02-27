"use client";

interface PageBannerProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export default function PageBanner({ title, subtitle, actions }: PageBannerProps) {
  return (
    <div
      className="mb-6 px-7 py-4 flex items-center justify-between"
      style={{
        background: "linear-gradient(135deg, #0B1F4B 0%, #162d6b 100%)",
        borderLeft: "5px solid #C9A227",
        borderRadius: 4,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.16em] mb-0.5"
          style={{ color: "rgba(201,162,39,0.7)" }}
        >
          Department of Prisons · Haryana
        </p>
        <h1 className="text-xl font-black uppercase tracking-wide text-white">{title}</h1>
        <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
