import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AuthUser from "../Model/AuthUser.js";
import supabase from "../lib/supabase.js";

const createToken = (authUserId) =>
  jwt.sign({ userId: authUserId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const formatUser = (authUser) => ({
  id: authUser._id,
  firstName: authUser.firstName,
  lastName: authUser.lastName,
  email: authUser.email,
});

function parseGoogleProfile(supabaseUser) {
  const metadata = supabaseUser.user_metadata || {};
  const email = supabaseUser.email?.toLowerCase();

  let firstName = metadata.given_name || metadata.first_name || "";
  let lastName = metadata.family_name || metadata.last_name || "";

  if (!firstName && !lastName) {
    const fullName = (metadata.full_name || metadata.name || "").trim();
    if (fullName) {
      const [first, ...rest] = fullName.split(/\s+/);
      firstName = first || "";
      lastName = rest.join(" ");
    }
  }

  if (!firstName) {
    firstName = email?.split("@")[0] || "User";
  }

  return {
    email,
    firstName,
    lastName,
    supabaseUserId: supabaseUser.id,
  };
}

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
      authProvider: "email",
    });

    const token = createToken(authUser._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: formatUser(authUser),
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

    if (!authUser.password) {
      return res.status(401).json({
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, authUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(authUser._id);

    res.status(200).json({
      message: "Signed in successfully",
      token,
      user: formatUser(authUser),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const googleAuth = async (req, res) => {
  const { accessToken } = req.body;

  try {
    if (!accessToken) {
      return res.status(400).json({ message: "Access token is required" });
    }

    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !supabaseUser?.email) {
      return res.status(401).json({ message: "Invalid or expired Google session" });
    }

    const profile = parseGoogleProfile(supabaseUser);
    let authUser = await AuthUser.findOne({ email: profile.email });

    if (authUser) {
      if (!authUser.supabaseUserId) {
        authUser.supabaseUserId = profile.supabaseUserId;
        await authUser.save();
      }
    } else {
      authUser = await AuthUser.create({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        authProvider: "google",
        supabaseUserId: profile.supabaseUserId,
      });
    }

    const token = createToken(authUser._id);

    res.status(200).json({
      message: "Signed in with Google successfully",
      token,
      user: formatUser(authUser),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
