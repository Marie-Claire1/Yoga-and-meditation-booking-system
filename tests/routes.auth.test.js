import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal, loginAs } from "./helpers.js";

describe("Authentication routes", () => {
  let data;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  test("POST /auth/login with valid credentials redirects home", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send("email=student@test.local&password=password123")
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });

  test("POST /auth/login with wrong password re-renders login with error", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send("email=student@test.local&password=wrongpassword")
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Invalid email or password/i);
  });

  test("POST /auth/login with unknown email re-renders login with error", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send("email=nobody@test.local&password=password123")
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Invalid email or password/i);
  });

  test("POST /auth/register creates account and redirects to login", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send("name=New User&email=newuser@test.local&password=password123&membershipType=full")
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/auth/login");
  });

  test("POST /auth/register with duplicate email re-renders register with error", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send("name=Duplicate&email=student@test.local&password=password123&membershipType=full")
      .set("Content-Type", "application/x-www-form-urlencoded");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/already registered|error/i);
  });

  test("GET /auth/logout destroys session and redirects", async () => {
    const cookie = await loginAs(request, app, "student@test.local", "password123");
    const res = await request(app)
      .get("/auth/logout")
      .set("Cookie", cookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });

  test("GET /bookings/my-bookings redirects to login when not authenticated", async () => {
    const res = await request(app).get("/bookings/my-bookings");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test("GET /organiser redirects to login when not authenticated", async () => {
    const res = await request(app).get("/organiser");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test("GET /organiser returns 403 when logged in as student", async () => {
    const cookie = await loginAs(request, app, "student@test.local", "password123");
    const res = await request(app)
      .get("/organiser")
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  test("GET /organiser returns 200 when logged in as organiser", async () => {
    const cookie = await loginAs(request, app, "organiser@test.local", "password123");
    const res = await request(app)
      .get("/organiser")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});