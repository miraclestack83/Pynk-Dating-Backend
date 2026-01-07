const Chat = require("./chat.model");
const ChatTopic = require("../chatTopic/chatTopic.model");

const fs = require("fs");

//FCM node
var FCM = require("fcm-node");
var config = require("../../config");
var fcm = new FCM(config.SERVER_KEY);

//mongoose
const mongoose = require("mongoose");

//create chat [with image,video,audio]
exports.store = async (req, res) => {
  try {
    if (!req.body.topicId || !req.body.messageType || !req.body.senderId || !req.body.type) {
      return res.status(200).json({ status: false, message: "Invalid details!!" });
    }

    const chatTopic = await ChatTopic.findById(req.body.topicId).populate("hostId userId");
    if (!chatTopic) {
      return res.status(200).json({ status: false, message: "Topic not Exist!!" });
    }

    const chat = new Chat();

    chat.senderId = req.body.senderId;
    chat.type = req.body.type;
    chat.topicId = chatTopic._id;
    chat.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    if (req.body.messageType == 0) {
      chat.messageType = 0;
      chat.message = "📸 Image";
      if (req.files.image) {
        chat.image = config.baseURL + req.files.image[0].path;
      }
    } else if (req.body.messageType == 1) {
      chat.messageType = 1;
      chat.message = "📸 Video";
      if (req.files.video) {
        chat.video = config.baseURL + req.files.video[0].path;
      }
    } else if (req.body.messageType == 2) {
      chat.messageType = 2;
      chat.message = "🎤 Audio";
      if (req.files.audio) {
        chat.audio = config.baseURL + req.files.audio[0].path;
      }
    }

    chatTopic.chat = chat._id;

    await Promise.all([chat.save(), chatTopic.save()]);

    res.status(200).json({
      status: true,
      message: "Success",
      chat,
    });

    //notification related
    if (receiverUser && !receiverUser.isBlock) {
      const payload = {
        to: receiverUser.fcm_token,
        notification: {
          body: chat.message,
          title: senderUser.name,
        },
        data:
          type === "user"
            ? {
                topic: chatTopic._id,
                message: chat.message,
                date: chat.date,
                chatDate: chat.date,
                _id: senderUser._id,
                name: senderUser.name,
                username: senderUser.username,
                image: senderUser.image,
                country: senderUser.country,
                time: "Just Now",
                type: "MESSAGE",
              }
            : {
                topic: chatTopic._id,
                message: chat.message,
                date: chat.date,
                chatDate: chat.date,
                _id: senderUser._id,
                name: senderUser.name,
                image: senderUser.image,
                country: senderUser.country,
                time: "Just Now",
                type: "MESSAGE",
              },
      };
      await fcm.send(payload, function (err, response) {
        if (err) {
          console.log("Something has gone wrong!", err);
        } else {
          console.log("Successfully sent with response: ", response);
        }
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//get old chat
exports.getOldChat = async (req, res) => {
  try {
    if (!req.query.topicId) {
      return res.status(200).json({ status: false, message: "topicId is required!!" });
    }

    const topicId = new mongoose.Types.ObjectId(req.query.topicId);

    const [data, chat] = await Promise.all([
      Chat.updateMany(
        {
          $and: [{ topicId: topicId }, { isRead: false }],
        },
        { $set: { isRead: true } },
        { new: true }
      ),

      Chat.find({ topicId: topicId })
        .sort({ createdAt: -1 })
        .skip(req.query.start ? parseInt(req.query.start) : 0)
        .limit(req.query.limit ? parseInt(req.query.limit) : 100),
    ]);

    if (!chat) {
      return res.status(200).json({ status: false, message: "No data found." });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      chat,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//delete Chat
exports.deleteChat = async (req, res) => {
  try {
    if (!req.query.chatId) {
      return res.status(200).json({ status: false, message: "ChatId is required!!" });
    }

    const chat = await Chat.findById(req.query.chatId);
    if (!chat) {
      return res.status(200).json({ status: false, message: "Chat does not exist!!" });
    }

    const chatTopic = await ChatTopic.findById(chat.topicId);

    if (chat.messageType === 0) {
      if (fs.existsSync(chat.image)) {
        fs.unlinkSync(chat.image);
      }
    } else if (chat.messageType === 1) {
      if (fs.existsSync(chat.video)) {
        fs.unlinkSync(chat.video);
      }
    } else if (chat.messageType === 2) {
      if (fs.existsSync(chat.audio)) {
        fs.unlinkSync(chat.audio);
      }
    }

    await chat.deleteOne();

    if (chatTopic && chatTopic.chat.toString() === req.query.chatId.toString()) {
      const newChat = await Chat.findOne({ topicId: chatTopic._id }).sort({ createdAt: -1 });

      if (newChat) {
        chatTopic.chat = newChat._id;
      }

      await chatTopic.save();
    }

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};
