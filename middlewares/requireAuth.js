export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
};

export const requireOrganiser = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/auth/login');
  }
  if (req.user && req.user.role !== 'organiser') {
    return res.status(403).render('error', {
      title: 'Access denied',
      message: 'You must be an organiser to view this page.'
    });
  }
  next();
};