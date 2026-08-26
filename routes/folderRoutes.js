const express = require("express");
const {
  createFolder,
  indexFolder,
  showFolder,
  updateFolder,
  deleteFolder,
} = require("../controllers/folderController");

const router = express.Router();

router.get("/", indexFolder);
router.get("/:id", showFolder);
router.post('/', createFolder);
router.patch("/:id", updateFolder);
router.delete("/:id", deleteFolder);

module.exports = router;