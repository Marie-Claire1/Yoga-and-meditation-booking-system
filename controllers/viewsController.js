// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const homePage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: c.startDate ? fmtDateOnly(c.startDate) : "",
          endDate: c.endDate ? fmtDateOnly(c.endDate) : "",
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
          price: c.price,
          dropInPrice: c.dropInPrice,
          image: c.image ?? null,
          location: c.location,
        };
      })
    );
    res.render("home", { title: "Yoga Courses", courses: cards });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);

    const isVerifiedStudent = req.user?.membershipType === "student" && req.user?.verified === true;
    const discount = isVerifiedStudent ? 0.8 : 1;
    const displayPrice = course.price ? (course.price * discount).toFixed(2) : null;
    const displayDropInPrice = course.dropInPrice ? (course.dropInPrice * discount).toFixed(2) : null;

    let alreadyEnrolled = false;
    let enrolmentId = null;
    if (req.user) {
      const enrolment = await BookingModel.findCourseEnrolment(req.user._id, courseId);
      if (enrolment) {
        alreadyEnrolled = true;
        enrolmentId = enrolment._id;
      }
    }

    const bookedSessionIds = new Set();
    if (req.user) {
      const userBookings = await BookingModel.listByUser(req.user._id);
      userBookings.forEach((b) => {
        if (b.sessionId) bookedSessionIds.add(b.sessionId);
      });
    }

    const isLoggedIn = !!req.user;
    const isOrganiser = req.user?.role === "organiser";
    const canBook = isLoggedIn && !isOrganiser && !alreadyEnrolled;
    const showDropIn = isLoggedIn && !isOrganiser && !alreadyEnrolled && course.allowDropIn === true;

    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
      isFull: (s.bookedCount ?? 0) >= (s.capacity ?? 0),
      alreadyBooked: bookedSessionIds.has(s._id),
      allowDropIn: course.allowDropIn === true,
      showDropIn,
    }));

    res.render("course", {
      title: course.title,
      user: req.user ? {
        _id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        isOrganiser,
      } : null,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn === true,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
        location: course.location,
        price: displayPrice ?? course.price,
        dropInPrice: displayDropInPrice ?? course.dropInPrice,
        studentDiscount: isVerifiedStudent,
        instructorName: course.instructorName ?? "TBC",
        image: course.image ?? null,
      },
      sessions: rows,
      alreadyEnrolled,
      enrolmentId,
      isOrganiser,
      canBook,
      showDropIn,
      isLoggedIn,
    });
  } catch (err) {
    next(err);
  }
};

export const postBookCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    await bookCourseForUser(req.user._id, courseId);
    res.redirect(`/bookings/my-bookings?success=Your+booking+for+${encodeURIComponent(course.title)}+is+confirmed`);
  } catch (err) {
    res.status(400).render("error", { title: "Booking failed", message: err.message });
  }
};

export const postBookSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await SessionModel.findById(sessionId);
    const course = await CourseModel.findById(session.courseId);
    await bookSessionForUser(req.user._id, sessionId);
    res.redirect(`/bookings/my-bookings?success=Your+session+booking+for+${encodeURIComponent(course.title)}+is+confirmed`);
  } catch (err) {
    const message =
      err.code === "DROPIN_NOT_ALLOWED"
        ? "Drop-ins are not allowed for this course."
        : err.message;
    res.status(400).render("error", { title: "Booking failed", message });
  }
};

export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
      return res.status(404).render("error", { title: "Not found", message: "Booking not found" });

    const course = await CourseModel.findById(booking.courseId);
    let sessionDetail = null;
    if (booking.sessionId) {
      const s = await SessionModel.findById(booking.sessionId);
      if (s) sessionDetail = fmtDate(s.startDateTime);
    }

    res.render("booking_confirmation", {
      title: "Booking confirmed",
      booking: {
        id: booking._id,
        type: booking.type,
        status: booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
        courseTitle: course?.title ?? "Unknown course",
        sessionDetail,
        isDropIn: booking.type === "DROPIN",
      },
    });
  } catch (err) {
    next(err);
  }
};