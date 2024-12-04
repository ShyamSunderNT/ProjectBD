import mongoose from "mongoose";



const schema =new mongoose.Schema(
    {
        firstName: {
          type: String,
          required: true,
        },
        lastName: {
          type: String,
          required: true,
        },
        mobileNumber: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        password: {
          type: String,
          required: true,
          minlength: 6, // Password length requirement
          
        },
        role: {
          type: String,
          enum: ["director"], // Roles limited to director or artist
          required: true,
          default: "director"
        },
        isVerified: {
            type: Boolean,
            default: false,  // Set default to false (user is not verified initially)
          },
      },
      {
        timestamps: true,
      }
    );
    
    // Create the User model
    export const Director = mongoose.model("Director", schema);
    