const mongoose = require("mongoose");

const viewStorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
    expiration_date: { type: Date, required: true, expires: 0 }, //for viewStory deleted after 24 hours
  },
  {
    timestamps: true,
  }
);

viewStorySchema.index({ userId: 1 });
viewStorySchema.index({ storyId: 1 });

module.exports = mongoose.model("ViewStory", viewStorySchema);
