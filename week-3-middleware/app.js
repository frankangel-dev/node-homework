const express = require("express");
const dogsRouter = require("./routes/dogs");
const path = require('path');
const {randomUUID} = require("crypto");

const app = express();

// Assignment 3b and 3c ask you to add middleware in this file.
// Request ID
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// Logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// JSON Parsing
app.use(express.json({limit: '1mb'}));

// Static File
app.use(express.static(path.join(__dirname, 'public')));

// Content Type Validation
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(400).json({
      error: 'Content-Type must be application/json',
      requestId: req.requestId
    });
  }
  next();
});

// Routes
app.use("/", dogsRouter);// Do not remove this line

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    requestId: req.requestId
  });
});

// Error Handling
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${err.name} - ${err.message}`);
  } else {
    console.error(`ERROR: ${err.name} - ${err.message}`);
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : err.message,
    requestId: req.requestId,
  });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

module.exports = app;

