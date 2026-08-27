const prisma = require("../db/prisma");

async function getUserAnalytics(req, res, next) {
  const userId = parseInt(req.params?.id);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (Number.isNaN(userId)) {
    return res.status(400).json({
      message: "The user ID passed is not valid",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (user === null) {
      return res.status(404).json({
        message: "No matching user exists",
      });
    }

    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId , trash: false },
      _count: { id: true },
    });

    const recentTasks = await prisma.task.findMany({
      where: { userId, trash: false },
      select: {
        title: true,
        isCompleted: true,
        id: true,
        userId: true,
        priority: true,
        createdAt: true,
        User: { select: { name: true } },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
        trash: false,
      },
      _count: { id: true },
    });

    res.status(200).json({
      taskStats,
      recentTasks,
      weeklyProgress,
    });
  } catch (e) {
    return next(e);
  }
}

async function getUsersWithStats(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: { where: { isCompleted: false, trash: false }, select: { id: true }, take: 5 },
        _count: { select: { Task: { where: { trash: false } } } },
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    const totalUsers = await prisma.user.count();

    const pagination = {
      page,
      limit,
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit),
      hasNext: page * limit < totalUsers,
      hasPrev: page > 1,
    };

    res.status(200).json({
      users,
      pagination,
    });
  } catch (e) {
    return next(e);
  }
}

async function searchTasks(req, res, next) {
  const searchQuery = req.query.q;
  const limit = req.query.limit || 20;

  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(400).json({
      error: "Search query must be at least 2 characters long.",
    });
  }

  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    const searchResults = await prisma.$queryRaw`
      SELECT t.id,
             t.title,
             t.is_completed AS "isCompleted",
             t.priority,
             t.created_at   AS "createdAt",
             t.user_id      AS "userId",
             u.name         AS "user_name"
      FROM tasks t
             JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern}
         OR u.name ILIKE ${searchPattern}
         AND t.trash = FALSE
      ORDER BY CASE
                 WHEN t.title ILIKE ${exactMatch} THEN 1
                 WHEN t.title ILIKE ${startsWith} THEN 2
                 WHEN t.title ILIKE ${searchPattern} THEN 3
                 ELSE 4
                 END,
               t.created_at DESC
      LIMIT ${parseInt(limit)}
    `;

    res.status(200).json({
      results: searchResults,
      query: searchQuery,
      count: searchResults.length,
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
};
