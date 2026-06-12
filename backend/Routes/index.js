import { Router } from "express";
import { createUser, getUsers } from "../Controller/index.js";
import { signUp, signIn } from "../Controller/auth.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/auth/signup", signUp);
router.post("/auth/signin", signIn);
router.post("/create", authenticate, createUser);
router.get("/get", authenticate, getUsers);

export default router;