import { usersDb } from './_db.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const UserModel = {
  async create(user) {
    return usersDb.insert(user);
  },

  async register(name, email, password, role = 'student', membershipType = 'full') {
    const existing = await this.findByEmail(email);
    if (existing) throw new Error('Email already registered');
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return usersDb.insert({
      name,
      email,
      passwordHash,
      role,
      membershipType,
      verified: membershipType === 'full',
    });
  },

  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    if (!user.passwordHash) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? user : null;
  },

  async findByEmail(email) {
    return usersDb.findOne({ email });
  },

  async findById(id) {
    return usersDb.findOne({ _id: id });
  },

  async listAll() {
    return usersDb.find({});
  },

  async listByRole(role) {
    return usersDb.find({ role });
  },

  async updateRole(id, role) {
    await usersDb.update({ _id: id }, { $set: { role } });
    return this.findById(id);
  },

  async updateMembership(id, membershipType) {
    const verified = membershipType === 'full';
    await usersDb.update({ _id: id }, { $set: { membershipType, verified } });
    return this.findById(id);
  },

  async verifyStudent(id) {
    await usersDb.update({ _id: id }, { $set: { verified: true } });
    return this.findById(id);
  },

  async delete(id) {
    return usersDb.remove({ _id: id }, {});
  },
};