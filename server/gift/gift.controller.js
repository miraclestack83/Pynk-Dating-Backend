const Gift = require("./gift.model");
const Category = require("../giftCategory/giftCategory.model");

//fs
const fs = require("fs");

//mongoose
const mongoose = require("mongoose");

//deleteFile
const { deleteFiles, deleteFile } = require("../../util/deleteFile");

//Create Gift
exports.store = async (req, res) => {
  try {
    if (!req.body.coin || !req.files || !req.body.category) {
      if (req.files) deleteFiles(req.files);
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(200).json({ status: false, message: "Category does not Exist!" });
    }

    const giftPromises = req.files.map((gift) => {
      const newGift = new Gift({
        image: gift.path,
        coin: req.body.coin,
        category: category._id,
        platFormType: req.body.platFormType,
        type: gift.mimetype === "image/gif" ? 1 : 0,
      });
      return newGift.save();
    });

    const gifts = await Promise.all(giftPromises);

    const populatedGifts = await Promise.all(gifts.map((gift) => Gift.findById(gift._id).populate("category", "name")));

    return res.status(200).json({
      status: true,
      message: "Success",
      gift: populatedGifts,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//Get all gift for backend
exports.index = async (req, res) => {
  try {
    const category = await Category.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $lookup: {
          from: "gifts",
          localField: "_id",
          foreignField: "category",
          as: "gift",
        },
      },
    ]);

    if (!category) {
      return res.status(200).json({ status: false, message: "No data found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Success!!",
      gift: category,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//Get Category Wise Gift for app
exports.CategoryWiseGiftApp = async (req, res) => {
  try {
    if (!req.query.categoryId) {
      return res.status(200).json({ status: false, message: "Category Is Required!!" });
    }

    const categoryId = new mongoose.Types.ObjectId(req.query.categoryId);

    const [category, gift] = await Promise.all([
      Category.findOne({ _id: categoryId, isActive: true }),
      Gift.aggregate([
        {
          $match: {
            category: { $eq: categoryId },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]),
    ]);

    if (!category) {
      return res.status(200).json({ status: false, message: "Category Done Not Exist!" });
    }

    if (!gift) {
      return res.status(200).json({ status: false, message: "No data found!!" });
    }

    return res.status(200).json({
      status: true,
      message: "Success!!",
      gift,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//Get Category Wise Gift For Admin Penal
exports.CategoryWiseGift = async (req, res) => {
  try {
    if (!req.query.categoryId) {
      return res.status(200).json({ status: false, message: "Category Is Required" });
    }

    const categoryId = new mongoose.Types.ObjectId(req.query.categoryId);

    const [category, gift] = await Promise.all([
      [
        Category.findOne({ _id: categoryId, isActive: true }),

        Gift.aggregate([
          {
            $match: {
              category: { $eq: categoryId },
            },
          },
          {
            $sort: { createdAt: -1 },
          },
        ]),
      ],
    ]);

    if (!category) {
      return res.status(200).json({ status: false, message: "Category Done Not Exist!" });
    }

    if (!gift) {
      return res.status(200).json({ status: false, message: "Data Is Not Found" });
    }

    return res.status(200).json({
      status: true,
      message: "Success...!",
      categoryName: category.name,
      gift,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//Update Gift
exports.update = async (req, res) => {
  try {
    const gift = await Gift.findById(req.query.giftId);
    if (!gift) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "Gift does not Exist!" });
    }

    if (req.file) {
      if (fs.existsSync(gift.image)) {
        fs.unlinkSync(gift.image);
      }

      gift.type = req.file.mimetype === "image/gif" ? 1 : 0;
      gift.image = req.file.path;
    }

    gift.coin = req.body.coin ? req.body.coin : gift.coin;
    gift.platFormType = req.body.platFormType ? req.body.platFormType : gift.platFormType;
    gift.category = req.body.category ? req.body.category : gift.category;
    await gift.save();

    // const data = await Gift.findById(gift._id).populate("category", "name");

    return res.status(200).json({ status: true, message: "Update Success...!", gift: gift });
  } catch (error) {
    console.log(error);
    deleteFile(req.file);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//delete gift
exports.destroy = async (req, res) => {
  try {
    const gift = await Gift.findById(req.query.giftId);
    if (!gift) {
      return res.status(200).json({ status: false, message: "Gift does not exist!!" });
    }

    if (fs.existsSync(gift.image)) {
      fs.unlinkSync(gift.image);
    }

    await gift.deleteOne();

    return res.status(200).json({ status: true, message: "data deleted successfully!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};
