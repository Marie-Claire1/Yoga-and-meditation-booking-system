import { BookingModel } from "../models/bookingModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export async function bookCourseForUser(userId, courseId) {
  const course = await CourseModel.findById(courseId);
  if (!course) throw new Error("Course not found");

  const existing = await BookingModel.findCourseEnrolment(userId, courseId);
  if (existing) throw new Error("You are already enrolled on this course");

  const sessions = await SessionModel.listByCourse(courseId);
  for (const s of sessions) {
    const remaining = (s.capacity ?? 0) - (s.bookedCount ?? 0);
    if (remaining <= 0) throw new Error("This course is fully booked");
  }

  // Cancel any existing drop-in bookings for this course
  const existingBookings = await BookingModel.listByUser(userId);
  const dropInsForThisCourse = existingBookings.filter(
    (b) => b.courseId === courseId && b.type === "DROPIN" && b.status === "confirmed"
  );
  for (const dropIn of dropInsForThisCourse) {
    if (dropIn.sessionId) {
      const s = await SessionModel.findById(dropIn.sessionId);
      if (s && (s.bookedCount ?? 0) > 0) {
        await SessionModel.incrementBookedCount(dropIn.sessionId, -1);
      }
    }
    await BookingModel.cancel(dropIn._id);
  }

  const booking = await BookingModel.create({
    userId,
    courseId,
    sessionId: null,
    type: "COURSE",
    status: "confirmed",
  });

  await Promise.all(sessions.map((s) => SessionModel.incrementBookedCount(s._id)));

  return booking;
}

export async function bookSessionForUser(userId, sessionId) {
  const session = await SessionModel.findById(sessionId);
  if (!session) throw new Error("Session not found");

  const course = await CourseModel.findById(session.courseId);
  if (!course) throw new Error("Course not found");

  if (!course.allowDropIn) {
    const err = new Error("Drop-ins are not allowed for this course");
    err.code = "DROPIN_NOT_ALLOWED";
    throw err;
  }

  const duplicate = await BookingModel.findDuplicate(userId, sessionId);
  if (duplicate) throw new Error("You have already booked this session");

  const courseEnrolment = await BookingModel.findCourseEnrolment(userId, course._id);
  if (courseEnrolment) throw new Error("You are already enrolled on the full course");

  const remaining = (session.capacity ?? 0) - (session.bookedCount ?? 0);
  if (remaining <= 0) throw new Error("This session is fully booked");

  const booking = await BookingModel.create({
    userId,
    courseId: course._id,
    sessionId,
    type: "DROPIN",
    status: "confirmed",
  });

  await SessionModel.incrementBookedCount(sessionId);

  return booking;
}