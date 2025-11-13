import mongoose from "mongoose";

const productionSchema = new mongoose.Schema({
  blockSize: { type: String, required: true },
  quantity: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Production", productionSchema);
