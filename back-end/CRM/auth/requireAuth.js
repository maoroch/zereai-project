export const requireAuth = (req, res, next) => {
  if (req.session?.isAdmin) {
    return next();
  }
  return res.status(403).json({ success: false, error: "Нет доступа. Войдите заново." });
};
