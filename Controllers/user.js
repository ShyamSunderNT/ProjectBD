import { User } from "../Models/User.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import sendMail from "../Middleware/sendMail.js";
import { OAuth2Client } from "google-auth-library";



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
  
      // Check if the user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          message: "User already exists!",
        });
      }

      let userByMobile = await User.findOne({ mobileNumber });
      if (userByMobile) {
        return res.status(400).json({
          message: "Mobile number is already registered!",
        });
      }
  
      // Hash the password using bcryptjs
      const hashPassword = await bcryptjs.hash(password, 10);
  
      // Create the new user object with the provided role
      user = new User({
        firstName,
        lastName,
        mobileNumber,
        email,
        password: hashPassword,
        role, // Assigning the role as either "director" or "artist"
      });
  
      // Save the user to the database
      await user.save();
  
      // Generate an OTP for email verification
      const otp = Math.floor(Math.random() * 1000000);

      // OTP will be a 6-digit number
  
      // Create a token for the OTP and send it for email verification
      const activationToken = jwt.sign(
        { userId: user._id, otp },  // Payload
        process.env.JWT_SECRET_KEY,  // Use JWT_SECRET_KEY for signing
        { expiresIn: '5m' }  // Token expires in 5 minutes
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
  
      // Verify the activation token using JWT
      const verify = jwt.verify(activationToken, process.env.JWT_SECRET_KEY);
  
      if (!verify) {
        return res.status(400).json({
          success: false,
          message: "OTP expired",
        });
      }
  
      if (Number(verify.otp) !== Number(otp)) {
        return res.status(400).json({
          success: false,
          message: "Wrong OTP",
        });
      }
  
      // Find the user by userId from the decoded token
      const user = await User.findById(verify.userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not found",
        });
      }
  
      // Check if the mobile number already exists in the database for a different user
      const existingUserByMobile = await User.findOne({
        mobileNumber: user.mobileNumber,
        _id: { $ne: user._id }, // Ensure it's not the same user
      });
  
      if (existingUserByMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is already registered with another account!",
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
      const user = await User.findOne({
        $or: [{ email }, { mobileNumber }] // Checks for either email or mobileNumber
      });
  
      // If no user is found, return invalid credentials error
      if (user.role !== 'director') {
        return res.status(403).json({
          message: "Only directors are allowed to login",
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
      const user = await User.findOne({
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
    const { email, name, picture } = payload;

    // Check if the user already exists in your database
    let user = await User.findOne({ email });

    if (!user) {
      // If the user doesn't exist, create a new one
      user = new User({
        email,
        firstName: name.split(" ")[0],  // Split name into first and last
        lastName: name.split(" ")[1] || "",  // Handle cases with no last name
        profilePicture: picture,
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
        profilePicture: user.profilePicture,
        role: user.role,  // Send the role so that the frontend can handle it
      },
    });

  } catch (error) {
    console.error("Google authentication error: ", error);
    return res.status(500).json({ message: "Error authenticating with Google" });
  }
};