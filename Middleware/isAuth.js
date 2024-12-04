// import jwt from "jsonwebtoken";
// import { Director } from "../Models/director.js";
// import { Artist } from "../Models/artist.js";


// export const isAuth = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1]; // Use the correct header for JWT

//     if (!token) {
//       return res.status(403).json({
//         message: "Please Login",
//       });
//     }

//     const decodedData = jwt.verify(token, process.env.JWT_SECRET_KEY);

//     req.user = await User.findById(decodedData._id);

//     if (!req.user) {
//       return res.status(403).json({
//         message: "User not found",
//       });
//     }

//     next();
//   } catch (error) {
//     res.status(403).json({
//       message: "Invalid token or please Login",
//     });
//   }
// };


import jwt from "jsonwebtoken";
import { Director } from "../Models/director.js";
import { Artist } from "../Models/artist.js";

export const isAuth = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const token = req.headers.authorization?.split(" ")[1]; // Use the correct header for JWT

    if (!token) {
      return res.status(403).json({
        message: "Please Login",
      });
    }

    // Verify the JWT token
    const decodedData = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Depending on the role (director or artist), find the user in the corresponding collection
    let user;
    if (decodedData.role === 'director') {
      user = await Director.findById(decodedData._id);
    } else if (decodedData.role === 'artist') {
      user = await Artist.findById(decodedData._id);
    }

    if (!user) {
      return res.status(403).json({
        message: "User not found or invalid token",
      });
    }

    // Attach the user to the request object
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error(error); // Logging the error for debugging purposes
    res.status(403).json({
      message: "Invalid token or please Login",
    });
  }
};