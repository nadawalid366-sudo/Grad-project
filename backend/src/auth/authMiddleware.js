import { verifyToken } from "./jwt.js";

// Verify the Bearer token and attach req.auth = { id, email, role }.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = verifyToken(token);
    req.auth = {
      id: payload.sub,
      email: (payload.email || "").toLowerCase(),
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

// Ensure the authenticated user owns the :email in the route (case-insensitive).
export function requireSelf(paramName = "email") {
  return (req, res, next) => {
    const target = (req.params[paramName] || "").toLowerCase();
    if (!req.auth || req.auth.email !== target) {
      return res
        .status(403)
        .json({ message: "You can only access your own data." });
    }
    return next();
  };
}

// Ensure the authenticated user has the given role.
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.auth || req.auth.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }
    return next();
  };
}
