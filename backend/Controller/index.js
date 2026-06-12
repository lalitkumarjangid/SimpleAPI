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
      email: email.toLowerCase(),
      companyName,
      phone,
      createdBy: req.userId,
    });

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A contact with this email already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

const ALLOWED_PAGE_SIZES = [20, 40, 100];
const DEFAULT_PAGE_SIZE = 20;

export const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const requestedLimit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE;
    const limit = ALLOWED_PAGE_SIZES.includes(requestedLimit)
      ? requestedLimit
      : DEFAULT_PAGE_SIZE;

    const filter = { createdBy: req.userId };
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      message: "Users fetched successfully",
      users,
      pagination: {
        page,
        perPage: limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
