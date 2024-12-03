import jwt from "jsonwebtoken";
import { User } from "../Models/User.js";

export const isAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Use the correct header for JWT

    if (!token) {
      return res.status(403).json({
        message: "Please Login",
      });
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = await User.findById(decodedData._id);

    if (!req.user) {
      return res.status(403).json({
        message: "User not found",
      });
    }

    next();
  } catch (error) {
    res.status(403).json({
      message: "Invalid token or please Login",
    });
  }
};
