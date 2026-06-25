const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "..", "js", "main.js");
let s = fs.readFileSync(p, "utf8");
const old = `    document.querySelectorAll('[data-site-phone]').forEach(function (el) {
      el.setAttribute('href', 'tel:' + tel.replace(/\\s/g, ''));
      el.textContent = telDisplay;
    });
  }`;
const neu = `    document.querySelectorAll('[data-site-phone]').forEach(function (el) {
      el.setAttribute('href', 'tel:' + tel.replace(/\\s/g, ''));
      el.textContent = telDisplay;
    });
    if (cfg.instagramUrl) {
      document.querySelectorAll('[data-social-instagram]').forEach(function (el) {
        el.setAttribute('href', cfg.instagramUrl);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      });
    }
    if (cfg.linkedinUrl) {
      document.querySelectorAll('[data-social-linkedin]').forEach(function (el) {
        el.setAttribute('href', cfg.linkedinUrl);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      });
    }
  }`;
if (!s.includes(old)) {
  console.error("main.js pattern missing");
  process.exit(1);
}
s = s.replace(
  old,
  neu
);
s = s.replace(
  "updateLinks({\n        whatsappNumber: '947228955477',",
  "updateLinks({\n        instagramUrl: 'https://www.instagram.com/peoplesbakers/',\n        linkedinUrl: 'https://www.linkedin.com/company/peoples-bakers/',\n        whatsappNumber: '947228955477',"
);
fs.writeFileSync(p, s);
console.log("main.js patched");
