import { User } from "lucide-react";

interface PrisonerOption {
  _id: string;
  fullName: string;
  prisonerId: number;
  gender?: string;
  prisonName?: string;
  photo?: string;
  riskTags?: string[];
}

interface ContactOption {
  _id: string;
  contactName: string;
  relation: string;
  phoneNumber: string;
  isVerified: boolean;
}

interface SpeakerIdentityPanelProps {
  selected: PrisonerOption | null;
  identityConfirmed: boolean;
  callActive: boolean;
  verifiedContact: ContactOption | null;
}

export default function SpeakerIdentityPanel({
  selected, identityConfirmed, callActive, verifiedContact,
}: SpeakerIdentityPanelProps) {
  return (
    <div
      className="p-5"
      style={{ background: "#fff", border: "1px solid #CBD0D8", borderTop: "3px solid #0B1F4B", borderRadius: 4 }}
    >
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "#0B1F4B" }}>
        Speaker Identity
      </p>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
          {selected?.photo ? (
            <img src={selected.photo} alt={selected.fullName} className="w-full h-full object-cover" />
          ) : selected ? (
            <span className="text-2xl font-bold text-gray-400">{selected.fullName[0]}</span>
          ) : (
            <User className="w-8 h-8 text-gray-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">
            {selected ? "Identified:" : "No profile selected"}
          </p>
          <p className="text-sm font-bold text-gray-900 truncate">
            {selected?.fullName ?? "—"}
          </p>

          {selected && (
            <span
              className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                identityConfirmed
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : callActive
                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300 animate-pulse"
                  : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}
            >
              {identityConfirmed ? "Confirmed Match" : callActive ? "Analysing…" : "Idle"}
            </span>
          )}

          {selected && (
            <div className="mt-3 space-y-0.5 text-xs text-gray-600">
              <p><span className="text-gray-400">Gender:</span>{" "}<span className="font-medium">{selected.gender ?? "—"}</span></p>
              <p><span className="text-gray-400">Prison:</span>{" "}<span className="font-medium truncate">{selected.prisonName ?? "—"}</span></p>
              {verifiedContact && (
                <p><span className="text-gray-400">Contact:</span>{" "}<span className="font-medium">{verifiedContact.contactName}</span></p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Risk tags */}
      {selected?.riskTags && selected.riskTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {selected.riskTags.map((t) => (
            <span
              key={t}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                t === "High Risk" || t === "Violent Offender" || t === "Escape Risk"
                  ? "bg-red-100 text-red-700"
                  : t === "Gang Affiliated"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
