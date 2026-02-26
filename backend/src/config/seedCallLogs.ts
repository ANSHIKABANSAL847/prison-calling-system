import crypto from "crypto";
import CallLog from "../models/CallLog";
import User from "../models/User";
import Prisoner from "../models/Prisoner";
import Contact from "../models/Contact";

/**
 * Seeds demo call log records.
 * Only runs when the collection is empty.
 */
export async function seedCallLogs(): Promise<void> {
  const count = await CallLog.countDocuments();
  if (count > 0) {
    console.log("ℹ️  Call logs already seeded — skipping");
    return;
  }

  // Pull real agents, prisoners and contacts from DB
  const agents = await User.find().lean();
  const prisoners = await Prisoner.find().lean();
  const contacts = await Contact.find().populate("prisoner").lean();

  if (!agents.length || !prisoners.length || !contacts.length) {
    console.warn("⚠️  No agents/prisoners/contacts found — skipping call log seed");
    return;
  }

  const channels: Array<"Phone" | "Video Call" | "Chat"> = [
    "Phone",
    "Video Call",
    "Chat",
  ];
  const statuses: Array<"Verified" | "Failed" | "Pending"> = [
    "Verified",
    "Failed",
    "Pending",
  ];

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomScore(result: string): number {
    if (result === "Verified") return 80 + Math.floor(Math.random() * 20); // 80-99
    if (result === "Failed") return 40 + Math.floor(Math.random() * 30);   // 40-69
    return 70 + Math.floor(Math.random() * 15);                            // 70-84
  }

  // Build 30 demo records spread over the last 60 days
  const now = Date.now();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;
  const records = [];

  for (let i = 0; i < 30; i++) {
    const agent = pick(agents);
    const contact = pick(contacts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisoner =
      (contact.prisoner as any)?._id
        ? contact.prisoner
        : pick(prisoners);
    const channel = pick(channels);
    const verificationResult = pick(statuses);
    const similarityScore = randomScore(verificationResult);
    const date = new Date(now - Math.random() * SIXTY_DAYS);
    const durationSeconds = 60 + Math.floor(Math.random() * 1140); // 1-20 min
    const sessionId = `SID${100000 + i}`;

    records.push({
      sessionId,
      agent: agent._id,
      prisoner: (prisoner as any)._id ?? prisoner,
      contact: (contact as any)._id,
      channel,
      date,
      durationSeconds,
      verificationResult,
      similarityScore,
    });
  }

  await CallLog.insertMany(records);
  console.log(`✅ Seeded ${records.length} call log records`);
}
