import { Router } from "express";
import {
  homePage,
  courseDetailPage,
} from "../controllers/viewsController.js";

import { coursesListPage } from "../controllers/coursesListController.js";

const router = Router();

router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);

export default router;
