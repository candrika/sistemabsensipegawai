import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import documentsRouter from "./documents";
import inventoryRouter from "./inventory";
import complaintsRouter from "./complaints";
import rolesRouter from "./roles";
import usersRouter from "./users";
import authRouter from "./auth";
import sellersRouter from "./sellers";
import customersRouter from "./customers";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(rolesRouter);
router.use(usersRouter);
router.use(employeesRouter);
router.use(attendanceRouter);
router.use(documentsRouter);
router.use(inventoryRouter);
router.use(complaintsRouter);
router.use(sellersRouter);
router.use(customersRouter);

export default router;
