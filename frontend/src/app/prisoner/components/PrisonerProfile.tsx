"use client";

import { useState } from "react";
import type { PrisonerData } from "../[id]/page";

const riskTagColors: Record<string, string> = {
  "High Risk": "bg-red-100 text-red-700",
  "Escape Risk": "bg-yellow-100 text-yellow-700",
  "Violent Offender": "bg-orange-100 text-orange-700",
  "Gang Affiliated": "bg-purple-100 text-purple-700",
  "Good Conduct": "bg-green-100 text-green-700",
};

interface PrisonerProfileProps {
  prisoner: PrisonerData;
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PrisonerProfile({ prisoner }: PrisonerProfileProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = isValidImageUrl(prisoner.photo) && !imgError;

  return (
    <div className="bg-white rounded-xl shadow p-6 flex gap-6">
      {showImage ? (
        <img
          src={prisoner.photo}
          alt={prisoner.fullName}
          className="w-32 h-32 rounded-lg object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500">
          {getInitials(prisoner.fullName)}
        </div>
      )}

      <div className="flex-1">
        <h2 className="text-2xl font-semibold">{prisoner.fullName}</h2>

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-gray-700">
          <p>
            <strong>Prisoner ID:</strong> {prisoner.prisonerId}
          </p>
          <p>
            <strong>Age:</strong>{" "}
            {prisoner.dateOfBirth ? calculateAge(prisoner.dateOfBirth) : "—"}
          </p>
          <p>
            <strong>Gender:</strong> {prisoner.gender}
          </p>
          <p>
            <strong>Case Number:</strong> {prisoner.caseNumber}
          </p>
          <p>
            <strong>Prison:</strong> {prisoner.prisonName}
          </p>
          <p>
            <strong>Sentence:</strong> {prisoner.sentenceYears} Years
          </p>
          {prisoner.aadhaarNumber && (
            <p>
              <strong>Aadhaar:</strong> {prisoner.aadhaarNumber}
            </p>
          )}
        </div>

        {prisoner.riskTags.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {prisoner.riskTags.map((tag) => (
              <span
                key={tag}
                className={`px-3 py-1 text-sm rounded-full font-medium ${
                  riskTagColors[tag] || "bg-gray-100 text-gray-600"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}