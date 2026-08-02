function errorHandler(err, req, res, next) {
  if (err.name === "PrismaClientInitializationError") {
    console.error("Couldn't connect to the database. Is it running?");
  }
  
  if (err.code === "ECONNREFUSED" && err.port === 5432) {
    // the postgresql port
    console.log(
      "The database connection was refused.  Is your database service running?",
    );
  }

  res.status(500).json({
    message: err.message,
  });
}

module.exports = errorHandler;
