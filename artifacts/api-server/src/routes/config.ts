import { Router } from "express";
import { loadConfig, saveConfig } from "./profiles";

const router = Router();

const DEFAULTS: Record<string, any> = {
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

const CONFIG_KEYS = Object.keys(DEFAULTS);

router.get("/config", async (_req, res) => {
  try {
    const cfg = await loadConfig();
    const result = { ...DEFAULTS };
    for (const k of CONFIG_KEYS) {
      if (k in cfg) result[k] = cfg[k];
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.put("/config", async (req, res) => {
  try {
    const data = req.body ?? {};
    const cfg = await loadConfig();
    for (const k of CONFIG_KEYS) {
      if (k in data) cfg[k] = data[k];
    }
    await saveConfig(cfg);
    res.json({ message: "Config updated", success: true });
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

export default router;
