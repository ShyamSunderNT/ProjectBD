import { createTransport } from "nodemailer";

import dotenv from "dotenv"

dotenv.config();

const sendMail = async (email, subject, text) => {
    try {
      const transport = createTransport({
        host: "smtp.gmail.com",
        port: 465,
        auth: {
          user: process.env.Gmail,
          pass: process.env.Password,
        },
      });
  
      await transport.sendMail({
        from: "websideotp@gmail.com",
        to: email,
        subject,
        text,
      });
  
      console.log("Email sent successfully");
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  };
  

export default sendMail;