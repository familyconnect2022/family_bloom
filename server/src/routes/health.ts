import { Router } from "express";
export const healthRouter = Router();
healthRouter.get("/health",(_req: any,res: any)=>res.json({ok:true}));
