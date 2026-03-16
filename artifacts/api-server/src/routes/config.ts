import { Router } from "express";
import { loadConfig, saveConfig } from "./profiles";

const router = Router();

const CONFIG_KEYS = [
  "max_results_per_query", "request_delay",
  "email_enabled", "email_from", "email_to",
  "smtp_host", "smtp_port", "smtp_user", "smtp_password",
];

router.get("/config", (_req, res) => {
  const cfg = loadConfig();
  const result: Record<string, any> = {
    max_results_per_query: 25,
    request_delay: 2.0,
    email_enabled: false,
    email_from: "",
    email_to: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
  };
  for (const k of CONFIG_KEYS) {
    if (k in cfg) result[k] = cfg[k];
  }
  res.json(result);
});

router.put("/config", (req, res) => {
  const data = req.body ?? {};
  const cfg = loadConfig();
  for (const k of CONFIG_KEYS) {
    if (k in data) cfg[k] = data[k];
  }
  saveConfig(cfg);
  res.json({ message: "Config updated", success: true });
});

export default router;
