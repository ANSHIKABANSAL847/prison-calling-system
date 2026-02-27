import { CheckCircle, XCircle, Flag, Bell, PhoneOff } from "lucide-react";

interface VerificationStatusPanelProps {
  verified: boolean;
  identityConfirmed: boolean;
  flagged: boolean;
  alertSent: boolean;
  terminated: boolean;
}

export default function VerificationStatusPanel({
  verified, identityConfirmed, flagged, alertSent, terminated,
}: VerificationStatusPanelProps) {
  return (
    <div
      className="p-5"
      style={{ background: "#fff", border: "1px solid #CBD0D8", borderTop: "3px solid #7A0000", borderRadius: 4 }}
    >
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "#7A0000" }}>
        Verification Status
      </p>

      <div className="flex flex-col gap-3">
        {/* Voice match */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${verified ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"}`}>
          {verified ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          VOICE MATCH {verified ? "VERIFIED" : "PENDING"}
        </div>

        {/* Identity */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${identityConfirmed ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"}`}>
          {identityConfirmed ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          IDENTITY {identityConfirmed ? "CONFIRMED" : "NOT CONFIRMED"}
        </div>

        {flagged && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500 text-white font-bold text-sm">
            <Flag className="w-4 h-4 shrink-0" /> CALL FLAGGED
          </div>
        )}

        {alertSent && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600 text-white font-bold text-sm">
            <Bell className="w-4 h-4 shrink-0" /> ALERT DISPATCHED
          </div>
        )}

        {terminated && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-700 text-white font-bold text-sm">
            <PhoneOff className="w-4 h-4 shrink-0" /> CALL TERMINATED
          </div>
        )}
      </div>
    </div>
  );
}
