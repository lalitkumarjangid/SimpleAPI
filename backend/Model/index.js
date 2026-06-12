import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    phone: { type: Number, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
    },
  },
  { timestamps: true },
);

userSchema.index({ email: 1, createdBy: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
