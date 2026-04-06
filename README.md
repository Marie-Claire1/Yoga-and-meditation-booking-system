# Serenity Yoga & Mindfulness Studio — Booking System

A full-stack web application for managing yoga and mindfulness class bookings, built with Node.js, Express, NeDB and Mustache templates.

## Getting Started

### Prerequisites
- Node.js v18 or higher
- npm

### Installation

1. Clone the repository or unzip the submission folder
2. Install dependencies: npm install
3. Seed the database with sample data: node seed/seed.js
4. Start the server: npm start
5. Open your browser and go to: http://localhost:3000

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Organiser | marie-claire@yogastudio.com | *********** |
| Instructor | ava@yogastudio.com | *********** |
| Instructor | ben@yogastudio.com | *********** |
| Student | sarah@student.local | *********** |
| Student | stewart@student.local | *********** |

## Running Tests

node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand

## Features Implemented

### Public (no login required)
- Browse all courses with images, descriptions, prices and locations
- Filter courses by level and type
- Search courses by title or description
- View individual course detail pages with full session timetables

### Student features
- Register as a new user (full price or student discount membership)
- Login and logout securely
- Enrol on a full course block
- Book individual drop-in sessions where permitted
- View all bookings in My Bookings page
- Cancel course enrolments and session bookings
- Student discount of 20% off applied automatically once verified by organiser

### Organiser features
- Full dashboard to manage all courses
- Add, edit and delete courses
- Add, edit and delete individual sessions
- View class list with participant names and booking type per session
- Manage users — change roles, verify student discounts, delete accounts
- Auto-assigned course images based on class type

### Instructor features
- View assigned classes via My Classes page
- See upcoming session dates, capacity and booking counts

### Security
- Passwords hashed with bcrypt (12 salt rounds)
- Session-based authentication using express-session
- Role-based access control (student, instructor, organiser)
- requireAuth middleware protects all booking routes
- requireOrganiser middleware protects all dashboard routes
- httpOnly session cookies prevent XSS access
- Input sanitisation on all form submissions

## Tech Stack

- Runtime: Node.js
- Framework: Express
- Database: NeDB (embedded, file-based)
- Templates: Mustache
- Authentication: bcrypt + express-session
- Testing: Jest + Supertest
- Fonts: Playfair Display + Inter (Google Fonts)

## Project Structure

- controllers — Request handlers
- middlewares — Auth and user attachment middleware
- models — NeDB data access layer
- public — Static assets (CSS, images)
- routes — Express routers
- seed — Database seeding script
- services — Business logic (booking service)
- tests — Jest test suites
- views — Mustache templates

## Deployment

The live site is available at: [https://yoga-and-meditation-booking-system.onrender.com]
