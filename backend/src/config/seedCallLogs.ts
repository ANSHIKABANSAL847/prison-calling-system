import CallLog from "../models/CallLog";
import User from "../models/User";
import Prisoner from "../models/Prisoner";

/**
 * Seeds demo call log records.
 * Only runs when the collection is empty.
 */
export async function seedCallLogs(): Promise<void> {
  const count = await CallLog.countDocuments();
  if (count > 0) {
    console.log(" Call logs already seeded — skipping");
    return;
  }

  // Pull real agents and prisoners from DB
  const agents = await User.find().lean();
  const prisoners = await Prisoner.find().lean();

  if (!agents.length || !prisoners.length) {
    console.warn("  No agents/prisoners found — skipping call log seed");
    return;
  }

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

  const now = Date.now();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

  const records = [];

  for (let i = 0; i < 30; i++) {
    const agent = pick(agents);
    const prisoner = pick(prisoners);

    const verificationResult = pick(statuses);
    const similarityScore = randomScore(verificationResult);
    const date = new Date(now - Math.random() * SIXTY_DAYS);
    const durationSeconds = 60 + Math.floor(Math.random() * 1140);
    const sessionId = `SID${100000 + i}`;

    records.push({
      sessionId,
      agent: agent._id,
      prisoner: prisoner._id,
      date,
      durationSeconds,
      verificationResult,
      similarityScore,
    });
  }

  await CallLog.insertMany(records);
  console.log(`Seeded ${records.length} call log records`);
}