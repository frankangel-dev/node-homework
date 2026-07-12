const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

async function create(req, res) {
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      message: error.message
    });
  }

  const newTask = {
    ...value,
    id: taskCounter(),
    userId: global.user_id.email,
  }

  global.tasks.push(newTask);
  
  const {userId, ...sanitizedNewTask} = newTask;
  res.status(201).json(sanitizedNewTask);
}

async function index(req, res) {
  const tasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );

  if (tasks.length === 0) {
    return res.status(404).json({
      message: 'User has no tasks',
    });
  }
  
  const sanitizedTasks = tasks.map(task => {
    const {userId, ...cleanTask} = task;
    return cleanTask;
  });
  
  res.status(200).json(sanitizedTasks);
}

async function show(req, res) {
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: 'The task ID passed is not valid',
    });
  }

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === global.user_id.email,
  );
  
  if (!task) {
    return res.status(404).json({
      message: 'No matching task exists',
    });
  }
  
  const {userId, ...sanitizedTask} = task;
  
  res.status(200).json(sanitizedTask);
}

async function update(req, res) {
  const { error, value } = patchTaskSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
  
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: 'The task ID passed is not valid',
    });
  }

  const task = global.tasks.find(
    (task) => task.id === taskId && task.userId === global.user_id.email,
  );

  if (!task) {
    return res.status(404).json({
      message: 'No matching task exists',
    });
  }

  Object.assign(task, value);

  const { userId, ...sanitizedTask } = task;

  res.status(200).json(sanitizedTask);
}

async function deleteTask(req,res) {
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskId && task.userId === global.user_id.email,
  );

  if (taskIndex === -1) {
    return res.sendStatus(404);
  }

  const { userId, ...sanitizedTask } = global.tasks[taskIndex];

  global.tasks.splice(taskIndex, 1);

  res.status(200).json(sanitizedTask);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask
};