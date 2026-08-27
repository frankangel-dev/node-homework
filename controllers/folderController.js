const { folderSchema, patchFolderSchema } = require("../validation/folderSchema");
const prisma = require("../db/prisma");

async function createFolder(req, res, next) {
  const { error, value } = folderSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  try {
    const newFolder = await prisma.folder.create({
      data: {
        ...value,
        userId: req.user.id,
      },
      select: { name: true, id: true },
    });

    res.status(201).json(newFolder);
  } catch (e) {
    if (e.name === "PrismaClientKnownRequestError" && e.code === "P2002") {
      return res.status(400).json({
        error: "Folder already exists",
      });
    }
    return next(e);
  }
}

async function indexFolder(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const whereClause = { userId: req.user.id };
  const { find, min_date, max_date } = req.query;

  if (find) {
    whereClause.name = {
      contains: find,
      mode: "insensitive",
    };
  }

  if (min_date) {
    const minDate = new Date(min_date);
    if (isNaN(minDate.getTime())) {
      return res.status(400).json({
        message: "minimum date must be a valid date",
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
        message: "maximum date must be a valid date",
      });
    }
    whereClause.createdAt = {
      ...whereClause.createdAt,
      lte: maxDate,
    };
  }

  try {
    const folders = await prisma.folder.findMany({
      where: whereClause,
      select: {
        name: true,
        id: true,
        createdAt: true,
        Task: { select: { title: true, isCompleted: true, priority: true, id: true } },
      },
      skip,
      take: limit,
    });

    if (folders.length === 0) {
      return res.status(404).json({
        message: "No matching folder exists",
      });
    }

    const totalFolders = await prisma.folder.count({
      where: whereClause,
    });

    const pagination = {
      page,
      limit,
      total: totalFolders,
      pages: Math.ceil(totalFolders / limit),
      hasNext: page * limit < totalFolders,
      hasPrev: page > 1,
    };

    res.status(200).json({
      folders,
      pagination,
    });
  } catch (e) {
    return next(e);
  }
}

async function showFolder(req, res, next) {
  const folderId = parseInt(req.params?.id);
  const whereClause = { id: folderId, userId: req.user.id };

  if (Number.isNaN(folderId)) {
    return res.status(400).json({
      message: "The folder ID passed is not valid",
    });
  }

  try {
    const folder = await prisma.folder.findUnique({
      where: whereClause,
      select: {
        name: true,
        id: true,
        Task: { where: { trash: false}, select: { title: true, isCompleted: true, priority: true, id: true } },
      },
    });

    if (folder === null) {
      return res.status(404).json({
        message: "No matching folder exists",
      });
    }
    res.status(200).json(folder);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({
        message: "No matching folder exists",
      });
    } else {
      return next(e);
    }
  }
}

async function updateFolder(req, res, next) {
  const { error, value } = patchFolderSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const folderId = parseInt(req.params?.id);
  const whereClause = { id: folderId, userId: req.user.id };

  if (Number.isNaN(folderId)) {
    return res.status(400).json({
      message: "The folder ID passed is not valid",
    });
  }

  try {
    const updatedFolder = await prisma.folder.update({
      data: value,
      where: whereClause,
      select: { name: true, id: true },
    });

    res.status(200).json(updatedFolder);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ message: "The folder was not found." });
    } else {
      return next(e);
    }
  }
}

async function deleteFolder(req, res, next) {
  const folderId = parseInt(req.params?.id);
  const whereClause = { id: folderId, userId: req.user.id };

  if (Number.isNaN(folderId)) {
    return res.status(400).json({
      message: "The folder ID passed is not valid",
    });
  }

  try {
    const tasksAffected = await prisma.task.count({
      where: { folderId: folderId, userId: req.user.id, trash: false },
    });
    
    const deletedFolder = await prisma.folder.delete({
      where: whereClause,
      select: { name: true, id: true }
    });

    res.status(200).json({
      message: "Folder deleted",
      removed: deletedFolder,
      tasksUncategorized: tasksAffected,
    });
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ message: "The folder was not found." });
    } else {
    return next(e);
    }
  }
}

module.exports = {
  createFolder,
  indexFolder,
  showFolder,
  updateFolder,
  deleteFolder
}