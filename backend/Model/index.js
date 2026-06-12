import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
   companyName: String,
   phone: Number,
   
});

export default mongoose.model("User", userSchema);