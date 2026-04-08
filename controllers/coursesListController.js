import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

const fmtDateOnly = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBA";

export const coursesListPage = async (req, res, next) => {
  try {
    const { level, type, dropin, q } = req.query;

    const filter = {};
    if (level && level.trim() !== "") filter.level = level;
    if (type && type.trim() !== "") filter.type = type;
    if (dropin === "yes") filter.allowDropIn = true;
    if (dropin === "no") filter.allowDropIn = false;

    let courses = await CourseModel.list(filter);

    const needle = (q || "").trim().toLowerCase();
    if (needle) {
      courses = courses.filter(
        (c) =>
          c.title?.toLowerCase().includes(needle) ||
          c.description?.toLowerCase().includes(needle)
      );
    }

    courses.sort((a, b) => {
      const ad = a.startDate
        ? new Date(a.startDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bd = b.startDate
        ? new Date(b.startDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return (a.title || "").localeCompare(b.title || "");
    });

    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const first = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: fmtDateOnly(c.startDate),
          endDate: fmtDateOnly(c.endDate),
          nextSession: first ? fmtDateTime(first.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
          price: c.price,
          dropInPrice: c.dropInPrice,
          image: c.image ?? null,
          location: c.location,
        };
      })
    );

    res.render("courses", {
      title: "Courses",
      filters: { level, type, dropin, q },
      courses: cards,
      isEmpty: cards.length === 0,
    });
  } catch (err) {
    next(err);
  }
};