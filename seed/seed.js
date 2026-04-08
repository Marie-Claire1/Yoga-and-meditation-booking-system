import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";

const iso = (d) => new Date(d).toISOString();
const STUDIO_LOCATION = "Serenity Yoga Studio, 42 Calm Street, Glasgow, G1 1AA";
const ONLINE = "Online via Zoom";

async function wipeAll() {
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

async function createUsers() {
  const organiser = await UserModel.register(
    "Marie-Claire",
    "marie-claire@yogastudio.com",
    "password123",
    "organiser",
    "full"
  );
  const ava = await UserModel.register(
    "Ava Thompson",
    "ava@yogastudio.com",
    "password123",
    "instructor",
    "full"
  );
  const ben = await UserModel.register(
    "Ben Walsh",
    "ben@yogastudio.com",
    "password123",
    "instructor",
    "full"
  );
  const priya = await UserModel.register(
    "Priya Sharma",
    "priya@yogastudio.com",
    "password123",
    "instructor",
    "full"
  );
  const sarah = await UserModel.register(
    "Sarah",
    "sarah@student.local",
    "password123",
    "student",
    "full"
  );
  const stewart = await UserModel.register(
    "Stewart Smith",
    "stewart@student.local",
    "password123",
    "student",
    "full"
  );
  return { organiser, ava, ben, priya, sarah, stewart };
}

async function createCourse({
  title, description, level, type, allowDropIn,
  startDate, endDate, price, dropInPrice,
  instructorId, instructorName, location, image,
  sessions,
}) {
  const course = await CourseModel.create({
    title, description, level, type, allowDropIn,
    startDate, endDate, price,
    dropInPrice: dropInPrice ?? null,
    instructorId, instructorName, location,
    image: image ?? null,
    sessionIds: [],
  });

  const created = [];
  for (const s of sessions) {
    const session = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(s.start),
      endDateTime: iso(s.end),
      capacity: s.capacity ?? 18,
      bookedCount: 0,
      location: s.location ?? location,
    });
    created.push(session);
  }

  await CourseModel.update(course._id, {
    sessionIds: created.map((s) => s._id),
  });

  return { course, sessions: created };
}

function weeklySlots(startDate, count, hour, minute, durationMins) {
  const slots = [];
  const base = new Date(startDate);
  base.setHours(hour, minute, 0, 0);
  for (let i = 0; i < count; i++) {
    const start = new Date(base.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + durationMins * 60 * 1000);
    slots.push({ start, end });
  }
  return slots;
}

function workshopSlots(startDate, count, startHour, durationMins, gapMins = 30) {
  const slots = [];
  let cursor = new Date(startDate);
  cursor.setHours(startHour, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + durationMins * 60 * 1000);
    slots.push({ start, end });
    cursor = new Date(end.getTime() + gapMins * 60 * 1000);
    if (i === 2) {
      cursor = new Date(startDate);
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(startHour, 0, 0, 0);
    }
  }
  return slots;
}

async function run() {
  console.log("Initialising DB...");
  await initDb();

  console.log("Wiping existing data...");
  await wipeAll();

  console.log("Creating users...");
  const { ava, ben, priya } = await createUsers();

  // ─── BEGINNER COURSES ──────────────────────────────────────────────────

  console.log("Creating beginner courses...");

  await createCourse({
    title: "Foundations of Hatha Yoga",
    description: "A gentle introduction to classical Hatha postures, breathing techniques and relaxation. Perfect for complete beginners.",
    level: "beginner",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-04-07",
    endDate: "2026-06-23",
    price: 120,
    dropInPrice: 14,
    instructorId: ava._id,
    instructorName: ava.name,
    location: STUDIO_LOCATION,
    image: "/static/images/hatha.jpg",
    sessions: weeklySlots("2026-04-07", 12, 9, 30, 60).map((s) => ({ ...s, capacity: 20 })),
  });

  await createCourse({
    title: "Guided Meditation for Beginners",
    description: "An 8-week introduction to mindfulness and seated meditation practice. Learn to calm the mind and cultivate presence.",
    level: "beginner",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-04-14",
    endDate: "2026-06-02",
    price: 96,
    dropInPrice: 14,
    instructorId: priya._id,
    instructorName: priya.name,
    location: STUDIO_LOCATION,
    image: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&auto=format&fit=crop&q=80",
    sessions: weeklySlots("2026-04-14", 8, 10, 0, 60).map((s) => ({ ...s, capacity: 15 })),
  });

  await createCourse({
    title: "Breathwork & Pranayama",
    description: "Discover the transformative power of conscious breathing. This beginner course covers foundational pranayama techniques to reduce stress and boost energy.",
    level: "beginner",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-04-10",
    endDate: "2026-06-19",
    price: 84,
    dropInPrice: 12,
    instructorId: ava._id,
    instructorName: ava.name,
    location: ONLINE,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80",
    sessions: weeklySlots("2026-04-10", 10, 18, 0, 45).map((s) => ({ ...s, capacity: 25 })),
  });

  await createCourse({
    title: "Winter Mindfulness Workshop",
    description: "Two days of breath, posture alignment and meditation. A nurturing weekend retreat suitable for all beginners.",
    level: "beginner",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-05-10",
    endDate: "2026-05-11",
    price: 120,
    dropInPrice: null,
    instructorId: ava._id,
    instructorName: ava.name,
    location: STUDIO_LOCATION,
    image: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=800&auto=format&fit=crop&q=80",
    sessions: workshopSlots("2026-05-10", 5, 9, 90).map((s) => ({ ...s, capacity: 20 })),
  });

  // ─── INTERMEDIATE COURSES ──────────────────────────────────────────────

  console.log("Creating intermediate courses...");

  await createCourse({
    title: "12-Week Vinyasa Flow",
    description: "Progressive sequences building strength and flexibility over 12 weeks. Expect dynamic movement, breath-led flows and creative sequencing.",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-04-07",
    endDate: "2026-06-23",
    price: 180,
    dropInPrice: 18,
    instructorId: ben._id,
    instructorName: ben.name,
    location: STUDIO_LOCATION,
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80",
    sessions: weeklySlots("2026-04-07", 12, 18, 30, 75).map((s) => ({ ...s, capacity: 18 })),
  });

  await createCourse({
    title: "Zen Meditation & Mindful Movement",
    description: "Combining Zen sitting practice with slow mindful movement, this 8-week course deepens your meditation experience and body awareness.",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-04-09",
    endDate: "2026-05-28",
    price: 112,
    dropInPrice: 16,
    instructorId: priya._id,
    instructorName: priya.name,
    location: STUDIO_LOCATION,
    image: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&auto=format&fit=crop&q=80",
    sessions: weeklySlots("2026-04-09", 8, 19, 0, 75).map((s) => ({ ...s, capacity: 16 })),
  });

  await createCourse({
    title: "Transcendental Meditation Intensive",
    description: "A structured 6-week course introducing the Transcendental Meditation technique, including personalised mantra guidance and group sessions.",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    allowDropIn: false,
    startDate: "2026-05-01",
    endDate: "2026-06-05",
    price: 150,
    dropInPrice: null,
    instructorId: priya._id,
    instructorName: priya.name,
    location: STUDIO_LOCATION,
    image: "https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=800&auto=format&fit=crop&q=80",
    sessions: weeklySlots("2026-05-01", 6, 10, 0, 90).map((s) => ({ ...s, capacity: 12 })),
  });

  await createCourse({
    title: "Spring Flow Weekend Workshop",
    description: "An immersive weekend of Vinyasa Flow sequences, meditation and breathwork. Suitable for those with at least 6 months of yoga experience.",
    level: "intermediate",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-06-06",
    endDate: "2026-06-07",
    price: 160,
    dropInPrice: null,
    instructorId: ben._id,
    instructorName: ben.name,
    location: STUDIO_LOCATION,
    image: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&auto=format&fit=crop&q=80",
    sessions: workshopSlots("2026-06-06", 5, 9, 100).map((s) => ({ ...s, capacity: 16 })),
  });

  // ─── ADVANCED COURSES ──────────────────────────────────────────────────

  console.log("Creating advanced courses...");

  await createCourse({
    title: "Advanced Bikram Yoga",
    description: "26 postures and 2 breathing exercises practised in a heated room. This advanced course builds endurance, flexibility and mental focus.",
    level: "advanced",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-04-08",
    endDate: "2026-07-01",
    price: 220,
    dropInPrice: 22,
    instructorId: ben._id,
    instructorName: ben.name,
    location: STUDIO_LOCATION,
    image: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&auto=format&fit=crop&q=80",
    sessions: weeklySlots("2026-04-08", 12, 7, 0, 90).map((s) => ({ ...s, capacity: 14 })),
  });

  await createCourse({
    title: "Advanced Breathwork & Somatic Healing",
    description: "An intensive 6-week course exploring advanced pranayama, somatic release techniques and deep nervous system regulation for experienced practitioners.",
    level: "advanced",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-05-05",
    endDate: "2026-06-09",
    price: 180,
    dropInPrice: 22,
    instructorId: priya._id,
    instructorName: priya.name,
    location: ONLINE,
    image: "/static/images/advancesbreathworkandsomatichealing.jpg",
    sessions: weeklySlots("2026-05-05", 6, 19, 30, 90).map((s) => ({ ...s, capacity: 10 })),
  });

  await createCourse({
    title: "Advanced Meditation Retreat Weekend",
    description: "A silent meditation retreat weekend for experienced meditators. Includes extended sitting sessions, walking meditation and dharma talks.",
    level: "advanced",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-06-20",
    endDate: "2026-06-21",
    price: 200,
    dropInPrice: null,
    instructorId: priya._id,
    instructorName: priya.name,
    location: STUDIO_LOCATION,
    image: "/static/images/advancedmeditationandretreatweekend.jpg",
    sessions: workshopSlots("2026-06-20", 5, 8, 120).map((s) => ({ ...s, capacity: 10 })),
  });

  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
    bookingsDb.count({}),
  ]);

  console.log("— Verification —");
  console.log("Users   :", users);
  console.log("Courses :", courses);
  console.log("Sessions:", sessions);
  console.log("Bookings:", bookings);

  if (courses === 0 || sessions === 0) {
    throw new Error("Seed finished but no courses/sessions were created.");
  }

  console.log("\n✅ Seed complete.");
  console.log("Organiser login: marie-claire@yogastudio.com / password123");
  console.log("Student logins:");
  console.log("  sarah@student.local / password123");
  console.log("  stewart@student.local / password123");
}

run().catch((err) => {
  console.error("❌ Seed failed:", err?.stack || err);
  process.exit(1);
});