import { Flag, PhoneOff, Bell } from "lucide-react";

interface CallActionButtonsProps {
  callActive: boolean;
  flagged: boolean;
  terminated: boolean;
  alertSent: boolean;
  onFlag: () => void;
  onTerminate: () => void;
  onAlert: () => void;
}

export default function CallActionButtons({
  callActive, flagged, terminated, alertSent,
  onFlag, onTerminate, onAlert,
}: CallActionButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <button
        onClick={onFlag}
        disabled={!callActive || flagged}
        className="cursor-pointer flex items-center justify-center gap-2.5 py-3.5 text-white font-bold text-sm tracking-widest uppercase transition disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "#7A0000", borderRadius: 3 }}
      >
        <Flag className="w-4 h-4 shrink-0" />
        Flag
      </button>

      <button
        onClick={onTerminate}
        disabled={!callActive || terminated}
        className="cursor-pointer flex items-center justify-center gap-2.5 py-3.5 text-white font-bold text-sm tracking-widest uppercase transition disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "#0B1F4B", borderRadius: 3 }}
      >
        <PhoneOff className="w-4 h-4 shrink-0" />
        Terminate
      </button>

      <button
        onClick={onAlert}
        disabled={!callActive || alertSent}
        className="cursor-pointer flex items-center justify-center gap-2.5 py-3.5 text-white font-bold text-sm tracking-widest uppercase transition disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "#7a4800", borderRadius: 3 }}
      >
        <Bell className="w-4 h-4 shrink-0" />
        SEND ALERT
      </button>
    </div>
  );
}
