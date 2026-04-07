import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mustacheExpress from "mustache-express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import rateLimit from "express-rate-limit";

import courseRoutes from "./routes/courses.js";
import sessionRoutes from "./routes/sessions.js";
import bookingRoutes from "./routes/bookings.js";
import organiserRoutes from "./routes/organiser.js";
import viewRoutes from "./routes/views.js";
import authRoutes from "./routes/auth.js";
import { attachUser } from "./middlewares/demoUser.js";
import { initDb } from "./models/_db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// ─── Security headers ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ─── Rate limiting — POST /auth/login only ────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many login attempts. Please try again in 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── View engine ───────────────────────────────────────────────────────────
app.engine(
  "mustache",
  mustacheExpress(path.join(__dirname, "views", "partials"), ".mustache")
);
app.set("view engine", "mustache");
app.set("views", path.join(__dirname, "views"));

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// ─── Session ───────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

// ─── Static files ──────────────────────────────────────────────────────────
app.use("/static", express.static(path.join(__dirname, "public")));

// ─── Attach user ───────────────────────────────────────────────────────────
app.use(attachUser);

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true }));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.post("/auth/login", loginLimiter);
app.use("/api/courses", courseRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/bookings", bookingRoutes);
app.use("/organiser", organiserRoutes);
app.use("/", viewRoutes);

// ─── Error handlers ────────────────────────────────────────────────────────
export const not_found = (req, res) =>
  res.status(404).render("error", { title: "Not found", message: "Page not found." });

export const server_error = (err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", { title: "Server error", message: "Something went wrong." });
};

app.use(not_found);
app.use(server_error);

if (process.env.NODE_ENV !== "test") {
  await initDb();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Yoga booking running on http://localhost:${PORT}`)
  );
}