import { Router } from "express";

const testBotEnabled = /^(1|true|yes)$/i.test(process.env.CHESS_TEST_BOT_ENABLED ?? "");

export const healthRouter = Router();
healthRouter.get("/health", (_req: any, res: any) => res.json({
  ok: true,
  chessTestBotEnabled: testBotEnabled,
}));
