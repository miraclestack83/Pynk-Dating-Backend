const mongoose = require("mongoose");

const hostStorySchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    view: { type: Number, default: 0 },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Host" },
    expiration_date: { type: Date, expires: 0 }, //for story deleted after 24 hours
    isFake: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

hostStorySchema.index({ createdAt: 1 });
hostStorySchema.index({ hostId: 1 });
hostStorySchema.index({ isFake: 1 });

module.exports = mongoose.model("HostStory", hostStorySchema);
