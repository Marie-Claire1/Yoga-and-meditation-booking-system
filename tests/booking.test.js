import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal, loginAs } from "./helpers.js";
import { BookingModel } from "../models/bookingModel.js";

describe("Booking logic", () => {
  let data;
  let studentCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    studentCookie = await loginAs(request, app, "student@test.local", "password123");
  });

  test("Student can book a full course", async () => {
    const res = await request(app)
      .post(`/bookings/courses/${data.course._id}/book`)
      .set("Cookie", studentCookie)
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/my-bookings/);
  });

  test("Student cannot book the same course twice", async () => {
    const res = await request(app)
      .post(`/bookings/courses/${data.course._id}/book`)
      .set("Cookie", studentCookie)
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/already enrolled/i);
  });

  test("Student can view my-bookings page", async () => {
    const res = await request(app)
      .get("/bookings/my-bookings")
      .set("Cookie", studentCookie);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Test Course/i);
  });

  test("Student can cancel a booking", async () => {
    const bookings = await BookingModel.listByUser(data.student._id);
    const booking = bookings.find((b) => b.status === "confirmed");
    expect(booking).toBeDefined();

    const res = await request(app)
      .post(`/bookings/${booking._id}/cancel`)
      .set("Cookie", studentCookie)
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/my-bookings/);
  });

  test("Unauthenticated user cannot book a course", async () => {
    const res = await request(app)
      .post(`/bookings/courses/${data.course._id}/book`)
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });
});

describe("Drop-in booking logic", () => {
  let data;
  let studentCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    studentCookie = await loginAs(request, app, "student@test.local", "password123");
  });

  test("Student can book a single drop-in session", async () => {
    const res = await request(app)
      .post(`/bookings/sessions/${data.sessions[0]._id}/book`)
      .set("Cookie", studentCookie)
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/my-bookings/);
  });

  test("Student cannot book same session twice", async () => {
    const res = await request(app)
      .post(`/bookings/sessions/${data.sessions[0]._id}/book`)
      .set("Cookie", studentCookie)
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/already booked/i);
  });
});