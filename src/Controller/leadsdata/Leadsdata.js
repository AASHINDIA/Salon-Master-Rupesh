// controllers/leadsdata/Leadsdata.js
import EmployeeLeads from "../../Modal/Leaddata/empleads.js";
import SalonLeads from "../../Modal/Leaddata/salonLeads.js";
import {
  parsePagination,
  handleError,
  buildEmployeePayload,
  buildSalonPayload,
  buildDateFilter,
} from "./leadHelpers.js";

/* ============ EMPLOYEE LEADS ============ */

// GET /employee-leads?page=1&limit=10&search=&location=&lookingFor=
export const getEmployeeLeads = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.location)   filter.location   = req.query.location;
    if (req.query.lookingFor) filter.lookingFor = req.query.lookingFor;
    const dateFilter = buildDateFilter(req.query);
    if (dateFilter) filter.createdAt = dateFilter;

    const [leads, totalCount] = await Promise.all([
      EmployeeLeads.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EmployeeLeads.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: leads,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /employee-leads/:id
export const getEmployeeLeadById = async (req, res) => {
  try {
    const lead = await EmployeeLeads.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: "Employee lead not found" });
    return res.status(200).json(lead);
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /employee-leads
export const createEmployeeLeads = async (req, res) => {
  try {
    const payload = buildEmployeePayload(req.body);
    const newLead = await EmployeeLeads.create(payload);
    return res.status(201).json(newLead);
  } catch (error) {
    return handleError(res, error);
  }
};

/* ============ SALON LEADS ============ */

// GET /salon-leads?page=1&limit=10&search=&location=&gender=
export const getSalonLeads = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { name:      { $regex: req.query.search, $options: "i" } },
        { phone:     { $regex: req.query.search, $options: "i" } },
        { salonName: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.location) filter.location = req.query.location;
    if (req.query.gender)   filter.gender   = req.query.gender;
    const dateFilter = buildDateFilter(req.query);
    if (dateFilter) filter.createdAt = dateFilter;

    const [leads, totalCount] = await Promise.all([
      SalonLeads.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SalonLeads.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: leads,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /salon-leads/:id
export const getSalonLeadById = async (req, res) => {
  try {
    const lead = await SalonLeads.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: "Salon lead not found" });
    return res.status(200).json(lead);
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /salon-leads
export const createSalonLeads = async (req, res) => {
  try {
    const payload = buildSalonPayload(req.body);
    const newLead = await SalonLeads.create(payload);
    return res.status(201).json(newLead);
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /leads (all leads, employee + salon)
export const getAllLeads = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const baseFilter = {};
    if (req.query.search) {
      baseFilter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
        { salonName: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.location) baseFilter.location = req.query.location;
    const dateFilter = buildDateFilter(req.query);
    if (dateFilter) baseFilter.createdAt = dateFilter;

    const empFilter = { ...baseFilter };
    const salonFilter = { ...baseFilter };
    if (req.query.gender) salonFilter.gender = req.query.gender;
    if (req.query.lookingFor) empFilter.lookingFor = req.query.lookingFor;

    const [employeeLeads, salonLeads, empCount, salonCount] = await Promise.all([
      EmployeeLeads.find(empFilter).sort({ createdAt: -1 }).lean(),
      SalonLeads.find(salonFilter).sort({ createdAt: -1 }).lean(),
      EmployeeLeads.countDocuments(empFilter),
      SalonLeads.countDocuments(salonFilter),
    ]);

    const allLeads = [...employeeLeads, ...salonLeads].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const total = empCount + salonCount;
    const paged = allLeads.slice(skip, skip + limit);

    return res.status(200).json({
      data: paged,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /leads (unified create for landing page)
export const createLead = async (req, res) => {
  try {
    const type = String(req.body?.type ?? "employee").toLowerCase();

    // Normalize values coming from the landing page form to match schema enums
    const body = { ...req.body };
    if (body.gender) body.gender = String(body.gender).toLowerCase();
    if (body.lookingFor) {
      const lookingForMap = {
        job: "job",
        training: "Training",
        both: "jobTraining",
      };
      body.lookingFor = lookingForMap[String(body.lookingFor).toLowerCase()] ?? body.lookingFor;
    }

    if (type === "salon_owner") {
      const payload = buildSalonPayload(body);
      const newLead = await SalonLeads.create(payload);
      return res.status(201).json(newLead);
    }
    if (type === "employee") {
      const payload = buildEmployeePayload(body);
      const newLead = await EmployeeLeads.create(payload);
      return res.status(201).json(newLead);
    }
    return res.status(400).json({ message: "Invalid lead type" });
  } catch (error) {
    return handleError(res, error);
  }
};

/* ============ CSV EXPORT ============ */

const csvEscape = (value) => {
  const str = value === undefined || value === null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

// GET /export?type=all|salon|employee&fromDate=&toDate=&search=&location=
export const exportLeads = async (req, res) => {
  try {
    const type = String(req.query.type ?? "all").toLowerCase();

    const baseFilter = {};
    if (req.query.search) {
      baseFilter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
        { salonName: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.location) baseFilter.location = req.query.location;
    const dateFilter = buildDateFilter(req.query);
    if (dateFilter) baseFilter.createdAt = dateFilter;

    let rows = [];
    if (type === "salon") {
      rows = (await SalonLeads.find(baseFilter).sort({ createdAt: -1 }).lean()).map((r) => ({
        ...r,
        __type: "Salon Owner",
      }));
    } else if (type === "employee") {
      rows = (await EmployeeLeads.find(baseFilter).sort({ createdAt: -1 }).lean()).map((r) => ({
        ...r,
        __type: "Employee",
      }));
    } else {
      const [emp, salon] = await Promise.all([
        EmployeeLeads.find(baseFilter).lean(),
        SalonLeads.find(baseFilter).lean(),
      ]);
      rows = [
        ...emp.map((r) => ({ ...r, __type: "Employee" })),
        ...salon.map((r) => ({ ...r, __type: "Salon Owner" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const header = [
      "Type",
      "Name",
      "Phone",
      "Location",
      "Salon Name",
      "Skills",
      "Gender",
      "Looking For",
      "Created At",
    ];

    const lines = [header.map(csvEscape).join(",")];
    for (const row of rows) {
      lines.push(
        [
          csvEscape(row.__type),
          csvEscape(row.name),
          csvEscape(row.phone),
          csvEscape(row.location),
          csvEscape(row.salonName),
          csvEscape(Array.isArray(row.skills) ? row.skills.join(", ") : row.skills),
          csvEscape(row.gender),
          csvEscape(row.lookingFor),
          csvEscape(row.createdAt ? new Date(row.createdAt).toISOString() : ""),
        ].join(",")
      );
    }

    // BOM so Excel opens UTF-8 correctly
    const csv = "\uFEFF" + lines.join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="leads_${stamp}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    return handleError(res, error);
  }
};