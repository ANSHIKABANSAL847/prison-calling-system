"use client";

export default function StatsCards() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <p className="text-2xl font-bold text-green-600">98%</p>
        <p className="text-sm text-gray-600">Verified</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 text-center">
        <p className="text-2xl font-bold">62</p>
        <p className="text-sm text-gray-600">Calls Monitored</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 text-center">
        <p className="text-2xl font-bold">145</p>
        <p className="text-sm text-gray-600">Messages Reviewed</p>
      </div>
    </div>
  );
}