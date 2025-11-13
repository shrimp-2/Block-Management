import mongoose from "mongoose";

const rawMaterialLogSchema = new mongoose.Schema({
  materialName: { type: String, required: true }, // store name for readability
  type: { type: String, enum: ["in", "out"], required: true }, // "in" = received, "out" = used
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
});

const RawMaterialLog = mongoose.model("RawMaterialLog", rawMaterialLogSchema);
export default RawMaterialLog;
