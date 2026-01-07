const HostStory = require("./hostStory.model");

// import model
const Host = require("../host/host.model");
const ViewStory = require("../viewStory/viewStory.model");
const User = require("../user/model");
const Setting = require("../setting/setting.model");

//import config
const config = require("../../config");

//deletefile
const { deleteFile } = require("../../util/deleteFile");

//fs
const fs = require("fs");

//mongoose
const mongoose = require("mongoose");

//create story
exports.store = async (req, res) => {
  try {
    if (!req.body.hostId || !req.files) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const host = await Host.findById(req.body.hostId);
    if (!host) {
      return res.status(200).json({ status: false, message: "Host does not Exist!!" });
    }

    const story = new HostStory();

    if (req.files.image) {
      story.image = config.baseURL + req.files.image[0].path;
    }

    if (req.files.video) {
      story.video = config.baseURL + req.files.video[0].path;
    }

    story.hostId = host._id;
    story.startDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    story.endDate = new Date(new Date().setSeconds(new Date().getSeconds() + 86400)).toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    const createdAt = new Date();
    console.log("createdAt in story create: ", createdAt);

    const expirationDate = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); //Add 24 hours in milliseconds
    story.expiration_date = expirationDate;

    await story.save();

    return res.status(200).json({ status: true, message: "Success", story });
  } catch (error) {
    console.log(error);
    if (req.files.image) deleteFile(req.files.image[0]);
    if (req.files.video) deleteFile(req.files.video[0]);
    return res.status(200).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//get host story list for user
exports.getHostStory = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, setting, story, fakeStory] = await Promise.all([
      User.findById(userId),
      Setting.findOne().sort({ createdAt: -1 }),
      HostStory.aggregate([
        {
          $match: {
            isFake: false,
          },
        },
        {
          $lookup: {
            from: "viewstories",
            let: {
              user: userId,
              story: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$storyId", "$$story"] }, { $eq: ["$userId", "$$user"] }],
                  },
                },
              },
            ],
            as: "isView",
          },
        },
        {
          $project: {
            // hostStory: "$hostStory",
            image: 1,
            video: 1,
            view: 1,
            hostId: 1,
            startDate: 1,
            endDate: 1,
            createdAt: 1,
            isView: {
              $cond: [{ $eq: [{ $size: "$isView" }, 0] }, false, true],
            },
          },
        },
        {
          $group: {
            _id: "$hostId",
            hostStory: { $push: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: "hosts",
            localField: "_id",
            foreignField: "_id",
            as: "host",
          },
        },
        {
          $unwind: {
            path: "$host",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: "$host._id",
            hostName: "$host.name",
            hostImage: "$host.image",
            hostStory: 1,
            createdAt: "$host.createdAt",
          },
        },
        { $sort: { createdAt: 1 } },
      ]),
      HostStory.aggregate([
        {
          $match: {
            isFake: true,
          },
        },
        {
          $lookup: {
            from: "viewstories",
            let: {
              user: userId,
              story: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$storyId", "$$story"] }, { $eq: ["$userId", "$$user"] }],
                  },
                },
              },
            ],
            as: "isView",
          },
        },
        {
          $project: {
            // hostStory: "$hostStory",
            image: 1,
            video: 1,
            view: 1,
            hostId: 1,
            startDate: 1,
            endDate: 1,
            createdAt: 1,
            isView: {
              $cond: [{ $eq: [{ $size: "$isView" }, 0] }, false, true],
            },
          },
        },
        {
          $group: {
            _id: "$hostId",
            hostStory: { $push: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: "hosts",
            localField: "_id",
            foreignField: "_id",
            as: "host",
          },
        },
        {
          $unwind: {
            path: "$host",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: "$host._id",
            hostName: "$host.name",
            hostImage: "$host.image",
            hostStory: 1,
            createdAt: "$host.createdAt",
          },
        },
        { $sort: { createdAt: 1 } },
      ]),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (!setting) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    if (setting.isFake) {
      return res.status(200).json({
        status: true,
        message: "Success",
        story: [...story, ...fakeStory],
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "Success",
        story,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: true, error: error.message || "Internal Server Error" });
  }
};

//get all story hostWise
exports.hostWiseAllStory = async (req, res) => {
  try {
    if (!req.query.hostId) {
      return res.status(200).json({ status: false, message: "Host id is required!!" });
    }

    const hostId = new mongoose.Types.ObjectId(req.query.hostId);

    const [host, story] = await Promise.all([Host.findById(hostId), HostStory.find({ hostId: hostId }).sort({ createdAt: 1 })]);

    if (!host) {
      return res.status(200).json({ status: false, message: "Host does not exist!!" });
    }

    return res.status(200).json({ status: true, message: "Success!!", story });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//create fake story by admin
exports.fakeStory = async (req, res) => {
  try {
    if (!req.body.hostId || !req.file) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const host = await Host.findOne({ _id: req.body.hostId, isFake: true });
    if (!host) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "Host does not Exist!!" });
    }

    const story = new HostStory();

    story.image = req.file ? config.baseURL + req.file.path : "";
    story.hostId = host._id;
    story.isFake = true;
    story.startDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    await story.save();

    const data = await HostStory.findById(story._id).populate("hostId", "name");

    return res.status(200).json({ status: true, message: "Success", story: data });
  } catch (error) {
    console.log(error);
    deleteFile(req.file);
    return res.status(200).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update fake story by admin
exports.updateStory = async (req, res) => {
  try {
    if (!req.body.storyId) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "storyId must be needed." });
    }

    const story = await HostStory.findById(req.body.storyId);
    if (!story) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "Story does not found." });
    }

    if (req.file) {
      const image = story?.image.split("storage");
      if (image) {
        if (fs.existsSync("storage" + image[1])) {
          fs.unlinkSync("storage" + image[1]);
        }
      }

      story.image = req.file ? config.baseURL + req.file.path : "";
      await story.save();
    }

    const data = await HostStory.findById(story._id).populate("hostId", "name");

    return res.status(200).json({ status: true, message: "Success", story: data });
  } catch (error) {
    console.log(error);
    deleteFile(req.file);
    return res.status(200).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get all fake story by admin
exports.getFakeStory = async (req, res) => {
  try {
    const story = await HostStory.find({ isFake: true }).populate("hostId", "name").sort({ createdAt: 1 });

    return res.status(200).json({ status: true, message: "Success", story });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//delete fake story by admin
exports.delete = async (req, res) => {
  try {
    if (!req.query.storyId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const story = await HostStory.findById(req.query.storyId);
    if (!story) {
      return res.status(200).json({ status: false, message: "Story does not exist!!" });
    }

    const image = story?.image?.split("storage");
    if (image) {
      if (fs.existsSync("storage" + image[1])) {
        fs.unlinkSync("storage" + image[1]);
      }
    }

    const video = story?.video?.split("storage");
    if (video) {
      if (fs.existsSync("storage" + video[1])) {
        fs.unlinkSync("storage" + video[1]);
      }
    }

    await Promise.all([ViewStory.deleteMany({ storyId: story._id }), story.deleteOne()]);

    return res.status(200).json({ status: true, message: "Story deleted Successfully." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//story deleted after 24 hourFunction
exports.expireStory = async (req, res) => {
  const story = await HostStory.find();

  const crtDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  await story.map(async (exStory) => {
    if (crtDate > exStory.endDate) {
      console.log("ex", exStory.endDate);
      console.log("ctrDate", crtDate);
      console.log("this story deleted after 24 hour--------", exStory);

      const story_ = await HostStory.findById(exStory._id);

      if (story_) {
        if (fs.existsSync(story_.image)) {
          fs.unlinkSync(story_.image);
        }
        if (fs.existsSync(story_.video)) {
          fs.unlinkSync(story_.video);
        }
      }

      await ViewStory.deleteMany({ storyId: story_?._id });

      await story_.deleteOne();
      return story_;
    }
  });
};
