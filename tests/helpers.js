import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export async function resetDb() {
  await initDb();
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  await Promise.all([
    usersDb.compactDatafile(),
    coursesDb.compactDatafile(),
    sessionsDb.compactDatafile(),
    bookingsDb.compactDatafile(),
  ]);
}

export async function seedMinimal() {
  const organiser = await UserModel.register(
    "Test Organiser",
    "organiser@test.local",
    "password123",
    "organiser",
    "full"
  );
  const instructor = await UserModel.register(
    "Test Instructor",
    "instructor@test.local",
    "password123",
    "instructor",
    "full"
  );
  const student = await UserModel.register(
    "Test Student",
    "student@test.local",
    "password123",
    "student",
    "full"
  );

  const course = await CourseModel.create({
    title: "Test Course",
    level: "beginner",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-04-07",
    endDate: "2026-06-23",
    instructorId: instructor._id,
    instructorName: instructor.name,
    sessionIds: [],
    description: "A test course for testing.",
    price: 100,
    dropInPrice: 12,
    location: "Test Studio",
  });

  const s1 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-04-07T18:30:00").toISOString(),
    endDateTime: new Date("2026-04-07T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
    location: "Test Studio",
  });

  const s2 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-04-14T18:30:00").toISOString(),
    endDateTime: new Date("2026-04-14T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
    location: "Test Studio",
  });

  await CourseModel.update(course._id, { sessionIds: [s1._id, s2._id] });

  return { organiser, instructor, student, course, sessions: [s1, s2] };
}

export async function loginAs(request, app, email, password) {
  const res = await request(app)
    .post("/auth/login")
    .send(`email=${email}&password=${password}`)
    .set("Content-Type", "application/x-www-form-urlencoded");
  return res.headers["set-cookie"];
}