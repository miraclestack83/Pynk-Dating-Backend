const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Flirtzy Host" },
    bio: { type: String, default: "I am Flirtzy Host 🤩🤩" },
    gender: String,
    identity: String,
    age: { type: Number, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    uniqueID: String,
    image: { type: String, default: null },
    video: { type: String, default: null },
    isAccepted: { type: Boolean, default: false },
    date: String,
    email: String,
    country: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

requestSchema.index({ userId: 1 });

module.exports = mongoose.model("Request", requestSchema);
