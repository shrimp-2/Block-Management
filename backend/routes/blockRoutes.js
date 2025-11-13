import express from "express";
import Block from "../models/Block.js";
import Sales from "../models/Sales.js";
import Production from "../models/Production.js";

const router = express.Router();

/* ======================================================
   🟦 GET ALL BLOCKS (Dashboard / Reports)
====================================================== */
router.get("/", async (req, res) => {
  try {
    const blocks = await Block.find();
    res.json(blocks);
  } catch (err) {
    console.error("GET /api/blocks error:", err);
    res.status(500).json({ error: "Failed to fetch blocks" });
  }
});

/* ======================================================
   🧱 ADD PRODUCTION
====================================================== */
router.post("/production", async (req, res) => {
  try {
    const { blockSize, quantity } = req.body;
    if (!blockSize || !quantity)
      return res.status(400).json({ error: "Missing fields" });

    let block = await Block.findOne({ size: blockSize });
    if (!block) block = new Block({ size: blockSize, produced: 0, sold: 0, inStock: 0 });

    block.produced += Number(quantity);
    block.inStock += Number(quantity);
    await block.save();

    const production = await Production.create({ blockSize, quantity });
    res.json({ message: "✅ Production added successfully", production });
  } catch (err) {
    console.error("POST /production error:", err.message);
    res.status(500).json({ error: "Failed to add production" });
  }
});

/* ======================================================
   📋 GET ALL PRODUCTIONS
====================================================== */
router.get("/production", async (req, res) => {
  try {
    const productions = await Production.find().sort({ date: -1 });
    res.json(productions);
  } catch (err) {
    console.error("GET /production error:", err.message);
    res.status(500).json({ error: "Failed to fetch productions" });
  }
});

/* ======================================================
   ✏️ UPDATE PRODUCTION (fixed version)
====================================================== */
router.put("/production/:id", async (req, res) => {
  try {
    const { blockSize, quantity } = req.body;
    const production = await Production.findById(req.params.id);
    if (!production)
      return res.status(404).json({ error: "Production not found" });

    // 🔹 If block size changed, handle separately
    if (production.blockSize !== blockSize) {
      // Revert from old block
      const oldBlock = await Block.findOne({ size: production.blockSize });
      if (oldBlock) {
        oldBlock.produced -= production.quantity;
        oldBlock.inStock -= production.quantity;
        await oldBlock.save();
      }

      // Add to new block
      let newBlock = await Block.findOne({ size: blockSize });
      if (!newBlock)
        newBlock = new Block({ size: blockSize, produced: 0, sold: 0, inStock: 0 });

      newBlock.produced += Number(quantity);
      newBlock.inStock += Number(quantity);
      await newBlock.save();
    } else {
      // Same block type → just adjust quantity
      const block = await Block.findOne({ size: blockSize });
      if (block) {
        block.produced -= production.quantity;
        block.inStock -= production.quantity;
        block.produced += Number(quantity);
        block.inStock += Number(quantity);
        await block.save();
      }
    }

    // Update production record
    production.blockSize = blockSize;
    production.quantity = Number(quantity);
    await production.save();

    res.json({ message: "✅ Production updated successfully", production });
  } catch (err) {
    console.error("PUT /production/:id error:", err.message);
    res.status(500).json({ error: "Failed to update production" });
  }
});

/* ======================================================
   🗑️ DELETE PRODUCTION (fixed version)
====================================================== */
router.delete("/production/:id", async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    if (!production)
      return res.status(404).json({ error: "Production not found" });

    const block = await Block.findOne({ size: production.blockSize });
    if (block) {
      block.produced = Math.max(block.produced - production.quantity, 0);
      block.inStock = Math.max(block.inStock - production.quantity, 0);
      await block.save();
    }

    await production.deleteOne();
    res.json({ message: "🗑️ Production deleted successfully" });
  } catch (err) {
    console.error("DELETE /production/:id error:", err.message);
    res.status(500).json({ error: "Failed to delete production" });
  }
});

/* ======================================================
   💰 ADD SALE
====================================================== */
router.post("/sales", async (req, res) => {
  try {
    const { blockSize, quantity, customer } = req.body;
    if (!blockSize || !quantity)
      return res.status(400).json({ error: "Missing fields" });

    const block = await Block.findOne({ size: blockSize });
    if (!block)
      return res.status(400).json({ error: "Block type not found" });

    if (block.inStock < quantity)
      return res.status(400).json({ error: "Not enough stock" });

    block.sold += Number(quantity);
    block.inStock -= Number(quantity);
    await block.save();

    const sale = await Sales.create({ blockSize, quantity, customer });
    res.json({ message: "✅ Sale recorded successfully", sale });
  } catch (err) {
    console.error("POST /sales error:", err.message);
    res.status(500).json({ error: "Failed to record sale" });
  }
});

/* ======================================================
   📜 GET ALL SALES
====================================================== */
router.get("/sales", async (req, res) => {
  try {
    const sales = await Sales.find().sort({ date: -1 });
    res.json(sales);
  } catch (err) {
    console.error("GET /sales error:", err.message);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

/* ======================================================
   ✏️ UPDATE SALE
====================================================== */
router.put("/sales/:id", async (req, res) => {
  try {
    const { blockSize, quantity, customer } = req.body;
    const sale = await Sales.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // Revert old sale effect
    const oldBlock = await Block.findOne({ size: sale.blockSize });
    if (oldBlock) {
      oldBlock.sold -= sale.quantity;
      oldBlock.inStock += sale.quantity;
      await oldBlock.save();
    }

    // Apply new sale effect
    const newBlock = await Block.findOne({ size: blockSize });
    if (!newBlock)
      return res.status(400).json({ error: "New block size not found" });

    if (newBlock.inStock < quantity)
      return res.status(400).json({ error: "Not enough stock for update" });

    newBlock.sold += Number(quantity);
    newBlock.inStock -= Number(quantity);
    await newBlock.save();

    sale.blockSize = blockSize;
    sale.quantity = Number(quantity);
    sale.customer = customer;
    await sale.save();

    res.json({ message: "✅ Sale updated successfully", sale });
  } catch (err) {
    console.error("PUT /sales/:id error:", err.message);
    res.status(500).json({ error: "Failed to update sale" });
  }
});

/* ======================================================
   🗑️ DELETE SALE
====================================================== */
router.delete("/sales/:id", async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const block = await Block.findOne({ size: sale.blockSize });
    if (block) {
      block.sold -= sale.quantity;
      block.inStock += sale.quantity;
      await block.save();
    }

    await sale.deleteOne();
    res.json({ message: "🗑️ Sale deleted successfully" });
  } catch (err) {
    console.error("DELETE /sales/:id error:", err.message);
    res.status(500).json({ error: "Failed to delete sale" });
  }
});

export default router;
