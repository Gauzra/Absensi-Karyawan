// Cek user login
export const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "🔒 Login dulu" });
};

// Cek user admin
export const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "admin") return next();
  res.status(403).json({ message: "🚫 Hanya admin yang bisa akses" });
};
