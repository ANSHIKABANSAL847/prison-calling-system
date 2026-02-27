import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface VerificationBadgeProps {
  result: string;
}

export default function VerificationBadge({ result }: VerificationBadgeProps) {
  if (result === "Verified") {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
        <CheckCircle2 className="w-4 h-4" /> Verified
      </span>
    );
  }
  if (result === "Failed") {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 font-medium text-sm">
        <XCircle className="w-4 h-4" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-yellow-600 font-medium text-sm">
      <Clock className="w-4 h-4" /> Pending
    </span>
  );
}
