"use client";

import type { PrisonerData } from "../[id]/page";

interface StatsCardsProps {
  prisoner: PrisonerData;
}

export default function StatsCards({ prisoner }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <p className="text-2xl font-bold text-green-600">
          {prisoner.verificationPercent}%
        </p>
        <p className="text-sm text-gray-600">Verified</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 text-center">
        <p className="text-2xl font-bold">{prisoner.totalCallsMonitored}</p>
        <p className="text-sm text-gray-600">Calls Monitored</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 text-center">
        <p className="text-2xl font-bold">{prisoner.sentenceYears}</p>
        <p className="text-sm text-gray-600">Sentence (Years)</p>
      </div>
    </div>
  );
}