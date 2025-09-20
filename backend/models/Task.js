const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, default: "General" },
    duration: { type: Number, default: 0 },
    wasted: { type: Number, default: 0 },
    learned: { type: Number, default: 0 },
    day: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, default: "pending" },
    notes: { type: String },
    startTime: { type: String }, // HH:MM
    endTime: { type: String }, // HH:MM
    isOffice: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
