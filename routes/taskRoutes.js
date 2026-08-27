const express = require("express");
const {
  create,
  bulkCreateTask,
  index,
  show,
  update,
  bulkUpdateTask,
  deleteTask,
  bulkDeleteTask,
  restoreTask,
  emptyTrash,
} = require("../controllers/taskController");

const router = express.Router();

router.get("/", index);
router.get("/:id", show);
router.post("/", create);
router.post("/bulk", bulkCreateTask);
router.post("/:id/restore", restoreTask);
router.patch("/bulk", bulkUpdateTask);
router.patch("/:id", update);
router.delete("/trash", emptyTrash);
router.delete("/bulk", bulkDeleteTask);
router.delete("/:id", deleteTask);

module.exports = router;
