import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import sendMail from "../Middleware/sendMail.js";
import { OAuth2Client } from "google-auth-library";
import { Director } from "../Models/director.js";
import { Artist } from "../Models/artist.js";



export const registerUser = async (req, res) => {
  try {
    // Extracting fields from the request body
    const { firstName, lastName, mobileNumber, email, password, confirmPassword, role } = req.body;

    // Validate that the role is either "director" or "artist"
    if (role !== 'director' && role !== 'artist') {
      return res.status(400).json({
        message: "Invalid role. Please choose either 'director' or 'artist'.",
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match!",
      });
    }

    // Check if the user already exists with the same email or mobile number
    let user;
    if (role === 'director') {
      user = await Director.findOne({ $or: [{ email }, { mobileNumber }] });
    } else {
      user = await Artist.findOne({ $or: [{ email }, { mobileNumber }] });
    }

    if (user) {
      // If the user exists, check if the role is the same
      if (user.role === role) {
        return res.status(400).json({
          message: `User already registered with this email or mobile number as a ${role}`,
        });
      } else {
        // If the role is different, update the role
        user.role = role;
        await user.save();

        return res.status(200).json({
          message: `Your role has been updated to ${role}`,
          user,
        });
      }
    }

    // Hash the password using bcryptjs
    const hashPassword = await bcryptjs.hash(password, 10);

    // Create the new user object based on the role
    if (role === 'director') {
      user = new Director({
        firstName,
        lastName,
        mobileNumber,
        email,
        password: hashPassword,
        role, // Assigning the role as "director"
      });
    } else {
      user = new Artist({
        firstName,
        lastName,
        mobileNumber,
        email,
        password: hashPassword,
        role, // Assigning the role as "artist"
      });
    }

    // Save the user to the database
    await user.save();

    // Generate an OTP for email verification
    const otp = Math.floor(Math.random() * 1000000); // OTP will be a 6-digit number

    // Create a token for the OTP and send it for email verification
    const activationToken = jwt.sign(
      { userId: user._id, otp, role: user.role }, // Add the role here as well
      process.env.JWT_SECRET_KEY,
      { expiresIn: '1h' }
    );

    // Send the OTP to the user's email address
    await sendMail(
      email,
      "Movies Company",
      `Please verify your email address using the following OTP: ${otp}`
    );

    // Return response with the activation token (for frontend verification)
    res.status(200).json({
      message: "OTP sent to your email",
      activationToken,
    });
  } catch (error) {
    // Error handling in case something goes wrong
    console.error(error);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

  export const verifyUser = async (req, res) => {
    try {
      const { otp, activationToken } = req.body;
      console.log('Activation Token:', activationToken);
       
  
      // Verify the activation token using JWT
      const verify = jwt.verify(activationToken, process.env.JWT_SECRET_KEY);
      console.log('Decoded Token:', verify);
      if (!verify) {
        return res.status(400).json({
          success: false,
          message: "OTP expired",
        });
      }

      if (!verify.userId || !verify.role) {
        return res.status(400).json({
            success: false,
            message: "Invalid token data",
        });
    }
  
      if (Number(verify.otp) !== Number(otp)) {
        return res.status(400).json({
          success: false,
          message: "Wrong OTP",
        });
      }

      console.log('Looking for user with userId:', verify.userId);
      console.log('User role:', verify.role);
  
  
      // Find the user by userId from the decoded token
      let user;
      if (verify.role === 'director') {
          user = await Director.findById(verify.userId);
      } else if (verify.role === 'artist') {
          user = await Artist.findById(verify.userId);
      }

      if (!user) {
          return res.status(400).json({
              success: false,
              message: "User not found",
          });
      }
      // Check if the mobile number already exists in the database for a different user
      let existingUserByMobile;
      if (verify.role === 'director') {
        existingUserByMobile = await Director.findOne({
          mobileNumber: user.mobileNumber,
          _id: { $ne: user._id }, // Ensure it's not the same user
        });
      } else if (verify.role === 'artist') {
        existingUserByMobile = await Artist.findOne({
          mobileNumber: user.mobileNumber,
          _id: { $ne: user._id }, // Ensure it's not the same user
        });
      }
  
      // Mark the user as verified
      user.isVerified = true;
      await user.save();
  
      // Here you can send the user's role (director or artist) along with the success flag
      res.json({
        success: true,
        message: "User Registered Successfully",
        role: user.role, // Assuming the user model has a 'role' field
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };



  export const directorloginUser = async (req, res) => {
    try {
      const { email, mobileNumber, password } = req.body;
  
      // If neither email nor mobile number is provided, return an error
      if (!email && !mobileNumber) {
        return res.status(400).json({
          message: "Please provide either email or mobile number to log in",
        });
      }
  
      // Find the user based on email or mobile number
      const user = await Director.findOne({
        $or: [{ email }, { mobileNumber }] // Checks for either email or mobileNumber
      });
  
      // If no user is found, return invalid credentials error
      // if (user.role !== 'director') {
      //   return res.status(403).json({
      //     message: "Only directors are allowed to login",
      //   });
      // }

      if (!user) {
        return res.status(400).json({
          message: "Invalid Credentials",
        });
      }
  
      // Compare the provided password with the hashed password in the database
      const matchPassword = await bcryptjs.compare(password, user.password);
  
      if (!matchPassword) {
        return res.status(400).json({
          message: "Invalid Credentials",
        });
      }
  
      // Create a JWT token
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: "15d", // Token expires in 15 days
      });
  
      // Respond with a success message and the token
      res.json({
        message: `Welcome back director ${user.firstName} ${user.lastName}`,
        token,
        user,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  export const artistLoginUser = async (req, res) => {
    try {
      const { email, mobileNumber, password } = req.body;
  
      // If neither email nor mobile number is provided, return an error
      if (!email && !mobileNumber) {
        return res.status(400).json({
          message: "Please provide either email or mobile number to log in",
        });
      }
  
      // Find the user based on email or mobile number
      const user = await Artist.findOne({
        $or: [{ email }, { mobileNumber }] // Checks for either email or mobileNumber
      });
  
      // If no user is found, return invalid credentials error
      if (!user) {
        return res.status(400).json({
          message: "Invalid Credentials",
        });
      }
  
      // Check if the user has the 'artist' role
      if (user.role !== 'artist') {
        return res.status(403).json({
          message: "Only artists are allowed to login",
        });
      }
  
      // Compare the provided password with the hashed password in the database
      const matchPassword = await bcryptjs.compare(password, user.password);
  
      if (!matchPassword) {
        return res.status(400).json({
          message: "Invalid Credentials",
        });
      }
  
      // Create a JWT token
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: "15d", // Token expires in 15 days
      });
  
      // Respond with a success message and the token
      res.json({
        message: `Welcome back Artist ${user.firstName} ${user.lastName}`,
        token,
        user,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;  // Get the tokenId sent from the frontend

    if (!tokenId) {
      return res.status(400).json({ message: "Token ID is required" });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,  // Ensure this matches your Google Client ID
    });

    // Extract user details from the payload of the verified token
    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if the user already exists in your database
    let user = await User.findOne({ email });

    if (!user) {
      // If the user doesn't exist, create a new one
      user = new User({
        email,
        firstName: name.split(" ")[0],  // Split name into first and last
        lastName: name.split(" ")[1] || "",  // Handle cases with no last name
        isVerified: true,  // Assume users logging in with Google are verified
      });

      await user.save();  // Save the new user in the database
    }

    // Generate a JWT token for the user
    const token = jwt.sign(
      { _id: user._id }, 
      process.env.JWT_SECRET_KEY, 
      { expiresIn: '15d' }  // Set the expiration for the token (e.g., 15 days)
    );

    // Respond with the JWT token and user details
    return res.json({
      message: `Welcome back ${user.firstName} ${user.lastName}`,
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,  // Send the role so that the frontend can handle it
      },
    });

  } catch (error) {
    console.error("Google authentication error: ", error);
    return res.status(500).json({ message: "Error authenticating with Google" });
  }
};