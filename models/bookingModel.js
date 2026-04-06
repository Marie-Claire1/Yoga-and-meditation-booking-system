import { bookingsDb } from './_db.js';

export const BookingModel = {
  async create(booking) {
    return bookingsDb.insert({ ...booking, createdAt: new Date().toISOString() });
  },

  async findById(id) {
    return bookingsDb.findOne({ _id: id });
  },

  async listByUser(userId) {
    return bookingsDb.find({ userId }).sort({ createdAt: -1 });
  },

  // Only active bookings for a specific session — used for class list
  async findBySession(sessionId) {
    return bookingsDb.find({ sessionId, status: 'confirmed' });
  },  

  // Only active bookings for a course
  async findByCourse(courseId) {
    return bookingsDb.find({ courseId, status: 'confirmed' });
  },

  // Prevent duplicate session bookings — only check active bookings
  async findDuplicate(userId, sessionId) {
    return bookingsDb.findOne({ userId, sessionId, status: 'confirmed' });
  },

  // Prevent duplicate course enrolments — only check active bookings
  async findCourseEnrolment(userId, courseId) {
    return bookingsDb.findOne({ userId, courseId, type: 'COURSE', status: 'confirmed' });
  },

  async cancel(id) {
    await bookingsDb.update({ _id: id }, { $set: { status: 'CANCELLED' } });
    return this.findById(id);
  },

  async delete(id) {
    return bookingsDb.remove({ _id: id }, {});
  },
};