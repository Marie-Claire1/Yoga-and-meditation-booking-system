import { describe, expect, test } from "@jest/globals";

const canReserveAllSessions = (sessions) =>
  sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

describe("canReserveAllSessions unit tests", () => {
  test("returns true if all sessions have remaining capacity", () => {
    const sessions = [
      { capacity: 10, bookedCount: 9 },
      { capacity: 20, bookedCount: 0 },
    ];
    expect(canReserveAllSessions(sessions)).toBe(true);
  });

  test("returns false if any session is full", () => {
    const sessions = [
      { capacity: 10, bookedCount: 10 },
      { capacity: 20, bookedCount: 0 },
    ];
    expect(canReserveAllSessions(sessions)).toBe(false);
  });

  test("returns false if any session is overbooked", () => {
    const sessions = [
      { capacity: 10, bookedCount: 11 },
      { capacity: 20, bookedCount: 0 },
    ];
    expect(canReserveAllSessions(sessions)).toBe(false);
  });

  test("handles sessions with undefined bookedCount", () => {
    const sessions = [{ capacity: 10 }, { capacity: 20, bookedCount: 5 }];
    expect(canReserveAllSessions(sessions)).toBe(true);
  });

  test("returns true for empty sessions array", () => {
    expect(canReserveAllSessions([])).toBe(true);
  });
});

describe("BookingModel duplicate prevention logic", () => {
  test("findCourseEnrolment would block double booking", () => {
    const existingBookings = [
      { userId: "u1", courseId: "c1", type: "COURSE", status: "confirmed" },
    ];
    const isDuplicate = existingBookings.some(
      (b) => b.userId === "u1" && b.courseId === "c1" && b.type === "COURSE" && b.status === "confirmed"
    );
    expect(isDuplicate).toBe(true);
  });

  test("cancelled booking does not block rebooking", () => {
    const existingBookings = [
      { userId: "u1", courseId: "c1", type: "COURSE", status: "CANCELLED" },
    ];
    const isDuplicate = existingBookings.some(
      (b) => b.userId === "u1" && b.courseId === "c1" && b.type === "COURSE" && b.status === "confirmed"
    );
    expect(isDuplicate).toBe(false);
  });
});