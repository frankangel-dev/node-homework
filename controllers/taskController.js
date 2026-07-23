const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

async function create(req, res, next) {
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  try {
    const newTask = await prisma.task.create({
      data: {
        ...value,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });

    res.status(201).json(newTask);
  } catch (e) {
    return next(e);
  }
}

async function index(req, res) {
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: { title: true, isCompleted: true, id: true },
  });

  if (tasks.length === 0) {
    return res.status(404).json({
      message: "User has no tasks",
    });
  }

  res.status(200).json(tasks);
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid",
    });
  }

  try {
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });

    if (task === null) {
      return res.status(404).json({
        message: "No matching task exists",
      });
    }
    res.status(200).json(task);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({
        message: "No matching task exists",
      });
    } else {
      return next(e);
    }
  }
}

async function update(req, res, next) {
  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid",
    });
  }

  try {
    const updatedTask = await prisma.task.update({
      data: value,
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });

    res.status(200).json(updatedTask);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(e);
    }
  }
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const taskIndex = await prisma.task.delete({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });

    res.status(200).json(taskIndex);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({
        message: "The task was not found."
      });
    } else {
      return next(e);
    }
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
