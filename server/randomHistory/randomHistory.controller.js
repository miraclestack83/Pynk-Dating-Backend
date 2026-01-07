const RandomHistory = require("./randomHistory.model");

//import model
const User = require("../user/model");
const Host = require("../host/host.model");
const Block = require("../block/block.model");

//mongoose
const mongoose = require("mongoose");

//get randomMatch history for user
exports.hostMatchHistory = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "User Id is required!!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const blockHost = await Block.find({ userId: userId }).distinct("hostId");

    const [user, randomHistory] = await Promise.all([
      User.findById(userId),

      RandomHistory.aggregate([
        { $match: { userId: userId } },
        { $match: { hostId: { $nin: blockHost } } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userId",
          },
        },
        {
          $lookup: {
            from: "hosts",
            let: { hostId: "$hostId" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$hostId"] } } }],
            as: "hostId",
          },
        },
        {
          $project: {
            user: { $first: "$userId" },
            host: { $first: "$hostId" },
            date: 1,
          },
        },
        {
          $project: {
            userName: "$user.name",
            hostName: "$host.name",
            hostId: "$host._id",
            coin: "$host.coin",
            hostImage: "$host.image",
            profileImage: "$host.profileImage",
            hostCountry: "$host.country",
            hostAge: "$host.age",
            hostGender: "$host.gender",
            isOnline: "$host.isOnline",
            callCharge: "$host.callCharge",
            date: 1,
          },
        },
        { $addFields: { sortDate: { $toDate: "$date" } } },
        { $sort: { sortDate: -1 } },
      ]),
    ]);

    if (!user) {
      return res.status(200).json({ status: "false", message: "User does not found." });
    }

    if (randomHistory.length === 0) {
      return res.status(200).json({ status: false, message: "No data found!!" });
    } else {
      return res.status(200).json({ status: true, message: "success", data: randomHistory });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//get randomMatch history for host
exports.userMatchHistory = async (req, res) => {
  try {
    if (!req.query.hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required!!" });
    }

    const hostId = new mongoose.Types.ObjectId(req.query.hostId);
    const blockUser = await Block.find({ hostId: hostId }).distinct("userId");

    const [host, randomHistory] = await Promise.all([
      Host.findById(hostId),

      RandomHistory.aggregate([
        {
          $match: {
            hostId: hostId,
          },
        },
        { $match: { userId: { $nin: blockUser } } },
        {
          $lookup: {
            from: "users",
            let: { userId: "$userId" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$userId"] } } }],
            as: "userId",
          },
        },
        {
          $lookup: {
            from: "hosts",
            localField: "hostId",
            foreignField: "_id",
            as: "hostId",
          },
        },
        {
          $project: {
            user: { $first: "$userId" },
            host: { $first: "$hostId" },
            date: 1,
          },
        },
        {
          $project: {
            userName: "$user.name",
            userImage: "$user.image",
            userGender: "$user.gender",
            userId: "$user._id",
            coin: "$user.coin",
            userCountry: "$user.country",
            userAge: "$user.age",
            isOnline: "$user.isOnline",
            hostName: "$host.name",
            date: 1,
          },
        },
        { $addFields: { sortDate: { $toDate: "$date" } } },
        { $sort: { sortDate: -1 } },
      ]),
    ]);

    if (!host) {
      return res.status(200).json({ status: "false", message: "Host does not exist." });
    }

    if (randomHistory.length === 0) {
      return res.status(200).json({ status: false, message: "No data found." });
    } else {
      return res.status(200).json({ status: true, message: "success", data: randomHistory });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};
