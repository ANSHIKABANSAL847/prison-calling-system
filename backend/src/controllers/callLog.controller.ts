import { Request, Response } from "express";
import CallLog from "../models/CallLog";

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────
function secondsToDisplay(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ──────────────────────────────────────
// Sample Fallback Logs (Used if DB empty)
// ──────────────────────────────────────
function getSampleLogs() {
  return [
    {
      _id: "sample1",
      sessionId: "SESSION-1001",
      channel: "Video",
      verificationResult: "Verified",
      similarityScore: 92,
      durationSeconds: 420,
      date: new Date(),
      agent: {
        name: "Rahul Sharma",
        email: "rahul@prison.gov",
        role: "Monitoring Officer",
      },
      prisoner: {
        fullName: "Ramesh Kumar",
        prisonerId: "PR-9087",
        prisonName: "Tihar Jail",
      },
      contact: {
        contactName: "Sunita Kumar",
        relation: "Wife",
        phoneNumber: "9876543210",
      },
    },
    {
      _id: "sample2",
      sessionId: "SESSION-1002",
      channel: "Voice",
      verificationResult: "Failed",
      similarityScore: 54,
      durationSeconds: 310,
      date: new Date(Date.now() - 86400000),
      agent: {
        name: "Anita Verma",
        email: "anita@prison.gov",
        role: "Security Officer",
      },
      prisoner: {
        fullName: "Suresh Yadav",
        prisonerId: "PR-1123",
        prisonName: "Yerwada Central Jail",
      },
      contact: {
        contactName: "Mahesh Yadav",
        relation: "Brother",
        phoneNumber: "9123456780",
      },
    },
    {
      _id: "sample3",
      sessionId: "SESSION-1003",
      channel: "Video",
      verificationResult: "Pending",
      similarityScore: 76,
      durationSeconds: 180,
      date: new Date(Date.now() - 2 * 86400000),
      agent: {
        name: "Vikram Singh",
        email: "vikram@prison.gov",
        role: "Admin",
      },
      prisoner: {
        fullName: "Arjun Mehta",
        prisonerId: "PR-7781",
        prisonName: "Arthur Road Jail",
      },
      contact: {
        contactName: "Neha Mehta",
        relation: "Sister",
        phoneNumber: "9988776655",
      },
    },
  ];
}

// ──────────────────────────────────────
// GET /api/call-logs
// ──────────────────────────────────────
export async function getCallLogs(req: Request, res: Response): Promise<void> {
  try {
    const {
      channel,
      verificationResult,
      dateFrom,
      dateTo,
      minSimilarity,
      maxSimilarity,
      search,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};

    if (channel) filter.channel = channel;
    if (verificationResult) filter.verificationResult = verificationResult;

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    if (minSimilarity || maxSimilarity) {
      filter.similarityScore = {};
      if (minSimilarity) filter.similarityScore.$gte = Number(minSimilarity);
      if (maxSimilarity) filter.similarityScore.$lte = Number(maxSimilarity);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = CallLog.find(filter)
      .populate("agent", "name email role")
      .populate("prisoner", "fullName prisonerId prisonName")
      .populate("contact", "contactName relation phoneNumber")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    const [logs, total] = await Promise.all([
      query.lean(),
      CallLog.countDocuments(filter),
    ]);

    // ──────────────────────────────────────
    // If DB empty → return sample logs
    // ──────────────────────────────────────
    if (!logs || logs.length === 0) {
      const sampleLogs = getSampleLogs().map((l) => ({
        ...l,
        duration: secondsToDisplay(l.durationSeconds),
      }));

      res.json({
        logs: sampleLogs,
        total: sampleLogs.length,
        page: 1,
        totalPages: 1,
      });
      return;
    }

    let results = logs;

    if (search) {
      const q = search.toLowerCase();
      results = logs.filter((l: any) => {
        const sid = l.sessionId?.toLowerCase() ?? "";
        const contactName = l.contact?.contactName?.toLowerCase() ?? "";
        const prisonerName = l.prisoner?.fullName?.toLowerCase() ?? "";
        const agentName = l.agent?.name?.toLowerCase() ?? "";

        return (
          sid.includes(q) ||
          contactName.includes(q) ||
          prisonerName.includes(q) ||
          agentName.includes(q)
        );
      });
    }

    const formatted = results.map((l: any) => ({
      ...l,
      duration: secondsToDisplay(l.durationSeconds),
    }));

    res.json({
      logs: formatted,
      total: search ? formatted.length : total,
      page: pageNum,
      totalPages: Math.ceil((search ? formatted.length : total) / limitNum),
    });
  } catch (err) {
    console.error("getCallLogs error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// GET /api/call-logs/:sessionId
// ──────────────────────────────────────
export async function getCallLogBySession(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    let log = await CallLog.findOne({ sessionId: req.params.sessionId })
      .populate("agent", "name email role")
      .populate("prisoner", "fullName prisonerId prisonName")
      .populate("contact", "contactName relation phoneNumber")
      .lean();

    // If not found in DB → check sample logs
    if (!log) {
      const sample = getSampleLogs().find(
        (l) => l.sessionId === req.params.sessionId,
      );

      if (!sample) {
        res.status(404).json({ message: "Session not found" });
        return;
      }

      // Directly return sample here
      res.json({
        ...sample,
        duration: secondsToDisplay(sample.durationSeconds),
      });
      return;
    }

    // If DB log found → return it
    res.json({
      ...log,
      duration: secondsToDisplay(log.durationSeconds),
    });
  } catch (err) {
    console.error("getCallLogBySession error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ──────────────────────────────────────
// GET /api/call-logs/stats/summary
// ──────────────────────────────────────
export async function getCallLogStats(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const total = await CallLog.countDocuments();

    if (total === 0) {
      const sample = getSampleLogs();
      const avgSimilarity = Math.round(
        sample.reduce((acc, cur) => acc + cur.similarityScore, 0) /
          sample.length,
      );

      res.json({
        total: sample.length,
        verified: sample.filter((l) => l.verificationResult === "Verified")
          .length,
        failed: sample.filter((l) => l.verificationResult === "Failed").length,
        pending: sample.filter((l) => l.verificationResult === "Pending")
          .length,
        avgSimilarity,
      });
      return;
    }

    const [verified, failed, pending] = await Promise.all([
      CallLog.countDocuments({ verificationResult: "Verified" }),
      CallLog.countDocuments({ verificationResult: "Failed" }),
      CallLog.countDocuments({ verificationResult: "Pending" }),
    ]);

    const avgResult = await CallLog.aggregate([
      { $group: { _id: null, avg: { $avg: "$similarityScore" } } },
    ]);

    const avgSimilarity =
      avgResult.length > 0 ? Math.round(avgResult[0].avg) : 0;

    res.json({ total, verified, failed, pending, avgSimilarity });
  } catch (err) {
    console.error("getCallLogStats error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
