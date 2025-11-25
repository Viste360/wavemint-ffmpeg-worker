
import express from "express";
import multer from "multer";
import { hybridSlice } from "../utils/ffmpeg.js";

const upload = multer({ dest: "/tmp" });
const router = express.Router();

router.post("/", upload.fields([{name:"video"},{name:"audio"}]), async (req,res)=>{
  try{
    const video=req.files["video"]?.[0];
    const audio=req.files["audio"]?.[0] || null;
    const clips= await hybridSlice(video.path, audio?.path || null);
    res.json({status:"success", clips});
  } catch(e){
    console.error(e);
    res.status(500).json({error:"processing_failed"});
  }
});

export default router;
