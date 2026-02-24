"use client";

const calls = [
  { time: "10:45 AM", text: "Video Call with Anita Kumar" },
  { time: "09:15 AM", text: "Phone Call to Rajesh Sharma" },
  { time: "Yesterday 3:30 PM", text: 'SMS to Adv. Mehta: "Need to talk urgently"' },
  { time: "Yesterday 11:00 AM", text: "Outgoing Call to Lawyer" },
];

export default function CallHistory() {
  return (
    <div className="bg-white rounded-xl shadow p-6 h-full">
      <h3 className="text-lg font-semibold mb-4">Communication & Call History</h3>

      <div className="space-y-4">
        {calls.map((c, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
            <div>
              <p className="text-sm font-medium">{c.time}</p>
              <p className="text-sm text-gray-600">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}