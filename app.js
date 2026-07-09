const express = require('express');

global.user_id = null;
global.users = [];
global.tasks = [];

const userRoutes = require('./routes/userRoutes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');
const timeRouter = require("./routes/timeRoutes");

const app = express();
const port = process.env.PORT || 3000;

let isShuttingDown = false;

app.use(express.json());
app.use('/api/users', userRoutes);
app.use("/api", timeRouter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.post('/testpost', (req, res) => {
  res.status(200).json({
    message: 'POST route works'
  });
});

// app.all("*splat", (req, res) => {
//     res.status(404).json({
//         message: `No route found for ${req.method} ${req.path}`,
//     });
// });

app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("HTTP server closed.");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

module.exports = {app, server};