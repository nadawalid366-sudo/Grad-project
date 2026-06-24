import jwt from "jsonwebtoken";

// Read lazily so the value is available regardless of import order vs. when
// dotenv loads the .env file in server.js.
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET. Set it in backend/.env.");
  }
  return secret;
}

// role is "patient" or "professional"
export function signToken({ sub, email, role }) {
  return jwt.sign({ sub, email, role }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}
