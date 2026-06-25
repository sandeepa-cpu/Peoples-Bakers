/**
 * Promote an existing user to admin by email.
 * Usage: node scripts/promote-admin.js you@email.com
 */
const store = require("../server/store");

const email = String(process.argv[2] || "")
  .trim()
  .toLowerCase();

if (!email) {
  console.error("Usage: node scripts/promote-admin.js <email>");
  process.exit(1);
}

const user = store.findOne("users", (u) => u.email === email);
if (!user) {
  console.error("No user found with email:", email);
  console.error("Register or log in on the site first, then run this again.");
  process.exit(1);
}

if (user.role === "admin") {
  console.log("Already admin:", email);
  process.exit(0);
}

const updated = store.update("users", user.id, { role: "admin" });
const adminPath = process.env.ADMIN_PATH || "pb-office.html";
console.log("Promoted to admin:", updated.email);
console.log(
  "Staff login URL: http://localhost:" +
    (process.env.PORT || 3000) +
    "/" +
    adminPath.replace(/^\//, "")
);
console.log("(This URL is not shown on the public website.)");
