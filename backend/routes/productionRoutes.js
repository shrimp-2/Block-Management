import express from "express";
import Production from "../models/Production.js";
const router = express.Router();

// Add new production record
router.post("/", async (req, res) => {
  try {
    const record = await Production.create(req.body);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all production records
router.get("/", async (req, res) => {
  try {
    const data = await Production.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
