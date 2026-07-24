const basePath = require('../basePath');

module.exports = function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect(basePath + '/login');
};
