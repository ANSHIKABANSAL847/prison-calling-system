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
  voicePaths?: string[];
  voiceSamples?: number;
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
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-gray-700" />
      </div>
    );
  }

  if (error || !prisoner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-700 font-medium">
          {error || "Official Record Not Found"}
        </p>
        <button
          onClick={() => router.push("/prisoner")}
          className="text-sm underline text-blue-700"
        >
          ← Back to Records
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-serif">

      {/* ===== GOVERNMENT HEADER ===== */}
      <div className="bg-white border-b-4 border-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-gray-900">
              CENTRAL JAIL DIGITAL RECORD SYSTEM
            </h1>
            <p className="text-sm text-gray-600">
              Ministry of Home Affairs – Government of India
            </p>
          </div>
          <div className="text-right text-sm text-gray-700">
            <p>File Ref No: PR-{prisoner.prisonerId}</p>
            <p>Status: Active Record</p>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT DOSSIER SECTION */}
        <div className="lg:col-span-2 space-y-8">

          {/* PERSONAL DOSSIER */}
          <div className="bg-white border border-gray-400 shadow-sm">
            <div className="border-b border-gray-400 px-6 py-3 bg-gray-200 font-semibold tracking-wide">
              PERSONAL DOSSIER
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">

              {/* Photo */}
              <div className="flex flex-col items-center">
                <img
                  src={prisoner.photo}
                  alt={prisoner.fullName}
                  className="w-40 h-52 object-cover border-2 border-gray-700"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Prisoner ID: {prisoner.prisonerId}
                </p>
              </div>

              {/* Details Table */}
              <div className="md:col-span-2">
                <table className="w-full text-sm border border-gray-400">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-semibold w-1/3">Full Name</td>
                      <td className="p-2">{prisoner.fullName}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-semibold">Date of Birth</td>
                      <td className="p-2">{prisoner.dateOfBirth}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-semibold">Gender</td>
                      <td className="p-2">{prisoner.gender}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-semibold">Aadhaar</td>
                      <td className="p-2">{prisoner.aadhaarNumber || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold">Prison</td>
                      <td className="p-2">{prisoner.prisonName}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CASE & SENTENCE */}
          <div className="bg-white border border-gray-400 shadow-sm">
            <div className="border-b border-gray-400 px-6 py-3 bg-gray-200 font-semibold tracking-wide">
              CASE & SENTENCE DETAILS
            </div>
            <div className="p-6 text-sm space-y-3">
              <p><strong>Case Number:</strong> {prisoner.caseNumber}</p>
              <p><strong>Sentence Duration:</strong> {prisoner.sentenceYears} Years</p>
              <p>
                <strong>Risk Classification:</strong>{" "}
                {prisoner.riskTags.join(", ")}
              </p>
              <p>
                <strong>Verification Status:</strong>{" "}
                {prisoner.verificationPercent}%
              </p>
            </div>
          </div>

          {/* CONTACTS */}
          <AuthorizedContacts
            prisonerId={prisoner._id}
            contacts={contacts}
            onRefresh={fetchPrisoner}
          />

          {/* STATS */}
          <StatsCards prisoner={prisoner} />
        </div>

        {/* RIGHT SIDE - CALL LOG PANEL */}
        <div className="bg-white border border-gray-400 shadow-sm">
          <div className="border-b border-gray-400 px-6 py-3 bg-gray-200 font-semibold tracking-wide">
            CALL MONITORING LOG
          </div>
          <div className="p-6">
            <CallHistory prisonerName={prisoner.fullName} />
          </div>
        </div>

      </div>
    </div>
  );
}