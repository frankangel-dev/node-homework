const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

const taskFilter = (query, userId) => {
  const { find, isCompleted, priority, trash, folder } = query;
  const where = { userId };

  if (folder === "none") {
    where.folderId = null;
  } else if (folder) {
    where.folderId = parseInt(folder);
  }

  if (find) {
    where.title = {
      contains: find,
      mode: "insensitive",
    };
  }

  if (isCompleted !== undefined) {
    where.isCompleted = isCompleted === "true";
  }

  if (trash !== "true") {
    where.trash = false;
  }

  if (priority) {
    where.priority = priority;
  }

  return where;
};

const getOrderBy = (query) => {
  const validSortFields = [
    "title",
    "priority",
    "createdAt",
    "id",
    "isCompleted",
  ];
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

  if (validSortFields.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }
  return { createdAt: "desc" };
};

async function create(req, res, next) {
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  try {
    if (value.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: value.folderId, userId: req.user.id },
      });

      if (!folder) {
        return res.status(404).json({
          message: "Folder not found",
        });
      }
    }

    const newTask = await prisma.task.create({
      data: {
        ...value,
        userId: req.user.id,
      },
      select: { title: true, isCompleted: true, id: true, priority: true, folderId: true },
    });

    res.status(201).json(newTask);
  } catch (e) {
    return next(e);
  }
}

async function bulkCreateTask(req, res, next) {
  const { tasks } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

async function index(req, res, next) {
  const { min_date, max_date, folder } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (folder && folder !== "none" && Number.isNaN(parseInt(folder))) {
    return res.status(400).json({
      message: "folder ID must be a valid number",
    });
  }

  const whereClause = taskFilter(req.query, req.user.id);

  if (min_date) {
    const minDate = new Date(min_date);
    if (isNaN(minDate.getTime())) {
      return res.status(400).json({
        message: "min date must be a valid date",
      });
    }
    whereClause.createdAt = {
      ...whereClause.createdAt,
      gte: minDate,
    };
  }

  if (max_date) {
    const maxDate = new Date(max_date);
    if (isNaN(maxDate.getTime())) {
      return res.status(400).json({
        message: "max date must be a valid date",
      });
    }
    whereClause.createdAt = {
      ...whereClause.createdAt,
      lte: maxDate,
    };
  }

  try {
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        title: true,
        isCompleted: true,
        id: true,
        priority: true,
        createdAt: true,
        folderId: true,
        trash: true,
        User: { select: { name: true, email: true } },
      },
      skip,
      take: limit,
      orderBy: getOrderBy(req.query),
    });

    if (tasks.length === 0) {
      return res.status(404).json({
        message: "No matching task exists",
      });
    }

    const totalTasks = await prisma.task.count({
      where: whereClause,
    });

    const pagination = {
      page,
      limit,
      total: totalTasks,
      pages: Math.ceil(totalTasks / limit),
      hasNext: page * limit < totalTasks,
      hasPrev: page > 1,
    };

    res.status(200).json({
      tasks,
      pagination,
    });
  } catch (e) {
    return next(e);
  }
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id);
  const whereClause = { id: taskId, userId: req.user.id };
  const { trash } = req.query;

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid",
    });
  }

  if (trash !== "true") {
    whereClause.trash = false;
  }

  try {
    const task = await prisma.task.findUnique({
      where: whereClause,
      select: {
        title: true,
        isCompleted: true,
        id: true,
        priority: true,
        folderId: true,
        trash: true,
        User: { select: { name: true, email: true } },
      },
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
    if (value.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: value.folderId, userId: req.user.id },
      });

      if (!folder) {
        return res.status(404).json({
          message: "Folder not found",
        });
      }
    }

    const updatedTask = await prisma.task.update({
      data: value,
      where: {
        id: taskId,
        userId: req.user.id,
        trash: false,
      },
      select: { title: true, isCompleted: true, id: true, priority: true, folderId: true, trash: true },
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

async function bulkUpdateTask(req, res, next) {
  const { taskId, ...updatedData } = req.body;

  if (!taskId || !Array.isArray(taskId) || taskId.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }
  
  const { error, value } = patchTaskSchema.validate(updatedData);
  
  if (error) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.details,
    });
  }

  try {
    const result = await prisma.task.updateMany({
      data: value,
      where: {
        id: { in: taskId },
        userId: req.user.id,
      },
    });

    res.status(200).json({
      message: "success!",
      tasksUpdated: result.count,
    });
  } catch (err) {
    return next(err);
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
    const taskIndex = await prisma.task.update({
      data: { trash: true },
      where: {
        id: taskId,
        userId: req.user.id,
        trash: false,
      },
      select: { title: true, isCompleted: true, trash: true, id: true },
    });

    res.status(200).json(taskIndex);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({
        message: "The task was not found.",
      });
    } else {
      return next(e);
    }
  }
}

async function bulkDeleteTask(req, res, next){
  const { taskId } = req.body;

  if (!taskId || !Array.isArray(taskId) || taskId.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  try {
    const result = await prisma.task.updateMany({
      data: { trash: true },
      where: {
        id: { in: taskId },
        userId: req.user.id,
        trash: false,
      }
    });

    res.status(200).json({
      message: "success!",
      tasksTrashed: result.count,
    });
  } catch (err) {
    return next(err);
  }
}

async function restoreTask(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const taskIndex = await prisma.task.update({
      data: { trash: false },
      where: { id: taskId, userId: req.user.id, trash: true },
      select: { title: true, isCompleted: true, trash: true, id: true },
    });

    res.status(200).json(taskIndex);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({
        message: "The task was not found.",
      });
    } else {
      return next(e);
    }
  }
}

async function emptyTrash(req, res, next) {
  try {
    const deletedTasks = await prisma.task.deleteMany({
      where: { userId: req.user.id, trash: true },
    });

    res.status(200).json({
      message: "Trash emptied",
      removed: deletedTasks.count,
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
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
};
