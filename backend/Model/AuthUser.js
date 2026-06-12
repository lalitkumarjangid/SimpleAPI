import mongoose from "mongoose";

const authUserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

authUserSchema.methods.toJSON = function () {
  const authUser = this.toObject();
  delete authUser.password;
  return authUser;
};

export default mongoose.model("AuthUser", authUserSchema);
