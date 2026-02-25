import { Request, Response } from "express";
import Prisoner from "../models/Prisoner";
import Contact from "../models/Contact";

// ──────────────────────────────────────
// GET /api/stats — Dashboard summary stats
// ──────────────────────────────────────
export async function getDashboardStats(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [
      totalPrisoners,
      activePrisoners,
      totalContacts,
      verifiedContacts,
    ] = await Promise.all([
      Prisoner.countDocuments(),
      Prisoner.countDocuments({ isActive: true }),
      Contact.countDocuments(),
      Contact.countDocuments({ isVerified: true }),
    ]);

    res.json({
      prisoners: {
        total: totalPrisoners,
        active: activePrisoners,
        inactive: totalPrisoners - activePrisoners,
      },
      contacts: {
        total: totalContacts,
        verified: verifiedContacts,
        unverified: totalContacts - verifiedContacts,
      },
      // Placeholders — extend when call/alert features are built
      activeCalls: 0,
      alerts: 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
