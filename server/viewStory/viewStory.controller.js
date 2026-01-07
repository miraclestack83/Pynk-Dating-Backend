const ViewStory = require("./viewStory.model");

//import model
const User = require("../user/model");
const Story = require("../hostStory/hostStory.model");

//mongoose
const mongoose = require("mongoose");

//create viewUser of story
exports.viewUser = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.storyId) {
      return res.status(200).json({ status: false, message: "Invalid details!!" });
    }

    const userId = new mongoose.Types.ObjectId(req.body.userId);
    const storyId = new mongoose.Types.ObjectId(req.body.storyId);

    const [user, story, viewUserExist] = await Promise.all([
      User.findById(userId),
      Story.findById(storyId),
      ViewStory.findOne({
        userId: userId,
        storyId: storyId,
      }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!!" });
    }

    if (!story) {
      return res.status(200).json({ status: false, message: "Story does not found!!" });
    }

    if (viewUserExist) {
      return res.status(200).json({
        status: true,
        message: "viewUser already exists.",
      });
    } else {
      const viewStory = new ViewStory();
      viewStory.userId = user._id;
      viewStory.storyId = story._id;
      viewStory.expiration_date = story.expiration_date;

      story.view += 1;

      await Promise.all([viewStory.save(), story.save()]);

      return res.status(200).json({ status: true, message: "Success", viewStory });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};
