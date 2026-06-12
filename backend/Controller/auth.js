import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AuthUser from "../Model/AuthUser.js";

const createToken = (authUserId) =>
  jwt.sign({ userId: authUserId }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const signUp = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await AuthUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const authUser = await AuthUser.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = createToken(authUser._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: authUser._id,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        email: authUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const authUser = await AuthUser.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!authUser) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, authUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(authUser._id);

    res.status(200).json({
      message: "Signed in successfully",
      token,
      user: {
        id: authUser._id,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        email: authUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
