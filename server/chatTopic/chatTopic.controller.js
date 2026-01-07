const ChatTopic = require("./chatTopic.model");
const User = require("../user/model");
const Host = require("../host/host.model");
const Block = require("../block/block.model");
const Chat = require("../chat/chat.model");
const Setting = require("../setting/setting.model");

const dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc");
var timezone = require("dayjs/plugin/timezone");
var advanced = require("dayjs/plugin/advancedFormat");

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(advanced);

//arraySort
const arraySort = require("array-sort");

//mongoose
const mongoose = require("mongoose");

//Array of random dating messages
const datingMessages = [
  "Hey there! How's your day going?",
  "If we were to go on a date, where would you take me?",
  "Hey, do you believe in love at first swipe?",
  "Are you a bank loan? Because you have my interest!",
  "Do you have a name or can I call you mine?",
  "Excuse me, but I think the stars have aligned and brought us together.",
  "Are you made of copper and tellurium? Because you’re Cu-Te!",
  "Are you a camera? Every time I look at you, I smile 😉.",
  "Is your name Google? Because you have everything I’ve been searching for.",
  "Do you believe in love at first sight, or should I walk by again?",
  "Is there a magnet in your pocket? Because I’m attracted to you.",
  "Do you have a map? I keep getting lost in your eyes.",
  "Not here for games, just looking for someone genuine.",
  "Looking for someone to explore the city with!",
  "Let's make our own romantic comedy!",
];

//Create Chat topic
exports.store = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.hostId) {
      return res
        .status(200)
        .json({ status: false, message: "Invalid details!!" });
    }

    const userId = new mongoose.Types.ObjectId(req.body.userId);
    const hostId = new mongoose.Types.ObjectId(req.body.hostId);

    const [user, host, chatTopic] = await Promise.all([
      User.findById(userId),
      Host.findById(hostId),
      ChatTopic.findOne({
        $and: [{ userId: userId }, { hostId: hostId }],
      }),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: "false", message: "User does not Exist!!" });
    }

    if (!host) {
      return res
        .status(200)
        .json({ status: false, message: "Host does not Exist!!" });
    }

    if (chatTopic) {
      return res
        .status(200)
        .json({ status: true, message: "Success", chatTopic });
    }

    const newChatTopic = new ChatTopic();

    newChatTopic.userId = user._id;
    newChatTopic.hostId = host._id;

    await newChatTopic.save();

    return res.status(200).json({
      status: true,
      message: "Success",
      chatTopic: newChatTopic,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//Get Thumb List of chat
exports.getChatThumbList = async (req, res) => {
  try {
    if (!req.query.type || !req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "Type and UserId must be required!!" });
    }

    let user, matchQuery, lookupMatch, unwindMatch, projectMatch, size;

    var projectQuery = {
      _id: 0,
      //total: 1,
      topic: "$list.topic",
      message: "$list.message",
      date: "$list.date",
      chatDate: "$list.chatDate",
      createdAt: "$list.createdAt",
      name: "$list.name",
      image: "$list.image",
      isFake: "$list.isFake",
      count: "$list.count",
    };

    if (req.query.type === "user") {
      projectQuery["id"] = "$list.hostId";
    } else {
      projectQuery["id"] = "$list.userId";
    }

    if (req.query.type === "user") {
      const userId = new mongoose.Types.ObjectId(req.query.userId);

      user = await User.findById(userId);

      const blockHost = await Block.find({ userId: user._id }).distinct(
        "hostId"
      );

      size = await ChatTopic.find({
        userId: user._id,
        hostId: { $nin: blockHost },
      }).countDocuments();

      if (!user) {
        return res
          .status(200)
          .json({ status: false, message: "User does not found." });
      }

      matchQuery = { userId: user._id };

      lookupMatch = {
        $lookup: {
          from: "hosts",
          as: "host",
          let: { hostId: "$hostId" }, //$hostId is field of chatTopic table
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$hostId"], //$_id is field of host table
                },
              },
            },
            {
              $match: {
                $expr: { $not: { $in: ["$_id", blockHost] } },
              },
            },
            {
              $project: {
                name: 1,
                image: 1,
                album: 1,
                country: 1,
                bio: 1,
                isOnline: 1,
                video: 1,
                videoType: 1,
              },
            },
          ],
        },
      };

      unwindMatch = {
        $unwind: {
          path: "$host",
          preserveNullAndEmptyArrays: false,
        },
      };

      projectMatch = {
        $project: {
          _id: 0,
          topic: "$_id",
          message: "$chat.message",
          date: "$chat.date",
          createdAt: "$chat.createdAt",
          chatDate: {
            $dateFromString: {
              dateString: "$chat.date",
            },
          },
          hostId: "$host._id",
          name: "$host.name",
          image: "$host.image",
          isFake: "$host.isFake",
          video: "$host.video",
          videoType: "$host.videoType",
          count: { $size: "$allChat" },
        },
      };
    } else if (req.query.type === "host") {
      const hostId = new mongoose.Types.ObjectId(req.query.userId);

      user = await Host.findById(hostId);

      const blockUser = await Block.find({ hostId: user._id }).distinct(
        "userId"
      );

      size = await ChatTopic.find({
        hostId: user._id,
        userId: { $nin: blockUser },
      }).countDocuments();

      if (!user) {
        return res
          .status(200)
          .json({ status: false, message: "Host does not found." });
      }

      matchQuery = { hostId: user._id };

      lookupMatch = {
        $lookup: {
          from: "users",
          as: "user",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$userId"],
                },
              },
            },
            {
              $match: {
                $expr: { $not: { $in: ["$_id", blockUser] } },
              },
            },
            {
              $project: {
                name: 1,
                username: 1,
                image: 1,
                country: 1,
                bio: 1,
                isOnline: 1,
              },
            },
          ],
        },
      };

      unwindMatch = {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      };

      projectMatch = {
        $project: {
          _id: 0,
          topic: "$_id",
          message: "$chat.message",
          date: "$chat.date",
          createdAt: "$chat.createdAt",
          chatDate: {
            $dateFromString: {
              dateString: "$chat.date",
            },
          },
          userId: "$user._id",
          name: "$user.name",
          username: "$user.username",
          image: "$user.image",
          count: { $size: "$allChat" },
        },
      };
    }

    const [setting, list, fakeChatList] = await Promise.all([
      Setting.findOne().sort({ createdAt: -1 }),

      ChatTopic.aggregate([
        {
          $match: matchQuery,
        },
        lookupMatch,
        unwindMatch,
        {
          $lookup: {
            from: "chats",
            localField: "chat",
            foreignField: "_id",
            as: "chat",
          },
        },
        {
          $unwind: {
            path: "$chat",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "chats",
            let: { topic: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$topicId", "$$topic"] }, // $topicId is field of chat table
                      { $eq: ["$isRead", false] },
                    ],
                  },
                },
              },
            ],
            as: "allChat",
          },
        },
        projectMatch,
        {
          $group: {
            _id: null,
            total: { $sum: "$count" },
            list: { $push: "$$ROOT" },
          },
        },
        { $unwind: { path: "$list", preserveNullAndEmptyArrays: false } },
        { $project: projectQuery },
        { $sort: { chatDate: -1 } },
        {
          $facet: {
            chatList: [
              { $skip: req.query.start ? parseInt(req.query.start) : 0 },
              { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
            ],
          },
        },
      ]),

      Host.aggregate([
        {
          $match: {
            $and: [{ isFake: true }],
          },
        },
        {
          $addFields: {
            count: {
              $floor: {
                $add: [
                  30,
                  {
                    $multiply: [
                      {
                        $subtract: [50, 6],
                      },
                      {
                        $rand: {},
                      },
                    ],
                  },
                ],
              },
            },
            topic: "",
            message: {
              $arrayElemAt: [
                datingMessages,
                Math.floor(Math.random() * datingMessages.length),
              ],
            },
            date: "",
            chatDate: "",
            time: "",
          },
        },
        {
          $project: {
            _id: 0,
            id: "$_id",
            count: 1,
            topic: 1,
            message: 1,
            time: 1,
            date: 1,
            chatDate: 1,
            createdAt: 1,
            name: 1,
            image: 1,
            isFake: 1,
            video: 1,
            videoType: 1,
          },
        },
      ]),
    ]);

    let now = dayjs().tz("Australia/Sydney");
    const chatList = list[0].chatList.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(data.createdAt, "minute") <= 60 &&
            now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    if (!setting?.isFake) {
      console.log("real");

      return res.status(200).json({
        status: true,
        message: "Success",
        chatList,
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "Success",
        chatList: [...chatList, ...fakeChatList],
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//search for user
exports.userSearch = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.name) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    var response = [];

    let now = dayjs();
    const start = req.body.start ? parseInt(req.body.start) : 0;
    const limit = req.body.limit ? parseInt(req.body.limit) : 20;

    const user = await User.findById(req.body.userId);
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found!!" });
    }

    if (req.body.name) {
      req.body.name === "@#"
        ? (response = await Host.find({ isBlock: false })
            .skip(start)
            .limit(limit))
        : (response = await Host.find({
            name: { $regex: req.body.name, $options: "i" },
            isBlock: false,
          })
            .skip(start)
            .limit(limit));

      let data = [];
      for (let i = 0; i < response.length; i++) {
        let chatTopic = await ChatTopic.findOne({
          hostId: response[i]._id,
          userId: req.body.userId,
        });

        if (chatTopic) {
          let chat = await Chat.findOne({
            topicId: chatTopic._id,
          }).sort({ createdAt: -1 });
          console.log("---", chat);

          let time = "";

          if (chat) {
            time =
              now.diff(chat.createdAt, "minute") <= 60 &&
              now.diff(chat.createdAt, "minute") >= 0
                ? now.diff(chat.createdAt, "minute") + " minutes ago"
                : now.diff(chat.createdAt, "hour") >= 24
                ? now.diff(chat.createdAt, "day") + " days ago"
                : now.diff(chat.createdAt, "hour") + " hours ago";
          }

          data.push({
            _id: response[i]._id,
            name: response[i].name,
            image: response[i].image,
            country: response[i].country,
            message: chat ? chat.message : response[i].bio,
            topicId: chat ? chat.topicId : "",
            time: time === "0 minutes ago" ? "now" : time,
            createdAt: chat ? chat.createdAt : "",
            count: chat?.isRead == false ? count + 1 : 0,
          });
        } else {
          data.push({
            _id: response[i]._id,
            name: response[i].name,
            image: response[i].image ? response[i].image : "",
            country: response[i].country,
            message: response[i].bio,
            topic: "",
            time: "New User",
            createdAt: "",
            count: 0,
          });
        }
      }

      const searchData = arraySort(data, "createdAt", { reverse: true });

      return res.status(200).json({
        status: true,
        message: "Success",
        data: searchData,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//search for host
exports.hostSearch = async (req, res) => {
  try {
    if (!req.body.hostId || !req.body.name) {
      return res.status(200).json({
        status: false,
        message: "Oops ! Invalid details!!",
      });
    }

    var response = [];
    let now = dayjs();

    const start = req.body.start ? parseInt(req.body.start) : 0;
    const limit = req.body.limit ? parseInt(req.body.limit) : 20;

    const host = await Host.findById(req.body.hostId);
    if (!host)
      return res
        .status(200)
        .json({ status: false, message: "Host does not found!!" });

    if (req.body.name) {
      req.body.name === "@#"
        ? (response = await User.find().skip(start).limit(limit))
        : (response = await User.find({
            name: { $regex: req.body.name, $options: "i" },
          })
            .skip(start)
            .limit(limit));

      let data = [];
      for (let i = 0; i < response.length; i++) {
        let chatTopic = await ChatTopic.findOne({
          userId: response[i]._id,
          hostId: req.body.hostId,
        });

        if (chatTopic) {
          let chat = await Chat.findOne({
            topicId: chatTopic._id,
          }).sort({ createdAt: -1 });

          let time = "";

          if (chat) {
            time =
              now.diff(chat.createdAt, "minute") <= 60 &&
              now.diff(chat.createdAt, "minute") >= 0
                ? now.diff(chat.createdAt, "minute") + " minutes ago"
                : now.diff(chat.createdAt, "hour") >= 24
                ? now.diff(chat.createdAt, "day") + " days ago"
                : now.diff(chat.createdAt, "hour") + " hours ago";
          }

          data.push({
            _id: response[i]._id,
            name: response[i].name,
            image: response[i].image,
            country: response[i].country,
            message: chat ? chat.message : "",
            topicId: chat ? chat.topicId : response[i].bio,
            time: time === "0 minutes ago" ? "now" : time,
            createdAt: chat ? chat.createdAt : "",
            count: chat?.isRead == false ? count + 1 : 0,
          });
        } else {
          data.push({
            _id: response[i]._id,
            name: response[i].name,
            image: response[i].image ? response[i].image : "",
            country: response[i].country,
            message: response[i].bio,
            topic: "",
            time: "New User",
            createdAt: "",
            count: 0,
          });
        }
      }

      const searchData = arraySort(data, "createdAt", { reverse: true });

      return res.status(200).json({
        status: true,
        message: "Success!!",
        data: searchData,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || "server error" });
  }
};
