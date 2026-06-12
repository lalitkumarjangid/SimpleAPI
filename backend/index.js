import express from "express";
import routes from "./Routes/index.js";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(routes);
app.use(cors({
  origin: "http://localhost:5173" || "https://simple-api-uxu6.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.log(err);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});