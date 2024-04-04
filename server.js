const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config(); 
const host = "0.0.0.0";


const dbConfig = require("./config/dbConfig");
const userRouter = require("./routes/userRoute");
const adminRouter = require("./routes/adminRoute"); 
const doctorRouter = require("./routes/doctorRoute"); 



const port = process.env.PORT || 3001;

app.use(express.json());
app.use("/api/user", userRouter); 
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);

// mongoose.connect(process.env.MONGO_URL)
//     .then(() => {
//         app.listen(port, () => console.log('server is running on port',port));
//     })
//     .then(() => console.log("connected to the database"))
//     .catch((err) => console.log(err));

app.listen(port, host, () => console.log("server is running on port", port));
dbConfig();
