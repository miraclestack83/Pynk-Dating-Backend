const Redeem = require("./redeem.model");
const User = require("../user/model");
const Host = require("../host/host.model");
const History = require("../history/history.model");

//day.js
const dayjs = require("dayjs");

//FCM
var FCM = require("fcm-node");
var { SERVER_KEY } = require("../../config");
var fcm = new FCM(SERVER_KEY);

// get redeem list [frontend]
exports.index = async (req, res) => {
  try {
    if (!req.query.type) {
      return res.status(200).json({ status: false, message: "Type is Required!" });
    }

    let redeem;
    if (req.query.type.trim() === "pending") {
      redeem = await Redeem.find({ status: 0 }).populate("hostId").sort({ createdAt: -1 });
    }

    if (req.query.type.trim() === "solved") {
      redeem = await Redeem.find({ status: 1 }).populate("hostId", "name image country").sort({ createdAt: -1 });
    }

    if (req.query.type.trim() === "decline") {
      redeem = await Redeem.find({ status: 2 }).populate("hostId", "name image country").sort({ createdAt: -1 });
    }

    if (!redeem) {
      return res.status(200).json({ status: false, message: "No data Found!" });
    }

    return res.status(200).json({ status: true, message: "Success!!", redeem });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get user redeem list
exports.userRedeem = async (req, res) => {
  try {
    const host = await Host.findById(req.query.hostId);
    if (!host) {
      return res.status(200).json({ status: false, message: "host does not Exist!" });
    }

    let dateFilterQuery = {};

    if (req.query.startDate && req.query.endDate) {
      sDate = req.query.startDate + "T00:00:00.000Z";
      eDate = req.query.endDate + "T00:00:00.000Z";

      const today = new Date(eDate);
      const tomorrow = new Date();

      dateFilterQuery = {
        createdAt: {
          $gte: new Date(sDate),
          $lte: new Date(tomorrow.setDate(today.getDate() + 1)),
        },
      };
    }

    const redeem = await Redeem.aggregate([
      {
        $match: { hostId: { $eq: host._id } },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $project: {
          _id: 1,
          status: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", 1] }, then: "Accepted" },
                { case: { $eq: ["$status", 2] }, then: "Declined" },
              ],
              default: "Pending",
            },
          },
          hostId: 1,
          description: 1,
          coin: 1,
          paymentGateway: 1,
          date: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    if (!redeem) {
      return res.status(200).json({ status: false, message: "Data not Found!" });
    }

    let now = dayjs();
    const redeemList = redeem.map((data) => ({
      ...data,
      time:
        now.diff(data.date, "minute") <= 60 && now.diff(data.date, "minute") >= 0
          ? now.diff(data.date, "minute") + " minutes ago"
          : now.diff(data.date, "hour") >= 24
          ? dayjs(data.date).format("DD MMM, YYYY")
          : now.diff(data.date, "hour") + " hour ago",
    }));

    return res.status(200).json({
      status: redeemList.length > 0 ? true : false,
      message: redeemList.length > 0 ? "Success!" : "No Data Found",
      redeem: redeemList.length > 0 ? redeemList : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get hostDebit redeem list
exports.hostDebit = async (req, res) => {
  try {
    const host = await Host.findById(req.query.hostId);
    if (!host) {
      return res.status(200).json({ status: false, message: "host does not Exist!" });
    }

    let dateFilterQuery = {};

    if (req.query.startDate && req.query.endDate) {
      sDate = req.query.startDate + "T00:00:00.000Z";
      eDate = req.query.endDate + "T00:00:00.000Z";

      const today = new Date(eDate);
      const tomorrow = new Date();

      dateFilterQuery = {
        createdAt: {
          $gte: new Date(sDate),
          $lte: new Date(tomorrow.setDate(today.getDate() + 1)),
        },
      };
    }

    const redeem = await Redeem.aggregate([
      {
        $match: { $and: [{ hostId: { $eq: host._id }, status: { $eq: 1 } }] },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $project: {
          _id: 1,
          status: 1,
          hostId: 1,
          description: 1,
          coin: 1,
          paymentGateway: 1,
          date: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    if (!redeem) {
      return res.status(200).json({ status: false, message: "Data not Found!" });
    }

    let now = dayjs();
    const redeemList = redeem.map((data) => ({
      ...data,
      time:
        now.diff(data.date, "minute") <= 60 && now.diff(data.date, "minute") >= 0
          ? now.diff(data.date, "minute") + " minutes ago"
          : now.diff(data.date, "hour") >= 24
          ? dayjs(data.date).format("DD MMM, YYYY")
          : now.diff(data.date, "hour") + " hour ago",
    }));

    return res.status(200).json({
      status: redeemList.length > 0 ? true : false,
      message: redeemList.length > 0 ? "Success!" : "No Data Found",
      redeem: redeemList.length > 0 ? redeemList : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// create redeem request
exports.store = async (req, res) => {
  try {
    if (!req.body.hostId || !req.body.paymentGateway || !req.body.coin) {
      return res.status(200).json({ status: false, message: "Invalid Details!!" });
    }

    const host = await Host.findById(req.body.hostId);
    if (!host) {
      return res.status(200).json({ status: false, message: "Host does not Exist!" });
    }

    let payload;
    if (host) {
      payload = {
        to: host.fcm_token,
        notification: {
          title: "Your redeem request has been successfully sent!!",
        },
      };
    }

    if (req.body.coin > host.coin) {
      return res.status(200).json({ status: false, message: "Not Enough Coin for CaseOut!!" });
    }

    const redeem = new Redeem();
    redeem.hostId = host._id;
    redeem.description = req.body.description.trim();
    redeem.coin = req.body.coin;
    redeem.paymentGateway = req.body.paymentGateway;
    redeem.date = new Date().toLocaleString();

    host.coin -= req.body.coin;
    host.withdrawalCoin += req.body.coin;

    await Promise.all([redeem.save(), host.save()]);

    return res.status(200).json({
      status: true,
      message: "Withdrawal Request Successfully Send!!",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// accept or decline the redeem request
exports.update = async (req, res) => {
  try {
    const redeem = await Redeem.findById(req.params.redeemId);

    const host = await Host.findById(redeem.hostId);
    if (!host) {
      return res.status(200).json({ status: false, message: "host does not found." });
    }

    let payload;
    if (req.query.type === "accept") {
      if (redeem.status == 1) {
        return res.status(200).json({ status: false, message: "Withdrawal request already accepted by the admin." });
      }

      if (redeem.status == 2) {
        return res.status(200).json({ status: false, message: "Withdrawal request already declined by the admin." });
      }

      redeem.status = 1;
      host.withdrawalCoin -= redeem.coin;

      const outgoing = new History();
      outgoing.hostId = host._id;
      outgoing.coin = redeem.coin;
      outgoing.type = 7;
      outgoing.isIncome = false;
      outgoing.date = new Date().toLocaleString();

      await Promise.all([host.save(), outgoing.save(), redeem.save()]);

      payload = {
        to: host?.fcm_token,
        notification: {
          title: "Your redeem request has been accepted.",
        },
        data: {
          data: {},
          type: "REDEEM",
        },
      };
    } else {
      if (redeem.status == 1) {
        return res.status(200).json({ status: false, message: "Withdrawal request already accepted by the admin." });
      }

      if (redeem.status == 2) {
        return res.status(200).json({ status: false, message: "Withdrawal request already declined by the admin." });
      }

      redeem.status = 2;

      host.withdrawalCoin -= redeem.coin;
      host.coin += redeem.coin;

      await Promise.all([host.save(), redeem.save()]);

      payload = {
        to: host.fcm_token,
        notification: {
          title: "Your redeem request has been declined!!",
        },
        data: {
          data: {},
          type: "REDEEM",
        },
      };
    }

    res.status(200).json({ status: true, message: "Success", redeem });

    if (host && !host.isBlock) {
      await fcm.send(payload, function (err, response) {
        if (err) {
          console.log("Something has gone wrong!", err);
        } else {
          console.log("Successfully sent with response: " + response);
        }
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
