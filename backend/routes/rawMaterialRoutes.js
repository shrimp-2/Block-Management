import express from "express";
import RawMaterial from "../models/RawMaterial.js";
import RawMaterialLog from "../models/RawMaterialLog.js";

const router = express.Router();

/* Seed defaults if empty */
const DEFAULT_MATERIALS = [
  { name: "lime", unit: "kg" },
  { name: "sand", unit: "tip" },
  { name: "gypson powder", unit: "kg" },
  { name: "aluminium powder", unit: "kg" },
  { name: "soluble oil", unit: "liter" },
];

async function ensureSeed() {
  const count = await RawMaterial.countDocuments();
  if (count === 0) {
    for (const m of DEFAULT_MATERIALS) {
      try {
        await RawMaterial.create({
          name: m.name,
          unit: m.unit,
          received: 0,
          used: 0,
          inStock: 0,
        });
      } catch (e) {
        // ignore duplicates if any race condition
      }
    }
  }
}

/* GET /api/raw-materials - list materials */
router.get("/", async (req, res) => {
  try {
    await ensureSeed();
    const mats = await RawMaterial.find().sort({ name: 1 });
    res.json(mats);
  } catch (err) {
    console.error("GET /api/raw-materials error:", err);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

/* GET /api/raw-materials/logs - list logs */
router.get("/logs", async (req, res) => {
  try {
    const logs = await RawMaterialLog.find().sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    console.error("GET /api/raw-materials/logs error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/* POST /api/raw-materials - add new material */
router.post("/", async (req, res) => {
  try {
    const { name, unit, inStock } = req.body;
    if (!name || !unit) return res.status(400).json({ error: "Name and unit required" });

    const existing = await RawMaterial.findOne({ name });
    if (existing) return res.status(400).json({ error: "Material already exists" });

    const mat = await RawMaterial.create({
      name,
      unit,
      received: Number(inStock) || 0,
      inStock: Number(inStock) || 0,
    });

    res.json({ message: "✅ Material added successfully", material: mat });
  } catch (err) {
    console.error("POST /api/raw-materials error:", err);
    res.status(500).json({ error: "Failed to add material" });
  }
});

/* POST /api/raw-materials/receive - IN transaction */
router.post("/receive", async (req, res) => {
  try {
    const { materialName, quantity, unit, notes } = req.body;
    if (!materialName || quantity == null) return res.status(400).json({ error: "Missing fields" });

    let mat = await RawMaterial.findOne({ name: materialName });
    if (!mat) {
      mat = await RawMaterial.create({
        name: materialName,
        unit: unit || "unit",
        received: 0,
        used: 0,
        inStock: 0,
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Quantity must be a positive number" });

    mat.received += qty;
    mat.inStock += qty;
    mat.createdAt = mat.createdAt || new Date();
    await mat.save();

    const log = await RawMaterialLog.create({
      materialName: mat.name,
      type: "in",
      quantity: qty,
      unit: mat.unit,
      notes,
    });

    res.json({ message: "✅ Stock received", material: mat, log });
  } catch (err) {
    console.error("POST /receive error:", err);
    res.status(500).json({ error: "Failed to receive stock" });
  }
});

/* POST /api/raw-materials/use - OUT transaction */
router.post("/use", async (req, res) => {
  try {
    const { materialName, quantity, notes } = req.body;
    if (!materialName || quantity == null) return res.status(400).json({ error: "Missing fields" });

    const mat = await RawMaterial.findOne({ name: materialName });
    if (!mat) return res.status(400).json({ error: "Material not found" });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Quantity must be a positive number" });

    if (mat.inStock < qty) return res.status(400).json({ error: "Not enough stock" });

    mat.used += qty;
    mat.inStock -= qty;
    await mat.save();

    const log = await RawMaterialLog.create({
      materialName: mat.name,
      type: "out",
      quantity: qty,
      unit: mat.unit,
      notes,
    });

    res.json({ message: "✅ Material used", material: mat, log });
  } catch (err) {
    console.error("POST /use error:", err);
    res.status(500).json({ error: "Failed to record usage" });
  }
});

/* PUT /api/raw-materials/logs/:id - update a log (revert old effect, apply new) */
router.put("/logs/:id", async (req, res) => {
  try {
    const { materialName, type, quantity, notes } = req.body;
    if (!materialName || type == null || quantity == null) return res.status(400).json({ error: "Missing fields" });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Quantity must be positive" });

    const log = await RawMaterialLog.findById(req.params.id);
    if (!log) return res.status(404).json({ error: "Log not found" });

    // Revert old effect
    const oldMat = await RawMaterial.findOne({ name: log.materialName });
    if (oldMat) {
      if (log.type === "in") {
        oldMat.received = Math.max((oldMat.received || 0) - log.quantity, 0);
        oldMat.inStock = Math.max((oldMat.inStock || 0) - log.quantity, 0);
      } else {
        oldMat.used = Math.max((oldMat.used || 0) - log.quantity, 0);
        oldMat.inStock = (oldMat.inStock || 0) + log.quantity;
      }
      await oldMat.save();
    }

    // Ensure new material exists
    let newMat = await RawMaterial.findOne({ name: materialName });
    if (!newMat) {
      newMat = await RawMaterial.create({ name: materialName, unit: log.unit || "unit", received: 0, used: 0, inStock: 0 });
    }

    // Apply new effect safely
    if (type === "in") {
      newMat.received += qty;
      newMat.inStock += qty;
    } else {
      if (newMat.inStock < qty) {
        // restore old effect before returning error
        if (oldMat) {
          if (log.type === "in") {
            oldMat.received += log.quantity;
            oldMat.inStock += log.quantity;
          } else {
            oldMat.used += log.quantity;
            oldMat.inStock -= log.quantity;
          }
          await oldMat.save();
        }
        return res.status(400).json({ error: "Not enough stock to update log" });
      }
      newMat.used += qty;
      newMat.inStock -= qty;
    }
    await newMat.save();

    // Update log
    log.materialName = newMat.name;
    log.type = type;
    log.quantity = qty;
    log.unit = newMat.unit;
    log.notes = notes;
    log.date = new Date();
    await log.save();

    res.json({ message: "✅ Log updated", log, material: newMat });
  } catch (err) {
    console.error("PUT /logs/:id error:", err);
    res.status(500).json({ error: "Failed to update log" });
  }
});

/* DELETE /api/raw-materials/logs/:id - delete log and revert effect */
router.delete("/logs/:id", async (req, res) => {
  try {
    const log = await RawMaterialLog.findById(req.params.id);
    if (!log) return res.status(404).json({ error: "Log not found" });

    const mat = await RawMaterial.findOne({ name: log.materialName });
    if (mat) {
      if (log.type === "in") {
        mat.received = Math.max((mat.received || 0) - log.quantity, 0);
        mat.inStock = Math.max((mat.inStock || 0) - log.quantity, 0);
      } else {
        mat.used = Math.max((mat.used || 0) - log.quantity, 0);
        mat.inStock += log.quantity;
      }
      await mat.save();
    }

    await log.deleteOne();
    res.json({ message: "🗑️ Log deleted successfully" });
  } catch (err) {
    console.error("DELETE /logs/:id error:", err);
    res.status(500).json({ error: "Failed to delete log" });
  }
});

/* PUT /api/raw-materials/:id - update material meta and update logs name */
router.put("/:id", async (req, res) => {
  try {
    const { name, unit } = req.body;
    const mat = await RawMaterial.findById(req.params.id);
    if (!mat) return res.status(404).json({ error: "Material not found" });

    const oldName = mat.name;
    if (name && name !== oldName) {
      mat.name = name;
      await RawMaterialLog.updateMany({ materialName: oldName }, { $set: { materialName: name } });
    }
    if (unit) mat.unit = unit;
    await mat.save();

    res.json({ message: "✅ Material updated", material: mat });
  } catch (err) {
    console.error("PUT /:id error:", err);
    res.status(500).json({ error: "Failed to update material" });
  }
});

/* DELETE /api/raw-materials/:id - delete material if no logs */
router.delete("/:id", async (req, res) => {
  try {
    const mat = await RawMaterial.findById(req.params.id);
    if (!mat) return res.status(404).json({ error: "Material not found" });

    const logsCount = await RawMaterialLog.countDocuments({ materialName: mat.name });
    if (logsCount > 0) return res.status(400).json({ error: "Cannot delete material with existing logs" });

    await mat.deleteOne();
    res.json({ message: "🗑️ Material deleted" });
  } catch (err) {
    console.error("DELETE /:id error:", err);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

export default router;
