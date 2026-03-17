import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { startScheduler } from "./scheduler";
import { initAuth } from "./routes/auth";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

initAuth()
  .then(() => console.log("[auth] Initialized from database"))
  .catch((e) => console.error("[auth] Init failed, using defaults:", e));

startScheduler();

export default app;
