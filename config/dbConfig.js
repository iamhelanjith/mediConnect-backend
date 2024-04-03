const mongoose = require("mongoose");

const dbConfig = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {});
    console.log("Connected to the mongoDB database");
  } catch (error) {
    console.log("Error connecting to the database", error);
  }
};

module.exports = dbConfig;
