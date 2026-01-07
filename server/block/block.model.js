const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Host" },
  type: String,
});

blockSchema.index({ userId: 1 });
blockSchema.index({ hostId: 1 });

module.exports = mongoose.model("Block", blockSchema);
