import { Router } from "express";
import { requireOrganiser } from "../middlewares/requireAuth.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";

const router = Router();
router.use(requireOrganiser);

// Auto-assign image based on course title keywords
function autoAssignImage(title, level) {
  const t = title.toLowerCase();
  if (t.includes("hatha"))
    return "/static/images/hatha.jpg";
  if (t.includes("vinyasa") || t.includes("flow"))
    return "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80";
  if (t.includes("meditation") || t.includes("mindful") || t.includes("mindfulness"))
    return "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&auto=format&fit=crop&q=80";
  if (t.includes("breathwork") || t.includes("pranayama"))
    return "/static/images/advancesbreathworkandsomatichealing.jpg";
  if (t.includes("bikram") || t.includes("hot yoga"))
    return "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&auto=format&fit=crop&q=80";
  if (t.includes("zen"))
    return "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&auto=format&fit=crop&q=80";
  if (t.includes("transcendental"))
    return "https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=800&auto=format&fit=crop&q=80";
  if (t.includes("retreat"))
    return "/static/images/advancedmeditationandretreatweekend.jpg";
  if (t.includes("workshop"))
    return "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&auto=format&fit=crop&q=80";
  if (t.includes("somatic") || t.includes("healing"))
    return "/static/images/advancesbreathworkandsomatichealing.jpg";
  if (t.includes("puppy") || t.includes("dog"))
    return "/static/images/puppyyoga.jpg";
  if (level === "beginner")
    return "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=800&auto=format&fit=crop&q=80";
  if (level === "advanced")
    return "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&auto=format&fit=crop&q=80";
  return "/static/images/hatha.jpg";
}

// ─── Dashboard home ────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const enriched = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        return {
          id: c._id,
          title: c.title,
          type: c.type,
          level: c.level,
          startDate: c.startDate,
          endDate: c.endDate,
          instructorName: c.instructorName,
          sessionsCount: sessions.length,
          allowDropIn: c.allowDropIn,
          price: c.price,
          dropInPrice: c.dropInPrice,
          image: c.image ?? null,
        };
      })
    );
    res.render("organiser/dashboard", {
      title: "Organiser dashboard",
      courses: enriched,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Add course ────────────────────────────────────────────────────────────
router.get("/courses/new", async (req, res, next) => {
  try {
    const instructors = await UserModel.listByRole("instructor");
    res.render("organiser/course_form", {
      title: "Add course",
      course: {},
      instructors,
      isNew: true,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/courses/new", async (req, res, next) => {
  try {
    const {
      title, description, level, type,
      startDate, endDate, price, dropInPrice,
      allowDropIn, instructorId, instructorName, location, image,
    } = req.body;
    await CourseModel.create({
      title: title.trim(),
      description: description.trim(),
      level,
      type,
      startDate,
      endDate,
      price: parseFloat(price) || 0,
      dropInPrice: dropInPrice ? parseFloat(dropInPrice) : null,
      allowDropIn: allowDropIn === "on",
      instructorId,
      instructorName,
      location: location.trim(),
      image: image && image.trim() !== "" ? image.trim() : autoAssignImage(title, level),
      sessionIds: [],
    });
    res.redirect("/organiser");
  } catch (err) {
    next(err);
  }
});

// ─── Edit course ───────────────────────────────────────────────────────────
router.get("/courses/:id/edit", async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course) return res.status(404).render("error", { title: "Not found", message: "Course not found" });
    const instructors = await UserModel.listByRole("instructor");
    res.render("organiser/course_form", {
      title: "Edit course",
      course,
      instructors,
      isNew: false,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/courses/:id/edit", async (req, res, next) => {
  try {
    const {
      title, description, level, type,
      startDate, endDate, price, dropInPrice,
      allowDropIn, instructorId, instructorName, location, image,
    } = req.body;
    await CourseModel.update(req.params.id, {
      title: title.trim(),
      description: description.trim(),
      level,
      type,
      startDate,
      endDate,
      price: parseFloat(price) || 0,
      dropInPrice: dropInPrice ? parseFloat(dropInPrice) : null,
      allowDropIn: allowDropIn === "on",
      instructorId,
      instructorName,
      location: location.trim(),
      image: image && image.trim() !== "" ? image.trim() : autoAssignImage(title, level),
    });
    res.redirect("/organiser");
  } catch (err) {
    next(err);
  }
});

// ─── Delete course ─────────────────────────────────────────────────────────
router.post("/courses/:id/delete", async (req, res, next) => {
  try {
    const sessions = await SessionModel.listByCourse(req.params.id);
    await Promise.all(sessions.map((s) => SessionModel.delete(s._id)));
    await CourseModel.delete(req.params.id);
    res.redirect("/organiser");
  } catch (err) {
    next(err);
  }
});

// ─── Sessions list ─────────────────────────────────────────────────────────
router.get("/courses/:id/sessions", async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course) return res.status(404).render("error", { title: "Not found", message: "Course not found" });
    const sessions = await SessionModel.listByCourse(req.params.id);
    const rows = sessions.map((s) => ({
      id: s._id,
      courseId: req.params.id,
      startDateTime: s.startDateTime,
      endDateTime: s.endDateTime,
      capacity: s.capacity,
      bookedCount: s.bookedCount ?? 0,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
      location: s.location,
    }));
    res.render("organiser/sessions", {
      title: `Sessions — ${course.title}`,
      course: { id: course._id, title: course.title },
      sessions: rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Add session ───────────────────────────────────────────────────────────
router.get("/courses/:id/sessions/new", async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course) return res.status(404).render("error", { title: "Not found", message: "Course not found" });
    res.render("organiser/session_form", {
      title: "Add session",
      course: { id: course._id, title: course.title },
      session: {},
      isNew: true,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/courses/:id/sessions/new", async (req, res, next) => {
  try {
    const { startDateTime, endDateTime, capacity, location } = req.body;
    const session = await SessionModel.create({
      courseId: req.params.id,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      capacity: parseInt(capacity) || 20,
      bookedCount: 0,
      location: location.trim(),
    });
    const course = await CourseModel.findById(req.params.id);
    await CourseModel.update(req.params.id, {
      sessionIds: [...(course.sessionIds ?? []), session._id],
    });
    res.redirect(`/organiser/courses/${req.params.id}/sessions`);
  } catch (err) {
    next(err);
  }
});

// ─── Edit session ──────────────────────────────────────────────────────────
router.get("/courses/:courseId/sessions/:sessionId/edit", async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.courseId);
    const session = await SessionModel.findById(req.params.sessionId);
    if (!course || !session) return res.status(404).render("error", { title: "Not found", message: "Not found" });
    res.render("organiser/session_form", {
      title: "Edit session",
      course: { id: course._id, title: course.title },
      session: {
        id: session._id,
        startDateTime: session.startDateTime?.slice(0, 16),
        endDateTime: session.endDateTime?.slice(0, 16),
        capacity: session.capacity,
        location: session.location,
      },
      isNew: false,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/courses/:courseId/sessions/:sessionId/edit", async (req, res, next) => {
  try {
    const { startDateTime, endDateTime, capacity, location } = req.body;
    await SessionModel.update(req.params.sessionId, {
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      capacity: parseInt(capacity) || 20,
      location: location.trim(),
    });
    res.redirect(`/organiser/courses/${req.params.courseId}/sessions`);
  } catch (err) {
    next(err);
  }
});

// ─── Delete session ────────────────────────────────────────────────────────
router.post("/courses/:courseId/sessions/:sessionId/delete", async (req, res, next) => {
  try {
    await SessionModel.delete(req.params.sessionId);
    const course = await CourseModel.findById(req.params.courseId);
    await CourseModel.update(req.params.courseId, {
      sessionIds: (course.sessionIds ?? []).filter((id) => id !== req.params.sessionId),
    });
    res.redirect(`/organiser/courses/${req.params.courseId}/sessions`);
  } catch (err) {
    next(err);
  }
});

// ─── Class list ────────────────────────────────────────────────────────────
router.get("/courses/:courseId/sessions/:sessionId/classlist", async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.courseId);
    const session = await SessionModel.findById(req.params.sessionId);
    if (!course || !session) return res.status(404).render("error", { title: "Not found", message: "Not found" });

    const bookings = await BookingModel.findBySession(req.params.sessionId);
    const participants = await Promise.all(
      bookings.map(async (b) => {
        const user = await UserModel.findById(b.userId);
        return {
          name: user?.name ?? "Unknown",
          email: user?.email ?? "—",
          type: b.type,
          bookedAt: b.createdAt ? new Date(b.createdAt).toLocaleString("en-GB") : "—",
        };
      })
    );

    res.render("organiser/classlist", {
      title: `Class list — ${course.title}`,
      course: { title: course.title },
      session: {
        start: new Date(session.startDateTime).toLocaleString("en-GB", {
          weekday: "short", day: "numeric", month: "short",
          year: "numeric", hour: "2-digit", minute: "2-digit",
        }),
        capacity: session.capacity,
        bookedCount: session.bookedCount ?? 0,
      },
      participants,
      isEmpty: participants.length === 0,
    });
  } catch (err) {
    next(err);
  }
});

// ─── User management ───────────────────────────────────────────────────────
router.get("/users", async (req, res, next) => {
  try {
    const allUsers = await UserModel.listAll();
    const users = allUsers
      .filter((u) => u._id !== req.user._id)
      .map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        membershipType: u.membershipType ?? "full",
        verified: u.verified ?? true,
        isStudent:    u.role === "student",
        isInstructor: u.role === "instructor",
        isOrganiser:  u.role === "organiser",
        isMemberStudent: u.membershipType === "student",
        isFullPrice: !u.membershipType || u.membershipType === "full",
        needsVerification: u.membershipType === "student" && !u.verified,
      }));
    res.render("organiser/users", {
      title: "User management",
      users,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ["student", "instructor", "organiser"];
    if (!validRoles.includes(role)) return res.status(400).render("error", { title: "Invalid role", message: "Role not recognised" });
    await UserModel.updateRole(req.params.id, role);
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/membership", async (req, res, next) => {
  try {
    const { membershipType } = req.body;
    const validTypes = ["full", "student"];
    if (!validTypes.includes(membershipType)) return res.status(400).render("error", { title: "Invalid membership", message: "Membership type not recognised" });
    await UserModel.updateMembership(req.params.id, membershipType);
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/verify", async (req, res, next) => {
  try {
    await UserModel.verifyStudent(req.params.id);
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/delete", async (req, res, next) => {
  try {
    if (req.params.id === req.user._id) {
      return res.status(400).render("error", { title: "Not allowed", message: "You cannot delete your own account" });
    }
    await UserModel.delete(req.params.id);
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
});

export default router;