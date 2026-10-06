import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { healthRouter } from "./routes/health.js";
import { installChessSocket } from "./socket/socketServer.js";

export function buildServer(){
  const app=express();app.disable("x-powered-by");app.use(cors({origin:true,credentials:false}));app.use(express.json({limit:"32kb"}));app.use(healthRouter);
  const httpServer=createServer(app);const io=new Server(httpServer,{cors:{origin:true},pingInterval:25_000,pingTimeout:20_000,transports:["websocket","polling"]});installChessSocket(io);return httpServer;
}
