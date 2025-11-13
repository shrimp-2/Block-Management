import mongoose from "mongoose";

const salesSchema = new mongoose.Schema({
  blockSize: { type: String, required: true },
  quantity: { type: Number, required: true },
  customer: { type: String },
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Sales", salesSchema);
