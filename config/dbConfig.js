const mongoose = require("mongoose");

const dbConfig = async () => {

  const MONGO_URL = "mongodb+srv://user:user@cluster0.cygeykj.mongodb.net/MediConnectDB?retryWrites=true&w=majority&appName=Cluster0"
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to the mongoDB database");
  } catch (error) {
    console.log("Error connecting to the database", error);
  }
};

module.exports = dbConfig;
