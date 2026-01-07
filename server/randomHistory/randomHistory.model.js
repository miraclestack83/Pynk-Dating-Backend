const mongoose = require("mongoose");

const randomHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Host" },
    date: String,
  },
  { timestamps: true, versionKey: false }
);

randomHistorySchema.index({ userId: 1 });
randomHistorySchema.index({ hostId: 1 });

module.exports = mongoose.model("RandomHistory", randomHistorySchema);
