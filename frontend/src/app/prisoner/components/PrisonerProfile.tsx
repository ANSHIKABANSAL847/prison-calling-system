"use client";

export default function PrisonerProfile() {
  return (
    <div className="bg-white rounded-xl shadow p-6 flex gap-6">
      <img
        src="https://i.pravatar.cc/150?img=12"
        alt="Prisoner"
        className="w-32 h-32 rounded-lg object-cover"
      />

      <div className="flex-1">
        <h2 className="text-2xl font-semibold">Rakesh Kumar</h2>

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-gray-700">
          <p><strong>Prisoner ID:</strong> INM456789</p>
          <p><strong>Age:</strong> 38</p>
          <p><strong>Gender:</strong> Male</p>
          <p><strong>Case Number:</strong> ALC12345</p>
          <p><strong>Prison:</strong> Tihar Jail</p>
          <p><strong>Sentence:</strong> 12 Years</p>
        </div>

        <div className="flex gap-2 mt-4">
          <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-700">High Risk</span>
          <span className="px-3 py-1 text-sm rounded-full bg-orange-100 text-orange-700">Violent Offender</span>
          <span className="px-3 py-1 text-sm rounded-full bg-yellow-100 text-yellow-700">Escape Risk</span>
        </div>
      </div>
    </div>
  );
}