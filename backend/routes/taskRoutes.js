const express = require("express");
const router = express.Router();
const Task = require("../models/Task");

// Create task
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    if (!body.title || !body.day) return res.status(400).json({ error: "Title and day required" });
    const task = new Task(body);
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks
router.get("/", async (req, res) => {
  try {
    const { day, start, end } = req.query;
    let filter = {};
    if (day) filter.day = day;
    else if (start && end) filter.day = { $gte: start, $lte: end };
    const tasks = await Task.find(filter).sort({ day: -1, createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put("/:id", async (req, res) => {
  try {
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
