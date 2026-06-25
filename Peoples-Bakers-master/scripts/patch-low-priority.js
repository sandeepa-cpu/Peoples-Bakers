/**
 * One-time patch: social URLs, extended i18n keys (home, order.page, account).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const IG = "https://www.instagram.com/peoplesbakers/";
const LI = "https://www.linkedin.com/company/peoples-bakers/";

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function writeJson(rel, data) {
  fs.writeFileSync(path.join(root, rel), JSON.stringify(data, null, 2) + "\n");
}

function patchSocialHtml(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, "utf8");
  let changed = false;

  const igTop =
    'href="' +
    IG +
    '" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="social-icon" data-social-instagram';
  if (html.includes('href="#" aria-label="Instagram" class="social-icon"')) {
    html = html.replace(
      /href="#" aria-label="Instagram" class="social-icon"/g,
      igTop
    );
    changed = true;
  }
  if (html.includes('href="#" aria-label="Instagram" class="social-icon"><i')) {
    html = html.replace(
      /href="#" aria-label="Instagram" class="social-icon"><i/g,
      igTop + "><i"
    );
    changed = true;
  }

  const liTop =
    'href="' +
    LI +
    '" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" class="social-icon" data-social-linkedin';
  if (html.includes('href="#" aria-label="LinkedIn" class="social-icon"')) {
    html = html.replace(
      /href="#" aria-label="LinkedIn" class="social-icon"/g,
      liTop
    );
    changed = true;
  }

  const igFoot =
    'href="' +
    IG +
    '" class="footer-social footer-social--ig" data-social-instagram target="_blank" rel="noopener noreferrer" aria-label="Instagram"';
  if (html.includes('href="#" class="footer-social footer-social--ig" aria-label="Instagram"')) {
    html = html.replace(
      /href="#" class="footer-social footer-social--ig" aria-label="Instagram"/g,
      igFoot
    );
    changed = true;
  }

  if (file === "legacy.html") {
    html = html.replace(
      /href="#" class="ab-csr-link"/g,
      'href="legacy.html#csr" class="ab-csr-link"'
    );
    html = html.replace(
      /href="#" class="btn btn-outline" data-i18n="legacy.part_fr"/g,
      'href="find-us.html" class="btn btn-outline" data-i18n="legacy.part_fr"'
    );
    changed = true;
  }

  if (changed) fs.writeFileSync(p, html);
}

[
  "index.html",
  "order.html",
  "products.html",
  "find-us.html",
  "feedback.html",
  "special-cake.html",
  "legacy.html",
  "account.html",
].forEach(patchSocialHtml);

const en = readJson("js/translations/en.json");

en.home.show_tag = "Step inside";
en.home.show_h2 = "Fresh from our kitchen";
en.home.show_lede =
  "Warm interiors, handcrafted treats, and celebration cakes — baked with care every morning.";
en.home.out_cta = "View all outlets on the map";
en.home.view_products = "View all products";
en.home.offer_banner = "20% off all cakes —";
en.home.celeb_tag = "Celebrations";
en.home.cake_birthday = "Birthday Cakes";
en.home.cake_wedding = "Wedding Cakes";
en.home.cake_custom = "Custom Cakes";
en.home.cake_cupcakes = "Cupcakes";
en.home.cake_catalog_cta = "View full cake catalogue";
en.home.test_tag = "Customer love";
en.home.test_h2 = "What our customers say";
en.home.test_sub =
  "Real stories from families who trust Peoples Bakers every day.";
en.home.test_q1 =
  '"The cream bun at Peoples Bakers is the best I\'ve ever had. Fresh every single morning — it\'s a daily ritual for our family."';
en.home.test_q2 =
  '"Ordered a custom birthday cake and everyone was blown away. Taste, texture and design — everything was perfect."';
en.home.test_q3 =
  '"Their muffins and eclairs taste like proper bakery treats. Nothing like the mass-made stuff — you can feel the quality."';
en.home.news_tag = "Stay sweet";
en.home.news_h2 = "Join the Peoples Bakers family";
en.home.news_sub =
  "Subscribe for exclusive offers, new product launches, and seasonal treats straight to your inbox.";
en.home.news_ph = "your@email.com";
en.home.news_aria = "Email address";
en.home.news_btn = "Subscribe";
en.home.news_done = "Subscribed ✓";
en.home.teaser_tag = "Store locator";
en.home.teaser_h2 = "Find a Peoples Bakers near you";
en.home.teaser_sub =
  "Search by city, filter by outlet type, use your location, and open Google Maps directions in one tap.";
en.home.teaser_btn = "Open Find Us page";

en.order.page = {
  trust1: "~30 min city delivery",
  trust2: "Baked fresh today",
  trust3: "CAKE20 · 20% off cakes",
  trust_aria: "Why order with us",
  builder_kicker: "Place your order",
  builder_h2: "How would you like to order?",
  builder_sub:
    "Pick whatever suits you — our team confirms your items, pricing and timing in minutes.",
  way_wa_name: "WhatsApp",
  way_wa_text: "Chat & order in seconds",
  way_call_name: "Call us",
  way_call_text: "{{phone}} · 7am–9pm",
  way_uber_name: "Uber Eats",
  way_uber_text: "Order on the app · live tracking",
  way_pickme_name: "PickMe Food",
  way_pickme_text: "Fast island-wide delivery",
  way_site_name: "Website checkout",
  way_site_text: "Basket items · pick location · confirm",
  way_outlet_name: "Visit an outlet",
  way_outlet_text: "150+ outlets · find one near you",
  aside_kicker: "Need it faster?",
  aside_h2: "Talk to us directly",
  aside_p:
    "Custom, bulk, or urgent order? Chat or call and a real person sorts it instantly.",
  aside_wa: "WhatsApp",
  aside_also:
    "Also on <strong>Uber Eats</strong> & <strong>PickMe</strong> in supported areas.",
  assure1: "Baked today — no day-old stock",
  assure2: "Hygienic, sealed packaging",
  assure3: "Same price online or in-store",
  checkout_kicker: "Order Online",
  checkout_h2: "Complete your basket",
  checkout_sub:
    "Choose delivery or pickup, set your location, and confirm — like Uber Eats or PickMe, but direct with Peoples Bakers.",
  empty_p: "Your basket is empty.",
  empty_btn: "Browse products",
  success_h3: "Order placed!",
  success_p:
    "Your order is in. Our team will confirm shortly.",
  success_wa: "Send on WhatsApp",
  delivery_h3: "Delivery & location",
  mode_label: "How do you want it?",
  mode_delivery: "Delivery to my address",
  mode_pickup: "Pickup from outlet",
  area_label: "Area / location *",
  area_ph: "Search area — e.g. Nugegoda, Kandy",
  my_location: "My location",
  outlet_label: "Nearest Peoples Bakers outlet",
  outlet_loading: "Loading outlets…",
  outlet_hint: "We route your order to the closest branch.",
  prefer_app: "Prefer an app?",
  details_h3: "Your details",
  name_label: "Full name *",
  phone_label: "Phone (WhatsApp) *",
  phone_ph: "07X XXX XXXX",
  email_label: "Email",
  pay_label: "Payment method",
  pay_cod: "Cash on delivery / pay at outlet",
  pay_payhere:
    "Pay online — PayHere (Visa, Mastercard, LankaQR, Genie…)",
  pay_payhere_hint:
    "Secure redirect to PayHere. Card, LankaQR & mobile wallets accepted.",
  notes_label: "Notes (allergies, cake message…)",
  place_order: "Place order",
  basket_h3: "Your basket",
  subtotal: "Subtotal",
  discount: "Phone discount",
  total: "Estimated total",
  basket_note: "Prices are indicative; final amount confirmed by our team.",
  pay_title: "Pay your way",
  faq_title: "Quick answers",
  offer_line: "20% off all cakes — use code",
  offer_code: "when you order.",
};

en.account = {
  meta: "My Account | Peoples Bakers",
  loading: "Loading your account…",
  welcome: "Welcome back, {{name}}",
  welcome_default: "Customer",
  hero_sub: "Your orders, profile & checkout details in one place.",
  stat_orders: "Total orders",
  stat_active: "Active now",
  stat_spent: "Total spent",
  quick_order: "Order again",
  quick_browse: "Browse cakes",
  quick_wa: "WhatsApp us",
  quick_my_orders: "My orders",
  discount_tag: "Member offer",
  discount_title: "Add your phone for a discount",
  discount_btn: "Add phone number",
  off: "OFF",
  tab_profile: "Profile",
  tab_overview: "Overview",
  tab_orders: "My Orders",
  profile_h2: "Your details",
  profile_sub: "Saved for faster checkout on your next order.",
  lbl_name: "Full name",
  lbl_email: "Email",
  lbl_phone: "Phone (WhatsApp)",
  phone_ph: "07X XXX XXXX",
  save_profile: "Save profile",
  discount_label: "Discount:",
  discount_hint:
    "Add a valid mobile number to unlock checkout discounts on your orders.",
  tip_label: "Tip:",
  tip_phone:
    "Keep your phone number updated — we use it for delivery updates and order confirmations on WhatsApp.",
  overview_h2: "Your dashboard",
  overview_sub: "Latest order & quick actions at a glance.",
  loading_short: "Loading…",
  dash_order: "Order online",
  dash_order_sub: "Delivery or pickup",
  dash_history: "Order history",
  dash_history_sub: "Track every order",
  dash_cake: "Custom cake",
  dash_cake_sub: "Photo & special designs",
  dash_branch: "Find a branch",
  dash_branch_sub: "Colombo & outlets",
  orders_h2: "Order history",
  orders_sub: "Tap an order to see full details and track progress.",
  filter_all: "All",
  filter_active: "Active",
  filter_delivered: "Delivered",
  filter_cancelled: "Cancelled",
  search_ph: "Search orders…",
  search_aria: "Search orders",
  empty_title: "No orders yet",
  empty_sub: "Your order history will appear here.",
  order_now: "Order now",
  order_online: "Order online",
  no_match: "No orders match your search.",
  profile_saved: "Profile saved successfully.",
  profile_save_fail: "Could not save profile.",
  gate_login: "Please sign in to view your account.",
  gate_btn: "Sign in",
  latest_none: "No orders yet — start your first order!",
  latest_label: "Latest order",
  track_placed: "Placed",
  track_confirmed: "Confirmed",
  track_preparing: "Preparing",
  track_delivered: "Delivered",
  cancel_order: "Cancel order",
  cancelling: "Cancelling…",
  order_again: "Order again",
  order_id: "Order ID",
  server_error:
    "Can't reach the server. Open http://localhost:3000 (run npm start — not Live Server or file://).",
};

writeJson("js/translations/en.json", en);

const si = readJson("js/translations/si.json");
Object.assign(si.home, {
  hero_f3: "දිව තුළ බෙදාහැරීම",
  also_on: "මේ වේදිකාවලද ලබාගත හැක",
  why_tag: "ඇයි Peoples Bakers",
  why_h2: "සෑම උදෑසනකම fresh, සෑම දිනකම විශ්වාසය",
  why_lead:
    "ගුණාත්මක අමුද්‍රව්‍ය, අවංක බේකිං, දිව තුළ outlet — ඔබේ favourite treat එක දුර නැත.",
  why_c1h: "දිනපතා fresh",
  why_c1p: "සෑම loaf, bun සහ cake එකක්ම උදෑසන oven එකෙන්.",
  why_c2h: "ගුණාත්මක අමුද්‍රව්‍ය",
  why_c2p: "විශ්වාස කළ හැකි local & imported ingredients.",
  why_c3h: "දිව තුළ outlet",
  why_c3p: "Peoples Bakers goodness ඔබේ නිවසට ළඟ.",
  why_c4h: "ආදරයෙන් සාදන",
  why_c4p: "අපේ passionate bakers සාදන traditional recipes.",
  stat_y: "වසර ගණනක උ excellence",
  stat_p: "දිනපතා fresh products",
  stat_o: "දිව තුළ outlet",
  stat_h: "සතුටු customers",
  out_tag: "අප හමුවන්න",
  out_h2: "අපේ outlet",
  out_sub: "ඔබ ළඟ fresh Peoples Bakers — හැම දිනකම early open.",
  out_tag_main: "Main Branch",
  out_tag_cover: "Cover Shop",
  cat_tag: "category අනුව",
  cat_h2: "අපේ kitchen explore කරන්න",
  cat_sub: "උදෑසන buns සිට celebration cakes දක්වා handcrafted delights.",
  cat_breads: "Breads & Buns",
  cat_cakes: "Cakes",
  cat_muffins: "Muffins",
  cat_cupcakes: "Cupcakes",
  cat_donuts: "Donuts",
  cat_eclairs: "Eclairs",
  best_tag: "Bestsellers",
  show_tag: "ඇතුළට පියවර",
  show_h2: "අපේ kitchen එකෙන් fresh",
  show_lede:
    "උණුසුම් interiors, handcrafted treats, celebration cakes — හැම උදෑසනකම care එක්ක bake.",
  out_cta: "Map එකේ සියලු outlet බලන්න",
  view_products: "සියලු products බලන්න",
  offer_banner: "සියලු cakes වල 20% off —",
  celeb_tag: "Celebrations",
  cake_birthday: "Birthday Cakes",
  cake_wedding: "Wedding Cakes",
  cake_custom: "Custom Cakes",
  cake_cupcakes: "Cupcakes",
  cake_catalog_cta: "සම්පූර්ණ cake catalogue බලන්න",
  test_tag: "Customer love",
  test_h2: "අපේ customers කියන දේ",
  test_sub: "Peoples Bakers trust කරන families වල real stories.",
  test_q1:
    '"Peoples Bakers cream bun එක best. හැම උදෑසනකම fresh — අපේ family routine එක."',
  test_q2:
    '"Custom birthday cake එක order කළා — taste, texture, design හැම දෙයක් perfect."',
  test_q3:
    '"Muffins සහ eclairs proper bakery treats වගේ. Mass-made stuff වලට වඩා quality feel වෙනවා."',
  news_tag: "Sweet රැඳී සිටින්න",
  news_h2: "Peoples Bakers family එකට join වන්න",
  news_sub:
    "Exclusive offers, new products, seasonal treats — inbox එකට straight.",
  news_ph: "your@email.com",
  news_aria: "Email address",
  news_btn: "Subscribe",
  news_done: "Subscribed ✓",
  teaser_tag: "Store locator",
  teaser_h2: "ඔබ ළඟ Peoples Bakers outlet එකක්",
  teaser_sub:
    "City search, outlet type filter, location use — Google Maps directions one tap.",
  teaser_btn: "Find Us page open කරන්න",
});

si.order.page = {
  trust1: "~30 min city delivery",
  trust2: "අද bake කළ fresh",
  trust3: "CAKE20 · cakes 20% off",
  trust_aria: "ඇයි අපිත් order කරන්න",
  builder_kicker: "ඔබේ order එක දාන්න",
  builder_h2: "කොහොමද order කරන්නේ?",
  builder_sub:
    "ඔබට සුදුසු method එක pick කරන්න — items, price, timing minutes ඇතුළත confirm.",
  way_wa_name: "WhatsApp",
  way_wa_text: "Chat කර seconds ඇතුළත order",
  way_call_name: "Call us",
  way_call_text: "{{phone}} · 7am–9pm",
  way_uber_name: "Uber Eats",
  way_uber_text: "App එකෙන් order · live tracking",
  way_pickme_name: "PickMe Food",
  way_pickme_text: "Fast island-wide delivery",
  way_site_name: "Website checkout",
  way_site_text: "Basket · location · confirm",
  way_outlet_name: "Outlet visit",
  way_outlet_text: "150+ outlets · ළඟ outlet සොයන්න",
  aside_kicker: "Fast ඕනද?",
  aside_h2: "Direct talk කරන්න",
  aside_p: "Custom, bulk, urgent? Chat/call — real person instant sort.",
  aside_wa: "WhatsApp",
  aside_also:
    "Supported areas වල <strong>Uber Eats</strong> & <strong>PickMe</strong> ද.",
  assure1: "අද bake — day-old stock නැත",
  assure2: "Hygienic, sealed packaging",
  assure3: "Online/in-store same price",
  checkout_kicker: "Order Online",
  checkout_h2: "Basket complete කරන්න",
  checkout_sub:
    "Delivery/pickup, location set, confirm — Uber/PickMe වගේ, direct Peoples Bakers.",
  empty_p: "Basket empty.",
  empty_btn: "Products browse",
  success_h3: "Order placed!",
  success_p: "Order එක in. Team confirm කරනවා.",
  success_wa: "WhatsApp send",
  delivery_h3: "Delivery & location",
  mode_label: "කොහොමද ඕන?",
  mode_delivery: "Address එකට delivery",
  mode_pickup: "Outlet pickup",
  area_label: "Area / location *",
  area_ph: "Area search — e.g. Nugegoda, Kandy",
  my_location: "My location",
  outlet_label: "Nearest Peoples Bakers outlet",
  outlet_loading: "Outlets load…",
  outlet_hint: "Closest branch එකට route.",
  prefer_app: "App prefer?",
  details_h3: "Your details",
  name_label: "Full name *",
  phone_label: "Phone (WhatsApp) *",
  phone_ph: "07X XXX XXXX",
  email_label: "Email",
  pay_label: "Payment method",
  pay_cod: "Cash on delivery / outlet pay",
  pay_payhere: "Pay online — PayHere (Visa, Mastercard, LankaQR, Genie…)",
  pay_payhere_hint: "PayHere secure redirect.",
  notes_label: "Notes (allergies, cake message…)",
  place_order: "Place order",
  basket_h3: "Your basket",
  subtotal: "Subtotal",
  discount: "Phone discount",
  total: "Estimated total",
  basket_note: "Prices indicative; final amount team confirm.",
  pay_title: "Pay your way",
  faq_title: "Quick answers",
  offer_line: "cakes 20% off — code",
  offer_code: "order කරද්දී.",
};

si.order.hero.status = "Open · ~30 min delivery";
si.order.hero.h1 = "Fresh order, ";
si.order.hero.h1_accent = "ඔබේ way";
si.order.hero.lede =
  "WhatsApp, delivery apps, direct line, walk in — oven-fresh quality 2015 සිට trust.";
si.order.hero.p1 = "අද bake — day-old stock නැත";
si.order.hero.p2 = "Hygienic, sealed packaging";
si.order.hero.p3 = "Phone එකේ real humans";
si.order.hero.p4 = "Online/in-store same price";

si.account = {
  meta: "My Account | Peoples Bakers",
  loading: "Account load වෙනවා…",
  welcome: "Welcome back, {{name}}",
  welcome_default: "Customer",
  hero_sub: "Orders, profile & checkout details එක තැනක.",
  stat_orders: "Total orders",
  stat_active: "Active now",
  stat_spent: "Total spent",
  quick_order: "Order again",
  quick_browse: "Cakes browse",
  quick_wa: "WhatsApp us",
  quick_my_orders: "My orders",
  discount_tag: "Member offer",
  discount_title: "Discount සඳහා phone add කරන්න",
  discount_btn: "Phone number add",
  off: "OFF",
  tab_profile: "Profile",
  tab_overview: "Overview",
  tab_orders: "My Orders",
  profile_h2: "Your details",
  profile_sub: "Next order fast checkout සඳහා saved.",
  lbl_name: "Full name",
  lbl_email: "Email",
  lbl_phone: "Phone (WhatsApp)",
  phone_ph: "07X XXX XXXX",
  save_profile: "Profile save",
  discount_label: "Discount:",
  discount_hint: "Valid mobile add කර checkout discounts unlock කරන්න.",
  tip_label: "Tip:",
  tip_phone: "Phone update — delivery updates & WhatsApp confirmations.",
  overview_h2: "Your dashboard",
  overview_sub: "Latest order & quick actions.",
  loading_short: "Loading…",
  dash_order: "Order online",
  dash_order_sub: "Delivery or pickup",
  dash_history: "Order history",
  dash_history_sub: "Track every order",
  dash_cake: "Custom cake",
  dash_cake_sub: "Photo & special designs",
  dash_branch: "Find a branch",
  dash_branch_sub: "Colombo & outlets",
  orders_h2: "Order history",
  orders_sub: "Order tap — details & progress.",
  filter_all: "All",
  filter_active: "Active",
  filter_delivered: "Delivered",
  filter_cancelled: "Cancelled",
  search_ph: "Search orders…",
  search_aria: "Search orders",
  empty_title: "Orders නැත",
  empty_sub: "Order history මෙතන appear වෙනවා.",
  order_now: "Order now",
  order_online: "Order online",
  no_match: "Search එකට match orders නැත.",
  profile_saved: "Profile saved successfully.",
  profile_save_fail: "Profile save වුණේ නැත.",
  gate_login: "Account බලන්න sign in.",
  gate_btn: "Sign in",
  latest_none: "Orders නැත — first order start!",
  latest_label: "Latest order",
  track_placed: "Placed",
  track_confirmed: "Confirmed",
  track_preparing: "Preparing",
  track_delivered: "Delivered",
  cancel_order: "Cancel order",
  cancelling: "Cancelling…",
  order_again: "Order again",
  order_id: "Order ID",
  server_error:
    "Server reach වෙන්න බැරි. http://localhost:3000 open (npm start).",
};

writeJson("js/translations/si.json", si);

const ta = readJson("js/translations/ta.json");
Object.assign(ta.home, en.home);
ta.order = ta.order || {};
ta.order.page = en.order.page;
ta.account = en.account;
writeJson("js/translations/ta.json", ta);

console.log("Patched translations and social HTML links.");
