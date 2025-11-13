import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
  size: { type: String, required: true },
  produced: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  inStock: { type: Number, default: 0 },
});

export default mongoose.model("Block", blockSchema);
