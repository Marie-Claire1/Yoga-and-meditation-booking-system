import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";

describe("SSR view routes", () => {
  let data;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  test("GET / renders home page with courses", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Serenity|Yoga|Courses/i);
  });

  test("GET /courses renders courses list with Test Course", async () => {
    const res = await request(app).get("/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id renders course detail page", async () => {
    const res = await request(app).get(`/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id with bad id returns 404", async () => {
    const res = await request(app).get("/courses/does-not-exist");
    expect(res.status).toBe(404);
  });

  test("GET /auth/login renders login page", async () => {
    const res = await request(app).get("/auth/login");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Login|Sign in/i);
  });

  test("GET /auth/register renders register page", async () => {
    const res = await request(app).get("/auth/register");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Register|Create account/i);
  });
});