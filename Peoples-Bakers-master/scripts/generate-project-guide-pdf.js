const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer-core");

(async function () {
  const root = path.join(__dirname, "..");
  const html = path.join(root, "docs", "Peoples-Bakers-Project-Guide-Sinhala.html");
  const pdf = path.join(root, "docs", "Peoples-Bakers-Project-Guide-Sinhala.pdf");
  const desktop = path.join(
    process.env.USERPROFILE || "",
    "Desktop",
    "Peoples-Bakers-Project-Guide-Sinhala.pdf"
  );

  if (!fs.existsSync(html)) {
    throw new Error("HTML source not found: " + html);
  }

  const edgePaths = [
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const executablePath = edgePaths.find((p) => fs.existsSync(p));
  if (!executablePath) {
    throw new Error("Microsoft Edge not found for PDF generation.");
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  const fileUrl = "file:///" + html.replace(/\\/g, "/");
  await page.goto(fileUrl, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdf,
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
  });
  await browser.close();

  fs.copyFileSync(pdf, desktop);
  console.log("PDF created:", pdf);
  console.log("Desktop copy:", desktop);
  console.log("Size:", fs.statSync(pdf).size, "bytes");
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
