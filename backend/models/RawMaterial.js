import mongoose from "mongoose";

const rawMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true },
  received: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  inStock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const RawMaterial = mongoose.model("RawMaterial", rawMaterialSchema);
export default RawMaterial;
