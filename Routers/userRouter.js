import express from "express"
import {  artistLoginUser, directorloginUser, googleLogin, registerUser, verifyUser } from "../Controllers/user.js"


const router = express.Router()

router.post("/user/register",registerUser)
router.post("/user/verify",verifyUser)
router.post("/user/directorlogin",directorloginUser)
router.post("/user/artistlogin",artistLoginUser)
router.post("/user/google",googleLogin)


export default router;