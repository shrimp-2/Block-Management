import express from "express";
import Block from "../models/Block.js";
import Sales from "../models/Sales.js";

const router = express.Router();

// ✅ Fetch all blocks (for dashboard, reports, etc.)
router.get("/", async (req, res) => {
  try {
    const blocks = await Block.find();
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blocks" });
  }
});

// ✅ Add production (increase inStock & produced)
router.post("/production", async (req, res) => {
  try {
    const { blockSize, quantity } = req.body;
    let block = await Block.findOne({ size: blockSize });

    if (!block) {
      block = new Block({ size: blockSize });
    }

    block.produced += Number(quantity);
    block.inStock += Number(quantity);
    await block.save();

    res.json({ message: "Production added successfully", block });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add production" });
  }
});

// ✅ Add sale (decrease stock + record sale)
router.post("/sales", async (req, res) => {
  try {
    const { blockSize, quantity, customer } = req.body;
    const block = await Block.findOne({ size: blockSize });

    if (!block) {
      return res.status(400).json({ error: "Block type not found" });
    }

    if (block.inStock < quantity) {
      return res.status(400).json({ error: "Not enough stock to sell" });
    }

    // Update block stock
    block.sold += Number(quantity);
    block.inStock -= Number(quantity);
    await block.save();

    // Save sales record
    const sale = new Sales({
      blockSize,
      quantity: Number(quantity),
      customer,
    });
    await sale.save();

    res.json({ message: "Sale recorded successfully", sale });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record sale" });
  }
});

// ✅ Fetch all sales
router.get("/sales", async (req, res) => {
  try {
    const sales = await Sales.find().sort({ date: -1 });
    res.json(sales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

export default router;
