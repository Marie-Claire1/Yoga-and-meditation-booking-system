import { Router } from 'express';
import { UserModel } from '../models/userModel.js';

const router = Router();

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.verifyPassword(email, password);
    if (!user) {
      return res.render('login', { title: 'Login', error: 'Invalid email or password' });
    }
    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    res.render('login', { title: 'Login', error: 'Something went wrong' });
  }
});

router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, membershipType } = req.body;
    const validTypes = ['full', 'student'];
    const type = validTypes.includes(membershipType) ? membershipType : 'full';
    await UserModel.register(name, email, password, 'student', type);
    res.redirect('/auth/login');
  } catch (err) {
    res.render('register', { title: 'Register', error: err.message });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

export default router;