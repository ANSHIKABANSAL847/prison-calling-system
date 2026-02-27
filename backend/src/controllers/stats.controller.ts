import { Request, Response } from "express";
import Prisoner from "../models/Prisoner";
import Contact from "../models/Contact";
import CallLog from "../models/CallLog";

// ──────────────────────────────────────
// GET /api/stats — Dashboard summary stats
// ──────────────────────────────────────
export async function getDashboardStats(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const since30min = new Date(Date.now() - 30 * 60 * 1000);

    const [
      totalPrisoners,
      activePrisoners,
      totalContacts,
      verifiedContacts,
      activeCalls,
      totalAlerts,
    ] = await Promise.all([
      Prisoner.countDocuments(),
      Prisoner.countDocuments({ isActive: true }),
      Contact.countDocuments(),
      Contact.countDocuments({ isVerified: true }),
      CallLog.countDocuments({ verificationResult: "Pending", date: { $gte: since30min } }),
      CallLog.countDocuments({ verificationResult: "Failed" }),
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
      activeCalls,
      alerts: totalAlerts,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// GET /api/stats/live — Live dashboard feed (today only, paginated)
// Query params: callPage (default 1), alertPage (default 1)
// Returns: paginated call logs + failed-verification alerts for today
// ──────────────────────────────────────
const PAGE_SIZE = 6;

export async function getDashboardLive(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const callPage  = Math.max(1, parseInt(req.query.callPage  as string) || 1);
    const alertPage = Math.max(1, parseInt(req.query.alertPage as string) || 1);

    // Filter to today only (midnight → now)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [recentCalls, callsTotal, recentAlerts, alertsTotal] = await Promise.all([
      CallLog.find({ date: { $gte: todayStart } })
        .populate("prisoner", "fullName prisonerId")
        .populate("contact", "contactName relation phoneNumber")
        .populate("agent", "name")
        .sort({ date: -1 })
        .skip((callPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      CallLog.countDocuments({ date: { $gte: todayStart } }),
      CallLog.find({ verificationResult: "Failed", date: { $gte: todayStart } })
        .populate("prisoner", "fullName prisonerId")
        .populate("contact", "contactName relation")
        .sort({ date: -1 })
        .skip((alertPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      CallLog.countDocuments({ verificationResult: "Failed", date: { $gte: todayStart } }),
    ]);

    res.json({
      recentCalls,
      recentAlerts,
      callsTotal,
      alertsTotal,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error("Live stats error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

