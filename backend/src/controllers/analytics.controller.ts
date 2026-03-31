import { Request, Response } from "express";
import Alert from "../models/Alerts";
import CallLog from "../models/CallLog";
import Prisoner from "../models/Prisoner";

export const getAnalyticsDashboard = async (req: Request, res: Response) => {
  try {

    // TOTAL CALLS
    const totalCalls = await CallLog.countDocuments();

    // TOTAL ALERTS
    const totalAlerts = await Alert.countDocuments();

    // THREAT CALLS
    const threatCalls = await CallLog.countDocuments({
      threatDetected: true,
    });

    // VERIFIED CALLS
    const verifiedCalls = await CallLog.countDocuments({
      verificationResult: "Verified",
    });

    const verificationAccuracy =
      totalCalls === 0
        ? 0
        : Math.round((verifiedCalls / totalCalls) * 100);

    // MONTHLY ALERT TREND
    const monthlyTrend = await Alert.aggregate([
      {
        $group: {
          _id: { $month: "$timestamp" },
          alerts: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    // HIGH RISK PRISONERS
    const highRiskPrisoners = await Alert.aggregate([
      {
        $group: {
          _id: "$prisonerId",
          alerts: { $sum: 1 },
        },
      },
      { $sort: { alerts: -1 } },
      { $limit: 5 },
    ]);

    // HEATMAP DATA
    const heatmap = await CallLog.aggregate([
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$date" },
            hour: { $hour: "$date" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalCalls,
        totalAlerts,
        threatCalls,
        verificationAccuracy,
      },
      monthlyTrend,
      highRiskPrisoners,
      heatmap,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load analytics",
    });
  }
};