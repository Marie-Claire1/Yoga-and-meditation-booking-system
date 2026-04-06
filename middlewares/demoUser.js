import { UserModel } from '../models/userModel.js';

export const attachUser = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await UserModel.findById(req.session.userId);
      if (user) {
        req.user = user;
        res.locals.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isOrganiser: user.role === 'organiser',
          isInstructor: user.role === 'instructor',
          membershipType: user.membershipType,
          verified: user.verified,
        };
      }
    } else {
      req.user = null;
      res.locals.user = null;
    }
    next();
  } catch (err) {
    next(err);
  }
};