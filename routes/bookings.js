import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { BookingModel } from "../models/bookingModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";

const router = Router();

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short", year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });

const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

// ─── Enrol on a whole course ───────────────────────────────────────────────
router.post("/courses/:id/book", requireAuth, async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    await bookCourseForUser(req.user._id, req.params.id);
    res.redirect(`/bookings/my-bookings?success=Your+booking+for+${encodeURIComponent(course.title)}+is+confirmed`);
  } catch (err) {
    res.status(400).render("error", { title: "Booking failed", message: err.message });
  }
});

// ─── Drop-in on a single session ──────────────────────────────────────────
router.post("/sessions/:id/book", requireAuth, async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    const course = await CourseModel.findById(session.courseId);
    await bookSessionForUser(req.user._id, req.params.id);
    res.redirect(`/bookings/my-bookings?success=Your+session+booking+for+${encodeURIComponent(course.title)}+is+confirmed`);
  } catch (err) {
    const message =
      err.code === "DROPIN_NOT_ALLOWED"
        ? "Drop-ins are not allowed for this course."
        : err.message;
    res.status(400).render("error", { title: "Booking failed", message });
  }
});

// ─── My bookings ───────────────────────────────────────────────────────────
router.get("/my-bookings", requireAuth, async (req, res, next) => {
  try {
    const bookings = await BookingModel.listByUser(req.user._id);

    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const course = await CourseModel.findById(b.courseId);

        let nextSession = null;
        let totalSessions = 0;
        if (b.type === "COURSE" && b.courseId) {
          const sessions = await SessionModel.listByCourse(b.courseId);
          totalSessions = sessions.length;
          const now = new Date();
          const upcoming = sessions.filter((s) => new Date(s.startDateTime) > now);
          if (upcoming.length > 0) {
            nextSession = fmtDate(upcoming[0].startDateTime);
          }
        }

        let sessionDetail = null;
        if (b.sessionId) {
          const s = await SessionModel.findById(b.sessionId);
          if (s) {
            sessionDetail = {
              start: fmtDate(s.startDateTime),
              end: fmtDate(s.endDateTime),
              location: s.location,
            };
          }
        }

        return {
          id: b._id,
          type: b.type,
          isDropIn: b.type === "DROPIN",
          isCourse: b.type === "COURSE",
          status: b.status,
          isCancelled: b.status === "CANCELLED",
          isConfirmed: b.status === "confirmed",
          createdAt: fmtDate(b.createdAt),
          courseTitle: course?.title ?? "Unknown course",
          courseId: b.courseId,
          level: course?.level ?? "",
          location: course?.location ?? "",
          instructorName: course?.instructorName ?? "TBC",
          totalSessions,
          nextSession,
          hasNextSession: !!nextSession,
          session: sessionDetail,
        };
      })
    );

    const activeBookings = enriched.filter((b) => b.status === "confirmed");
    const cancelledBookings = enriched.filter((b) => b.status === "CANCELLED");
    const courseBookings = activeBookings.filter((b) => b.isCourse);
    const dropInBookings = activeBookings.filter((b) => b.isDropIn);

    res.render("my_bookings", {
      title: "My bookings",
      userName: req.user.name,
      successMessage: req.query.success || null,
      hasCourseBookings: courseBookings.length > 0,
      hasDropInBookings: dropInBookings.length > 0,
      hasAnyBookings: activeBookings.length > 0,
      hasCancelledBookings: cancelledBookings.length > 0,
      courseBookings,
      dropInBookings,
      cancelledBookings,
    });
  } catch (err) {
    next(err);
  }
});

// ─── My classes (instructor view) ─────────────────────────────────────────
router.get("/my-classes", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).render("error", {
        title: "Access denied",
        message: "Only instructors can view this page.",
      });
    }

    const allCourses = await CourseModel.list({ instructorId: req.user._id });

    const classes = await Promise.all(
      allCourses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const now = new Date();
        const upcoming = sessions.filter((s) => new Date(s.startDateTime) > now);
        const rows = sessions.map((s) => ({
          start: fmtDate(s.startDateTime),
          end: fmtDate(s.endDateTime),
          capacity: s.capacity,
          bookedCount: s.bookedCount ?? 0,
          location: s.location,
          isPast: new Date(s.startDateTime) < now,
        }));
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          location: c.location,
          totalSessions: sessions.length,
          upcomingSessions: upcoming.length,
          nextSession: upcoming.length > 0 ? fmtDate(upcoming[0].startDateTime) : null,
          hasNextSession: upcoming.length > 0,
          sessions: rows,
        };
      })
    );

    res.render("my_classes", {
      title: "My classes",
      instructorName: req.user.name,
      classes,
      hasClasses: classes.length > 0,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Cancel a booking ──────────────────────────────────────────────────────
router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) return res.status(404).render("error", { title: "Not found", message: "Booking not found" });
    if (booking.userId !== req.user._id) return res.status(403).render("error", { title: "Forbidden", message: "This is not your booking" });
    if (booking.status === "CANCELLED") return res.redirect("/bookings/my-bookings");

    if (booking.type === "DROPIN" && booking.sessionId) {
      const s = await SessionModel.findById(booking.sessionId);
      if (s && (s.bookedCount ?? 0) > 0) {
        await SessionModel.incrementBookedCount(booking.sessionId, -1);
      }
    }
    if (booking.type === "COURSE" && booking.courseId) {
      const sessions = await SessionModel.listByCourse(booking.courseId);
      await Promise.all(sessions.map(async (s) => {
        if ((s.bookedCount ?? 0) > 0) {
          await SessionModel.incrementBookedCount(s._id, -1);
        }
      }));
    }

    await BookingModel.cancel(req.params.id);
    res.redirect("/bookings/my-bookings?success=Your+booking+has+been+cancelled");
  } catch (err) {
    next(err);
  }
});

export default router;