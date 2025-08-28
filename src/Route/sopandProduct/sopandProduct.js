import express from "express";
import { getProductsGroupedByUser } from "../../Controller/sopandproductcontroller/SoproductController.js";
const router = express.Router();

router.get("/getproducts", getProductsGroupedByUser);

export default router;