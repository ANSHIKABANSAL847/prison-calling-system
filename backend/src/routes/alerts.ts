import express, { Request, Response } from "express";
import Alert from "../models/Alerts";

const router = express.Router();

/* Create Alert */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const alert = await Alert.create(req.body);

    res.json({
      success: true,
      alert,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to create alert",
    });
  }
});

/* Get Alerts */
router.get("/list", async (req: Request, res: Response) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 });

    res.json({
      success: true,
      alerts,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
    });
  }
});

export default router;