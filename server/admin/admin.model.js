const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Admin" },
    email: String,
    password: String,
    purchaseCode: { type: String, default: null },
    image: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Admin", adminSchema);
