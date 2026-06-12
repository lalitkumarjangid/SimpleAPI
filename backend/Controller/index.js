import User from "../Model/index.js";

export const createUser = async (req, res) => {
  const { firstName, lastName, email, companyName, phone } = req.body;
  try {
    if (!firstName || !lastName || !email || !companyName || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.create({
      firstName,
      lastName,
      email,
      companyName,
      phone,
    });
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ message: "Users fetched successfully", users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
