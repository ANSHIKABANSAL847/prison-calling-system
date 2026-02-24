"use client";

const contacts = [
  { name: "Anita Kumar", relation: "Wife", phone: "+91 9876543210" },
  { name: "Rajesh Sharma", relation: "Brother", phone: "+91 8765432109" },
  { name: "Adv. Mehta", relation: "Lawyer", phone: "+91 9812345678" },
];

export default function AuthorizedContacts() {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Authorized Contacts</h3>

      <div className="space-y-4">
        {contacts.map((c, i) => (
          <div key={i} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">{c.relation}</p>
            </div>
            <div className="text-sm text-gray-700">{c.phone}</div>
          </div>
        ))}
      </div>
    </div>
  );
}