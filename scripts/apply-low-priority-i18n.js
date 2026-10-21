/**
 * Adds low-priority i18n keys (nav, home, footer, account JS strings) to en/si/ta.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function writeJson(rel, data) {
  fs.writeFileSync(path.join(root, rel), JSON.stringify(data, null, 2) + "\n");
}

const en = readJson("js/translations/en.json");

en.nav.special_cake = "Customize Cake";
en.meta.account = "My Account | Peoples Bakers";
en.common.social_instagram = "Instagram";
en.common.social_tiktok = "TikTok";
en.common.uber_eats = "Uber Eats";
en.common.pickme = "PickMe";
en.common.scroll_down = "Scroll down";

en.footer.about =
  "For over a decade, Peoples Bakers has brought classic Sri Lankan bakery excellence to families across the island — from fresh daily bread and savouries to celebration cakes and custom photo cakes, baked with care every day.";
en.footer.products_heading = "Our Products";
en.footer.fp_breads = "Breads";
en.footer.fp_cakes = "Cakes";
en.footer.fp_savouries = "Savouries";
en.footer.fp_beverages = "Beverages";
en.footer.fp_photo_cake = "Photo Cake";
en.footer.get_touch = "Get In Touch";
en.footer.head_office = "Head Office :";
en.footer.telephone = "Telephone :";
en.footer.email_lbl = "Email :";
en.footer.office_addr = "NO.623, Egaloya, Bulathsinhala, Sri Lanka";

en.home.outlet_colombo_h = "Colombo 03";
en.home.outlet_colombo_p = "25 Galle Road, Colombo 03";
en.home.outlet_colombo_hrs = "6:00 AM - 10:00 PM";
en.home.outlet_govinna_h = "Govinna";
en.home.outlet_govinna_p = "Horana Road, Govinna";
en.home.outlet_govinna_ph = "076 149 8029 · 034 225 0002";
en.home.outlet_kandy_h = "Kandy";
en.home.outlet_kandy_p = "12 Dalada Veediya, Kandy";
en.home.outlet_kandy_hrs = "6:00 AM - 9:00 PM";

Object.assign(en.account, {
  order_cancelled: "This order was cancelled.",
  pill_paid: "Paid",
  pill_awaiting_payment: "Awaiting payment",
  pill_refund: "Refund pending",
  view_all_orders: "View all orders",
  mode_delivery: "Delivery",
  tap_details: "Tap for details",
  lbl_payment: "Payment",
  lbl_phone: "Phone",
  lbl_items: "Items",
  item_fallback: "Item",
  cancel_confirm:
    "Cancel this order? If you already paid online, our team will process a refund.",
  cancel_fail: "Could not cancel order.",
  load_orders_fail: "Could not load orders. Refresh and try again.",
  discount_title_save: "Add your phone & save on every order",
  server_outdated:
    "Server is out of date. Stop old terminals, run npm start, open http://localhost:3000, then Ctrl+Shift+R.",
});

writeJson("js/translations/en.json", en);

const si = readJson("js/translations/si.json");
si.nav.special_cake = "Cake Customize";
si.meta.account = "මගේ ගිණුම | Peoples Bakers";
si.common.social_instagram = "Instagram";
si.common.social_tiktok = "TikTok";
si.common.uber_eats = "Uber Eats";
si.common.pickme = "PickMe";
si.common.scroll_down = "පහළ scroll";

si.footer.about =
  "වසර ගණනාවක් තිස්සේ Peoples Bakers දිවයින පුරා පවුල් වලට classic Sri Lankan bakery excellence ගෙන එයි — fresh bread, savouries, celebration cakes සහ photo cakes, හැම දිනකම care එක්ක bake.";
si.footer.products_heading = "අපේ Products";
si.footer.fp_breads = "Breads";
si.footer.fp_cakes = "Cakes";
si.footer.fp_savouries = "Savouries";
si.footer.fp_beverages = "Beverages";
si.footer.fp_photo_cake = "Photo Cake";
si.footer.get_touch = "අප හා සම්බන්ධ වන්න";
si.footer.head_office = "Head Office :";
si.footer.telephone = "Telephone :";
si.footer.email_lbl = "Email :";
si.footer.office_addr = "NO.623, Egaloya, Bulathsinhala, Sri Lanka";

si.home.outlet_colombo_h = "Colombo 03";
si.home.outlet_colombo_p = "25 Galle Road, Colombo 03";
si.home.outlet_colombo_hrs = "6:00 AM - 10:00 PM";
si.home.outlet_govinna_h = "Govinna";
si.home.outlet_govinna_p = "Horana Road, Govinna";
si.home.outlet_govinna_ph = "076 149 8029 · 034 225 0002";
si.home.outlet_kandy_h = "Kandy";
si.home.outlet_kandy_p = "12 Dalada Veediya, Kandy";
si.home.outlet_kandy_hrs = "6:00 AM - 9:00 PM";

Object.assign(si.account, {
  meta: "මගේ ගිණුම | Peoples Bakers",
  loading: "ගිණුම load වෙනවා…",
  welcome: "පිළිගනිමු, {{name}}",
  welcome_default: "Customer",
  hero_sub: "Orders, profile සහ checkout details එක තැනක.",
  stat_orders: "මුළු orders",
  stat_active: "Active දැන්",
  stat_spent: "මුළු වියදම",
  quick_order: "නැවත order",
  quick_browse: "Cakes browse",
  quick_wa: "WhatsApp",
  quick_my_orders: "මගේ orders",
  discount_tag: "Member offer",
  discount_title: "Discount සඳහා phone add කරන්න",
  discount_title_save: "Phone add කර order එකකින් save වෙන්න",
  discount_btn: "Phone number add",
  tab_profile: "Profile",
  tab_overview: "Overview",
  tab_orders: "මගේ Orders",
  profile_h2: "ඔබේ details",
  profile_sub: "Next order fast checkout සඳහා save.",
  lbl_name: "Full name",
  lbl_email: "Email",
  lbl_phone: "Phone (WhatsApp)",
  save_profile: "Profile save",
  discount_hint: "Valid mobile add කර checkout discounts unlock කරන්න.",
  tip_phone: "Phone update — delivery updates සහ WhatsApp confirmations.",
  overview_h2: "Dashboard",
  overview_sub: "Latest order සහ quick actions.",
  dash_order: "Online order",
  dash_order_sub: "Delivery හෝ pickup",
  dash_history: "Order history",
  dash_history_sub: "Orders track කරන්න",
  dash_cake: "Custom cake",
  dash_cake_sub: "Photo & special designs",
  dash_branch: "Branch සොයන්න",
  dash_branch_sub: "Colombo & outlets",
  orders_h2: "Order history",
  orders_sub: "Details & progress — order tap කරන්න.",
  filter_all: "All",
  filter_active: "Active",
  filter_delivered: "Delivered",
  filter_cancelled: "Cancelled",
  search_ph: "Orders search…",
  search_aria: "Orders search",
  empty_sub: "Order history මෙතන appear වෙනවා.",
  order_now: "Order now",
  order_online: "Online order",
  no_match: "Search එකට match orders නැත.",
  profile_saved: "Profile save වුණා.",
  profile_save_fail: "Profile save වුණේ නැත.",
  gate_login: "Account බලන්න sign in.",
  gate_btn: "Sign in",
  latest_none: "Orders නැත — first order start!",
  latest_label: "Latest order",
  track_placed: "Placed",
  track_confirmed: "Confirmed",
  track_preparing: "Preparing",
  track_delivered: "Delivered",
  cancel_order: "Order cancel",
  cancelling: "Cancel වෙනවා…",
  order_again: "Order again",
  order_cancelled: "මේ order එක cancel කළා.",
  pill_paid: "Paid",
  pill_awaiting_payment: "Payment pending",
  pill_refund: "Refund pending",
  view_all_orders: "සියලු orders බලන්න",
  mode_delivery: "Delivery",
  tap_details: "Details — tap කරන්න",
  lbl_payment: "Payment",
  lbl_phone: "Phone",
  lbl_items: "Items",
  item_fallback: "Item",
  cancel_confirm:
    "Order cancel කරන්නද? Online paid නම් refund process කරනවා.",
  cancel_fail: "Order cancel වුණේ නැත.",
  load_orders_fail: "Orders load වුණේ නැත. Refresh කර try again.",
  server_outdated:
    "Server outdated. npm start කර http://localhost:3000 open කර Ctrl+Shift+R.",
  server_error: "Server reach වෙන්න බැරි. npm start කර http://localhost:3000 open කරන්න.",
});

writeJson("js/translations/si.json", si);

const ta = readJson("js/translations/ta.json");
ta.nav.special_cake = en.nav.special_cake;
ta.meta.account = "எனது கணக்கு | Peoples Bakers";
Object.assign(ta.common, {
  social_instagram: en.common.social_instagram,
  social_tiktok: en.common.social_tiktok,
  uber_eats: en.common.uber_eats,
  pickme: en.common.pickme,
  scroll_down: "கீழே scroll",
});
Object.assign(ta.footer, en.footer);
Object.assign(ta.home, {
  outlet_colombo_h: en.home.outlet_colombo_h,
  outlet_colombo_p: en.home.outlet_colombo_p,
  outlet_colombo_hrs: en.home.outlet_colombo_hrs,
  outlet_govinna_h: en.home.outlet_govinna_h,
  outlet_govinna_p: en.home.outlet_govinna_p,
  outlet_govinna_ph: en.home.outlet_govinna_ph,
  outlet_kandy_h: en.home.outlet_kandy_h,
  outlet_kandy_p: en.home.outlet_kandy_p,
  outlet_kandy_hrs: en.home.outlet_kandy_hrs,
});
Object.assign(ta.account, en.account);
ta.account.meta = ta.meta.account;
ta.account.welcome = "மீண்டும் வரவேற்கிறோம், {{name}}";
ta.account.loading = "கணக்கு load ஆகிறது…";
ta.account.hero_sub = "Orders, profile & checkout details ஒரே இடத்தில்.";
ta.account.stat_orders = "மொத்த orders";
ta.account.quick_wa = "WhatsApp";
ta.account.profile_saved = "Profile save ஆனது.";
ta.account.gate_btn = "Sign in";

writeJson("js/translations/ta.json", ta);

console.log("Updated en.json, si.json, ta.json with low-priority i18n keys.");
