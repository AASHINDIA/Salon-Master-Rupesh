// utils/leadHelpers.js
import { normalizeSkills } from "./normalizeSkills.js";

export const parsePagination = (query = {}) => {
  const page  = Math.max(parseInt(query.page, 10)  || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

// Build a createdAt range from ?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
export const buildDateFilter = (query = {}) => {
  const createdAt = {};
  if (query.fromDate) {
    const from = new Date(query.fromDate);
    if (!Number.isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      createdAt.$gte = from;
    }
  }
  if (query.toDate) {
    const to = new Date(query.toDate);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      createdAt.$lte = to;
    }
  }
  return Object.keys(createdAt).length ? createdAt : null;
};

export const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj && obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

export const handleError = (res, error) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed", errors });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${error.path}: ${error.value}` });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "Duplicate entry", keys: error.keyValue });
  }
  console.error("[leads.error]", error);
  return res.status(500).json({ message: "Internal server error" });
};

export const EMPLOYEE_FIELDS = ["name", "phone", "location", "skills", "lookingFor"];
export const SALON_FIELDS    = ["name", "phone", "location", "salonName", "skills", "gender"];

export const buildEmployeePayload = (body = {}) => {
  const base = pick(body, EMPLOYEE_FIELDS);
  if (body.skills !== undefined) base.skills = normalizeSkills(body.skills);
  return base;
};

export const buildSalonPayload = (body = {}) => {
  const base = pick(body, SALON_FIELDS);
  if (body.skills !== undefined) base.skills = normalizeSkills(body.skills);
  return base;
};