import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import searchRouter from "./search";
import resumeRouter from "./resume";
import configRouter from "./config";
import historyRouter from "./history";
import outputRouter from "./output";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(searchRouter);
router.use(resumeRouter);
router.use(configRouter);
router.use(historyRouter);
router.use(outputRouter);

export default router;
