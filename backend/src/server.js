import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Backend running on http://${host}:${port}`);
});