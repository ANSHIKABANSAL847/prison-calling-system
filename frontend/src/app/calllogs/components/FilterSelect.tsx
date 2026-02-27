import { ChevronDown } from "lucide-react";

interface FilterSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

export default function FilterSelect({ label, options, value, onChange }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 text-xs border bg-white cursor-pointer focus:outline-none font-bold uppercase tracking-widest"
        style={{ borderColor: "#CBD0D8", borderRadius: 3, color: "#0B1F4B" }}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}
