const mongoose = require("mongoose");

const giftCategorySchema = new mongoose.Schema(
  {
    name: String,
    image: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

giftCategorySchema.index({ createdAt: -1 });

module.exports = mongoose.model("GiftCategory", giftCategorySchema);
