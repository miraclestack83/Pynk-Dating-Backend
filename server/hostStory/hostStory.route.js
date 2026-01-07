const express = require("express");
const route = express.Router();
const multer = require("multer");
const storage = require("../../util/multer");

const hostStoryController = require("./hostStory.controller");
const upload = multer({
  storage,
});

const checkAccessWithSecretKey = require("../../checkAccess");

//create story
route.post(
  "/create",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  checkAccessWithSecretKey(),
  hostStoryController.store
);

//delete story
route.delete("/storyId", checkAccessWithSecretKey(), hostStoryController.delete);

//get host story list for user
route.get("/hostStory", checkAccessWithSecretKey(), hostStoryController.getHostStory);

//get all story hostWise
route.get("/hostWiseAllStory", checkAccessWithSecretKey(), hostStoryController.hostWiseAllStory);

//create fake story by admin
route.post("/fakeStory", upload.single("image"), checkAccessWithSecretKey(), hostStoryController.fakeStory);

//update fake story by admin
route.patch("/updateStory", upload.single("image"), checkAccessWithSecretKey(), hostStoryController.updateStory);

//get all fake story by admin
route.get("/getFakeStory", checkAccessWithSecretKey(), hostStoryController.getFakeStory);

//delete fake story by admin
route.delete("/delete", checkAccessWithSecretKey(), hostStoryController.delete);

//story deleted after 24 hourFunction
//route.get("/checkExpire", checkAccessWithSecretKey(), hostStoryController.expireStory);

module.exports = route;
