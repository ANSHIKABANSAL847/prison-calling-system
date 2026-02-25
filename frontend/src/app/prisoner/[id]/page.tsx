"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import PrisonerProfile from "../components/PrisonerProfile";
import AuthorizedContacts from "../components/AuthorizedContacts";
import CallHistory from "../components/CallHistory";
import StatsCards from "../components/StatsCards";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface PrisonerData {
  _id: string;
  prisonerId: number;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  photo: string;
  aadhaarNumber?: string;
  caseNumber: string;
  prisonName: string;
  sentenceYears: number;
  riskTags: string[];
  verificationPercent: number;
  totalCallsMonitored: number;
  age?: number;
}

export interface ContactData {
  _id: string;
  contactName: string;
  relation: string;
  phoneNumber: string;
  photo?: string;
  isVerified: boolean;
}

export default function PrisonerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [prisoner, setPrisoner] = useState<PrisonerData | null>(null);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchPrisoner() {
    try {
      const res = await fetch(`${API_URL}/api/prisoners/${id}`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to fetch prisoner details");
        return;
      }

      const data = await res.json();
      setPrisoner(data.prisoner);
      setContacts(data.contacts || []);
    } catch {
      setError("Network error. Could not fetch prisoner details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchPrisoner();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !prisoner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 text-sm">{error || "Prisoner not found"}</p>
        <button
          onClick={() => router.push("/prisoner")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Prisoner List
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side */}
        <div className="lg:col-span-2 space-y-6">
          <PrisonerProfile prisoner={prisoner} />
          <AuthorizedContacts
            prisonerId={prisoner._id}
            contacts={contacts}
            onRefresh={fetchPrisoner}
          />
          <StatsCards prisoner={prisoner} />
        </div>

        {/* Right side */}
        <div className="lg:col-span-1">
          <CallHistory prisonerName={prisoner.fullName} />
        </div>
      </div>
    </div>
  );
}
