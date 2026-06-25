const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

function patchIndex() {
  const p = path.join(root, "index.html");
  let h = fs.readFileSync(p, "utf8");
  const reps = [
    ['<span class="section-tag centered">Step inside</span>', '<span class="section-tag centered" data-i18n="home.show_tag">Step inside</span>'],
    ['<h2 class="section-title centered">Fresh from our kitchen</h2>', '<h2 class="section-title centered" data-i18n="home.show_h2">Fresh from our kitchen</h2>'],
    ['<p class="section-subtitle centered home-showcase-lede">Warm interiors, handcrafted treats, and celebration cakes — baked with care every morning.</p>', '<p class="section-subtitle centered home-showcase-lede" data-i18n="home.show_lede">Warm interiors, handcrafted treats, and celebration cakes — baked with care every morning.</p>'],
    ['<p>Years of Excellence</p>', '<p data-i18n="home.stat_y">Years of Excellence</p>'],
    ['<p>Fresh Products Daily</p>', '<p data-i18n="home.stat_p">Fresh Products Daily</p>'],
    ['<p>Outlets Island-wide</p>', '<p data-i18n="home.stat_o">Outlets Island-wide</p>'],
    ['<p>Happy Customers</p>', '<p data-i18n="home.stat_h">Happy Customers</p>'],
    ['<span class="section-tag centered">Visit us</span>', '<span class="section-tag centered" data-i18n="home.out_tag">Visit us</span>'],
    ['<h2 class="section-title centered">Our outlets</h2>', '<h2 class="section-title centered" data-i18n="home.out_h2">Our outlets</h2>'],
    ['<p class="section-subtitle centered">Find fresh Peoples Bakers goodness near you — open early, every day.</p>', '<p class="section-subtitle centered" data-i18n="home.out_sub">Find fresh Peoples Bakers goodness near you — open early, every day.</p>'],
    ['<span class="outlet-tag">\n                Main Branch\n              </span>', '<span class="outlet-tag" data-i18n="home.out_tag_main">\n                Main Branch\n              </span>'],
    ['<span class="outlet-tag">\n                Cover Shop\n              </span>', '<span class="outlet-tag" data-i18n="home.out_tag_cover">\n                Cover Shop\n              </span>'],
    ['View all outlets on the map', '<span data-i18n="home.out_cta">View all outlets on the map</span>'],
    ['<span class="section-tag centered">Shop by category</span>', '<span class="section-tag centered" data-i18n="home.cat_tag">Shop by category</span>'],
    ['<h2 class="section-title centered">Explore our kitchen</h2>', '<h2 class="section-title centered" data-i18n="home.cat_h2">Explore our kitchen</h2>'],
    ['<p class="section-subtitle centered">Handcrafted bakery delights, from morning buns to celebration cakes.</p>', '<p class="section-subtitle centered" data-i18n="home.cat_sub">Handcrafted bakery delights, from morning buns to celebration cakes.</p>'],
    ['<h3>Breads &amp; Buns</h3>', '<h3 data-i18n="home.cat_breads">Breads &amp; Buns</h3>'],
    ['<h3>Cakes</h3>', '<h3 data-i18n="home.cat_cakes">Cakes</h3>'],
    ['<h3>Muffins</h3>', '<h3 data-i18n="home.cat_muffins">Muffins</h3>'],
    ['<h3>Cupcakes</h3>', '<h3 data-i18n="home.cat_cupcakes">Cupcakes</h3>'],
    ['<h3>Donuts</h3>', '<h3 data-i18n="home.cat_donuts">Donuts</h3>'],
    ['<h3>Eclairs</h3>', '<h3 data-i18n="home.cat_eclairs">Eclairs</h3>'],
    ['<span>Explore <i class="fa-solid fa-arrow-right"></i></span>', '<span><span data-i18n="common.explore">Explore</span> <i class="fa-solid fa-arrow-right"></i></span>'],
    ['<span class="section-tag centered">Bestsellers</span>', '<span class="section-tag centered" data-i18n="home.best_tag">Bestsellers</span>'],
    ['View all products', '<span data-i18n="home.view_products">View all products</span>'],
    ['20% off all cakes - <span>CAKE20</span>', '<span data-i18n="home.offer_banner">20% off all cakes —</span> <span>CAKE20</span>'],
    ['<span class="section-tag centered">Celebrations</span>', '<span class="section-tag centered" data-i18n="home.celeb_tag">Celebrations</span>'],
    ['<div class="card-body"><h3>Birthday Cakes</h3></div>', '<div class="card-body"><h3 data-i18n="home.cake_birthday">Birthday Cakes</h3></div>'],
    ['<div class="card-body"><h3>Wedding Cakes</h3></div>', '<div class="card-body"><h3 data-i18n="home.cake_wedding">Wedding Cakes</h3></div>'],
    ['<div class="card-body"><h3>Custom Cakes</h3></div>', '<div class="card-body"><h3 data-i18n="home.cake_custom">Custom Cakes</h3></div>'],
    ['View full cake catalogue', '<span data-i18n="home.cake_catalog_cta">View full cake catalogue</span>'],
    ['<span class="section-tag centered">Customer love</span>', '<span class="section-tag centered" data-i18n="home.test_tag">Customer love</span>'],
    ['<h2 class="section-title centered">What our customers say</h2>', '<h2 class="section-title centered" data-i18n="home.test_h2">What our customers say</h2>'],
    ['<p class="section-subtitle centered">Real stories from families who trust Peoples Bakers every day.</p>', '<p class="section-subtitle centered" data-i18n="home.test_sub">Real stories from families who trust Peoples Bakers every day.</p>'],
    ['<p class="testimonial-quote">"The cream bun at Peoples Bakers is the best I\'ve ever had. Fresh every single morning — it\'s a daily ritual for our family."</p>', '<p class="testimonial-quote" data-i18n="home.test_q1">"The cream bun at Peoples Bakers is the best I\'ve ever had. Fresh every single morning — it\'s a daily ritual for our family."</p>'],
    ['<p class="testimonial-quote">"Ordered a custom birthday cake and everyone was blown away. Taste, texture and design — everything was perfect."</p>', '<p class="testimonial-quote" data-i18n="home.test_q2">"Ordered a custom birthday cake and everyone was blown away. Taste, texture and design — everything was perfect."</p>'],
    ['<p class="testimonial-quote">"Their muffins and eclairs taste like proper bakery treats. Nothing like the mass-made stuff — you can feel the quality."</p>', '<p class="testimonial-quote" data-i18n="home.test_q3">"Their muffins and eclairs taste like proper bakery treats. Nothing like the mass-made stuff — you can feel the quality."</p>'],
    ['<span class="section-tag">Stay sweet</span>', '<span class="section-tag" data-i18n="home.news_tag">Stay sweet</span>'],
    ['<h2>Join the Peoples Bakers family</h2>', '<h2 data-i18n="home.news_h2">Join the Peoples Bakers family</h2>'],
    ['<p>Subscribe for exclusive offers, new product launches, and seasonal treats straight to your inbox.</p>', '<p data-i18n="home.news_sub">Subscribe for exclusive offers, new product launches, and seasonal treats straight to your inbox.</p>'],
    ['placeholder="your@email.com" aria-label="Email address"', 'data-i18n-placeholder="home.news_ph" placeholder="your@email.com" data-i18n-aria-label="home.news_aria" aria-label="Email address"'],
    ['<button type="submit" class="btn btn-primary">Subscribe</button>', '<button type="submit" class="btn btn-primary" data-i18n="home.news_btn">Subscribe</button>'],
    ['<span class="section-tag">Store locator</span>', '<span class="section-tag" data-i18n="home.teaser_tag">Store locator</span>'],
    ['<h2 class="section-title">Find a Peoples Bakers near you</h2>', '<h2 class="section-title" data-i18n="home.teaser_h2">Find a Peoples Bakers near you</h2>'],
    ['<p>Search by city, filter by outlet type, use your location, and open Google Maps directions in one tap.</p>', '<p data-i18n="home.teaser_sub">Search by city, filter by outlet type, use your location, and open Google Maps directions in one tap.</p>'],
    ['Open Find Us page', '<span data-i18n="home.teaser_btn">Open Find Us page</span>'],
  ];
  reps.forEach(([a, b]) => {
    if (h.includes(a)) h = h.replace(a, b);
  });
  fs.writeFileSync(p, h);
}

function patchOrder() {
  const p = path.join(root, "order.html");
  let h = fs.readFileSync(p, "utf8");
  const reps = [
    ['aria-label="Why order with us"', 'data-i18n-aria-label="order.page.trust_aria" aria-label="Why order with us"'],
    ['<li><i class="fa-solid fa-bolt" aria-hidden="true"></i> <span>~30 min city delivery</span></li>', '<li><i class="fa-solid fa-bolt" aria-hidden="true"></i> <span data-i18n="order.page.trust1">~30 min city delivery</span></li>'],
    ['<li><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> <span>Baked fresh today</span></li>', '<li><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> <span data-i18n="order.page.trust2">Baked fresh today</span></li>'],
    ['<li><i class="fa-solid fa-tags" aria-hidden="true"></i> <span>CAKE20 · 20% off cakes</span></li>', '<li><i class="fa-solid fa-tags" aria-hidden="true"></i> <span data-i18n="order.page.trust3">CAKE20 · 20% off cakes</span></li>'],
    ['<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Place your order</span>', '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> <span data-i18n="order.page.builder_kicker">Place your order</span></span>'],
    ['<h2 class="orderx-ways-title">How would you like to order?</h2>', '<h2 class="orderx-ways-title" data-i18n="order.page.builder_h2">How would you like to order?</h2>'],
    ['<p class="orderx-ways-sub">Pick whatever suits you — our team confirms your items, pricing and timing in minutes.</p>', '<p class="orderx-ways-sub" data-i18n="order.page.builder_sub">Pick whatever suits you — our team confirms your items, pricing and timing in minutes.</p>'],
    ['<span class="orderx-way-name">WhatsApp</span>', '<span class="orderx-way-name" data-i18n="order.page.way_wa_name">WhatsApp</span>'],
    ['<span class="orderx-way-text">Chat &amp; order in seconds</span>', '<span class="orderx-way-text" data-i18n="order.page.way_wa_text">Chat &amp; order in seconds</span>'],
    ['<span class="orderx-way-name">Call us</span>', '<span class="orderx-way-name" data-i18n="order.page.way_call_name">Call us</span>'],
    ['<span class="orderx-way-text">+94 11 234 5678 · 7am–9pm</span>', '<span class="orderx-way-text" data-site-phone-display data-i18n="order.page.way_call_text">+94 22 895 5477 · 7am–9pm</span>'],
    ['<span class="orderx-way-name">Uber Eats</span>', '<span class="orderx-way-name" data-i18n="order.page.way_uber_name">Uber Eats</span>'],
    ['<span class="orderx-way-text">Order on the app &middot; live tracking</span>', '<span class="orderx-way-text" data-i18n="order.page.way_uber_text">Order on the app &middot; live tracking</span>'],
    ['<span class="orderx-way-name">PickMe Food</span>', '<span class="orderx-way-name" data-i18n="order.page.way_pickme_name">PickMe Food</span>'],
    ['<span class="orderx-way-text">Fast island-wide delivery</span>', '<span class="orderx-way-text" data-i18n="order.page.way_pickme_text">Fast island-wide delivery</span>'],
    ['<span class="orderx-way-name">Website checkout</span>', '<span class="orderx-way-name" data-i18n="order.page.way_site_name">Website checkout</span>'],
    ['<span class="orderx-way-text">Basket items · pick location · confirm</span>', '<span class="orderx-way-text" data-i18n="order.page.way_site_text">Basket items · pick location · confirm</span>'],
    ['<span class="orderx-way-name">Visit an outlet</span>', '<span class="orderx-way-name" data-i18n="order.page.way_outlet_name">Visit an outlet</span>'],
    ['<span class="orderx-way-text">150+ outlets &middot; find one near you</span>', '<span class="orderx-way-text" data-i18n="order.page.way_outlet_text">150+ outlets &middot; find one near you</span>'],
    ['<i class="fa-solid fa-headset" aria-hidden="true"></i> Need it faster?</span>', '<i class="fa-solid fa-headset" aria-hidden="true"></i> <span data-i18n="order.page.aside_kicker">Need it faster?</span></span>'],
    ['<h3 class="orderx-aside-title">Talk to us directly</h3>', '<h3 class="orderx-aside-title" data-i18n="order.page.aside_h2">Talk to us directly</h3>'],
    ['<p class="orderx-aside-text">Custom, bulk, or urgent order? Chat or call and a real person sorts it instantly.</p>', '<p class="orderx-aside-text" data-i18n="order.page.aside_p">Custom, bulk, or urgent order? Chat or call and a real person sorts it instantly.</p>'],
    ['<p class="orderx-aside-also">Also on <strong>Uber Eats</strong> &amp; <strong>PickMe</strong> in supported areas.</p>', '<p class="orderx-aside-also" data-i18n-html="order.page.aside_also">Also on <strong>Uber Eats</strong> &amp; <strong>PickMe</strong> in supported areas.</p>'],
    ['<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Baked today — no day-old stock</li>', '<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span data-i18n="order.page.assure1">Baked today — no day-old stock</span></li>'],
    ['<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Hygienic, sealed packaging</li>', '<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span data-i18n="order.page.assure2">Hygienic, sealed packaging</span></li>'],
    ['<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Same price online or in-store</li>', '<li><i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span data-i18n="order.page.assure3">Same price online or in-store</span></li>'],
    ['<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Order Online</span>', '<i class="fa-solid fa-location-dot" aria-hidden="true"></i> <span data-i18n="order.page.checkout_kicker">Order Online</span></span>'],
    ['<h2 class="orderx-ways-title" id="checkout-heading">Complete your basket</h2>', '<h2 class="orderx-ways-title" id="checkout-heading" data-i18n="order.page.checkout_h2">Complete your basket</h2>'],
    ['<p class="orderx-ways-sub">Choose delivery or pickup, set your location, and confirm — like Uber Eats or PickMe, but direct with Peoples Bakers.</p>', '<p class="orderx-ways-sub" data-i18n="order.page.checkout_sub">Choose delivery or pickup, set your location, and confirm — like Uber Eats or PickMe, but direct with Peoples Bakers.</p>'],
    ['<p>Your basket is empty.</p>', '<p data-i18n="order.page.empty_p">Your basket is empty.</p>'],
    ['Browse products', '<span data-i18n="order.page.empty_btn">Browse products</span>'],
    ['<h3>Order placed!</h3>', '<h3 data-i18n="order.page.success_h3">Order placed!</h3>'],
    ['<p>Your order <strong id="co-ref"></strong> is in. Our team will confirm shortly.</p>', '<p data-i18n="order.page.success_p">Your order is in. Our team will confirm shortly.</p>'],
    ['Send on WhatsApp', '<span data-i18n="order.page.success_wa">Send on WhatsApp</span>'],
    ['<h3>Delivery &amp; location</h3>', '<h3 data-i18n="order.page.delivery_h3">Delivery &amp; location</h3>'],
    ['<label for="c-mode">How do you want it?</label>', '<label for="c-mode" data-i18n="order.page.mode_label">How do you want it?</label>'],
    ['<option value="Delivery">Delivery to my address</option>', '<option value="Delivery" data-i18n="order.page.mode_delivery">Delivery to my address</option>'],
    ['<option value="Pickup from outlet">Pickup from outlet</option>', '<option value="Pickup from outlet" data-i18n="order.page.mode_pickup">Pickup from outlet</option>'],
    ['<label for="c-area">Area / location *</label>', '<label for="c-area" data-i18n="order.page.area_label">Area / location *</label>'],
    ['placeholder="Search area — e.g. Nugegoda, Kandy"', 'data-i18n-placeholder="order.page.area_ph" placeholder="Search area — e.g. Nugegoda, Kandy"'],
    ['title="Use my location"><i class="fa-solid fa-location-crosshairs"></i> My location</button>', 'title="Use my location"><i class="fa-solid fa-location-crosshairs"></i> <span data-i18n="order.page.my_location">My location</span></button>'],
    ['<label for="c-outlet">Nearest Peoples Bakers outlet</label>', '<label for="c-outlet" data-i18n="order.page.outlet_label">Nearest Peoples Bakers outlet</label>'],
    ['<option value="">Loading outlets…</option>', '<option value="" data-i18n="order.page.outlet_loading">Loading outlets…</option>'],
    ['<p class="orderx-loc-hint" id="co-outlet-hint">We route your order to the closest branch.</p>', '<p class="orderx-loc-hint" id="co-outlet-hint" data-i18n="order.page.outlet_hint">We route your order to the closest branch.</p>'],
    ['<span>Prefer an app?</span>', '<span data-i18n="order.page.prefer_app">Prefer an app?</span>'],
    ['<h3 class="orderx-checkout-subhead">Your details</h3>', '<h3 class="orderx-checkout-subhead" data-i18n="order.page.details_h3">Your details</h3>'],
    ['<label for="c-name">Full name *</label>', '<label for="c-name" data-i18n="order.page.name_label">Full name *</label>'],
    ['<label for="c-phone">Phone (WhatsApp) *</label>', '<label for="c-phone" data-i18n="order.page.phone_label">Phone (WhatsApp) *</label>'],
    ['placeholder="07X XXX XXXX" required>', 'data-i18n-placeholder="order.page.phone_ph" placeholder="07X XXX XXXX" required>'],
    ['<label for="c-email">Email</label>', '<label for="c-email" data-i18n="order.page.email_label">Email</label>'],
    ['<span class="orderx-checkout-label">Payment method</span>', '<span class="orderx-checkout-label" data-i18n="order.page.pay_label">Payment method</span>'],
    ['Cash on delivery / pay at outlet</span>', '<span data-i18n="order.page.pay_cod">Cash on delivery / pay at outlet</span>'],
    ['Pay online — PayHere (Visa, Mastercard, LankaQR, Genie…)</span>', '<span data-i18n="order.page.pay_payhere">Pay online — PayHere (Visa, Mastercard, LankaQR, Genie…)</span>'],
    ['<p class="orderx-loc-hint" id="co-payhere-hint" hidden>Secure redirect to PayHere. Card, LankaQR &amp; mobile wallets accepted.</p>', '<p class="orderx-loc-hint" id="co-payhere-hint" hidden data-i18n="order.page.pay_payhere_hint">Secure redirect to PayHere. Card, LankaQR &amp; mobile wallets accepted.</p>'],
    ['<label for="c-notes">Notes (allergies, cake message…)</label>', '<label for="c-notes" data-i18n="order.page.notes_label">Notes (allergies, cake message…)</label>'],
    ['<span id="co-submit-label">Place order</span>', '<span id="co-submit-label" data-i18n="order.page.place_order">Place order</span>'],
    ['<h3>Your basket</h3>', '<h3 data-i18n="order.page.basket_h3">Your basket</h3>'],
    ['<span>Subtotal</span>', '<span data-i18n="order.page.subtotal">Subtotal</span>'],
    ['<span id="co-discount-label">Phone discount</span>', '<span id="co-discount-label" data-i18n="order.page.discount">Phone discount</span>'],
    ['<div class="orderx-checkout-total"><span>Estimated total</span>', '<div class="orderx-checkout-total"><span data-i18n="order.page.total">Estimated total</span>'],
    ['<p class="orderx-checkout-note">Prices are indicative; final amount confirmed by our team.</p>', '<p class="orderx-checkout-note" data-i18n="order.page.basket_note">Prices are indicative; final amount confirmed by our team.</p>'],
    ['<i class="fa-solid fa-wallet" aria-hidden="true"></i> Pay your way</h2>', '<i class="fa-solid fa-wallet" aria-hidden="true"></i> <span data-i18n="order.page.pay_title">Pay your way</span></h2>'],
    ['<i class="fa-solid fa-circle-question" aria-hidden="true"></i> Quick answers</h2>', '<i class="fa-solid fa-circle-question" aria-hidden="true"></i> <span data-i18n="order.page.faq_title">Quick answers</span></h2>'],
    ['<summary>How soon can you deliver?</summary>', '<summary data-i18n="order.faq.q1">How soon can you deliver?</summary>'],
    ['<summary>How do I pay?</summary>', '<summary data-i18n="order.faq.q2">How do I pay?</summary>'],
    ['<summary>Can you do eggless or custom cakes?</summary>', '<summary data-i18n="order.faq.q4">Can you do eggless or gluten-free cakes?</summary>'],
    ['<summary>Do you do corporate or bulk orders?</summary>', '<summary data-i18n="order.faq.q5">Do you do corporate or bulk orders?</summary>'],
    ['<p>Most city orders reach you within 30–60 minutes once confirmed. Cakes usually need <strong>4–24 hours notice</strong>, custom/tiered cakes <strong>48 hours+</strong>.</p>', '<p data-i18n-html="order.faq.a1">Most city orders reach you within 30–60 minutes once confirmed. Cakes usually need <strong>4–24 hours notice</strong>, custom/tiered cakes <strong>48 hours+</strong>.</p>'],
    ['<p>Cash on delivery, card (Visa, Mastercard, AmEx), LankaQR, Genie, eZ Cash, or bank transfer. Card links sent via WhatsApp for remote orders.</p>', '<p data-i18n="order.faq.a3">Cash on delivery, card (Visa, Mastercard, AmEx), LankaQR, Genie, eZ Cash, or direct bank transfer. Card links are sent via WhatsApp for remote orders.</p>'],
    ['<p>Yes — many cakes have eggless options and we love custom designs. Share a photo on WhatsApp and we\'ll confirm.</p>', '<p data-i18n="order.faq.a4">Yes — many of our cakes have eggless options, and we can work on gluten-free requests with advance notice. Please ask on WhatsApp so we can confirm.</p>'],
    ['<p>Absolutely — offices, events, and weddings with bulk short eats, coffee, and multi-tier cakes. We\'ll invoice you properly.</p>', '<p data-i18n="order.faq.a5">Absolutely. We service offices, events, and weddings with bulk short eats, coffee breaks, and multi-tier cakes. We\'ll also invoice you properly.</p>'],
    ['20% off all cakes — use code <span>CAKE20</span> when you order.', '<span data-i18n="order.page.offer_line">20% off all cakes — use code</span> <span>CAKE20</span> <span data-i18n="order.page.offer_code">when you order.</span>'],
    ['href="tel:+94112345678"', 'href="tel:+94228955477" data-site-phone'],
    ['+94 11 234 5678', '+94 22 895 5477'],
  ];
  reps.forEach(([a, b]) => {
    if (h.includes(a)) h = h.replace(a, b);
  });
  fs.writeFileSync(p, h);
}

function patchAccount() {
  const p = path.join(root, "account.html");
  let h = fs.readFileSync(p, "utf8");
  h = h.replace(
    "<title>My Account | Peoples Bakers</title>",
    '<title data-i18n="account.meta">My Account | Peoples Bakers</title>'
  );
  if (!h.includes("js/i18n.js")) {
    h = h.replace(
      '<script src="js/main.js"></script>',
      '<script src="js/i18n.js"></script>\n  <script src="js/main.js"></script>'
    );
  }
  const reps = [
    ['<p>Loading your account…</p>', '<p data-i18n="account.loading">Loading your account…</p>'],
    ['<h1 id="ac-welcome">Welcome back</h1>', '<h1 id="ac-welcome" data-i18n="account.welcome">Welcome back</h1>'],
    ['<p>Your orders, profile &amp; checkout details in one place.</p>', '<p data-i18n="account.hero_sub">Your orders, profile &amp; checkout details in one place.</p>'],
    ['<div class="ac-stat-label">Total orders</div>', '<div class="ac-stat-label" data-i18n="account.stat_orders">Total orders</div>'],
    ['<div class="ac-stat-label">Active now</div>', '<div class="ac-stat-label" data-i18n="account.stat_active">Active now</div>'],
    ['<div class="ac-stat-label">Total spent</div>', '<div class="ac-stat-label" data-i18n="account.stat_spent">Total spent</div>'],
    ['Order again</a>', '<span data-i18n="account.quick_order">Order again</span></a>'],
    ['Browse cakes</a>', '<span data-i18n="account.quick_browse">Browse cakes</span></a>'],
    [' WhatsApp us</a>', ' <span data-i18n="account.quick_wa">WhatsApp us</span></a>'],
    [' My orders</button>', ' <span data-i18n="account.quick_my_orders">My orders</span></button>'],
    ['<span class="ac-discount-off">OFF</span>', '<span class="ac-discount-off" data-i18n="account.off">OFF</span>'],
    ['<span class="ac-discount-tag"><i class="fa-solid fa-gift"></i> Member offer</span>', '<span class="ac-discount-tag"><i class="fa-solid fa-gift"></i> <span data-i18n="account.discount_tag">Member offer</span></span>'],
    ['<strong id="ac-discount-title">Add your phone for a discount</strong>', '<strong id="ac-discount-title" data-i18n="account.discount_title">Add your phone for a discount</strong>'],
    ['<span class="ac-discount-btn-text">Add phone number</span>', '<span class="ac-discount-btn-text" data-i18n="account.discount_btn">Add phone number</span>'],
    ['<i class="fa-solid fa-user"></i> Profile', '<i class="fa-solid fa-user"></i> <span data-i18n="account.tab_profile">Profile</span>'],
    ['<i class="fa-solid fa-house"></i> Overview', '<i class="fa-solid fa-house"></i> <span data-i18n="account.tab_overview">Overview</span>'],
    ['<i class="fa-solid fa-box"></i> My Orders', '<i class="fa-solid fa-box"></i> <span data-i18n="account.tab_orders">My Orders</span>'],
    ['<h2 id="ac-profile-heading">Your details</h2>', '<h2 id="ac-profile-heading" data-i18n="account.profile_h2">Your details</h2>'],
    ['<p class="ac-card-sub">Saved for faster checkout on your next order.</p>', '<p class="ac-card-sub" data-i18n="account.profile_sub">Saved for faster checkout on your next order.</p>'],
    ['<label for="ac-name">Full name</label>', '<label for="ac-name" data-i18n="account.lbl_name">Full name</label>'],
    ['<label for="ac-email">Email</label>', '<label for="ac-email" data-i18n="account.lbl_email">Email</label>'],
    ['<label for="ac-phone">Phone (WhatsApp)</label>', '<label for="ac-phone" data-i18n="account.lbl_phone">Phone (WhatsApp)</label>'],
    ['placeholder="07X XXX XXXX">', 'data-i18n-placeholder="account.phone_ph" placeholder="07X XXX XXXX">'],
    ['<i class="fa-solid fa-floppy-disk"></i> Save profile</button>', '<i class="fa-solid fa-floppy-disk"></i> <span data-i18n="account.save_profile">Save profile</span></button>'],
    ['<strong>Discount:</strong> <span id="ac-profile-discount-hint">', '<strong data-i18n="account.discount_label">Discount:</strong> <span id="ac-profile-discount-hint" data-i18n="account.discount_hint">'],
    ['<strong>Tip:</strong> Keep your phone number updated', '<strong data-i18n="account.tip_label">Tip:</strong> <span data-i18n="account.tip_phone">Keep your phone number updated'],
    ['<h2 id="ac-overview-heading">Your dashboard</h2>', '<h2 id="ac-overview-heading" data-i18n="account.overview_h2">Your dashboard</h2>'],
    ['<p class="ac-card-sub">Latest order &amp; quick actions at a glance.</p>', '<p class="ac-card-sub" data-i18n="account.overview_sub">Latest order &amp; quick actions at a glance.</p>'],
    ['<p>Loading…</p>', '<p data-i18n="account.loading_short">Loading…</p>'],
    ['<strong>Order online</strong>', '<strong data-i18n="account.dash_order">Order online</strong>'],
    ['<span>Delivery or pickup</span>', '<span data-i18n="account.dash_order_sub">Delivery or pickup</span>'],
    ['<strong>Order history</strong>', '<strong data-i18n="account.dash_history">Order history</strong>'],
    ['<span>Track every order</span>', '<span data-i18n="account.dash_history_sub">Track every order</span>'],
    ['<strong>Custom cake</strong>', '<strong data-i18n="account.dash_cake">Custom cake</strong>'],
    ['<span>Photo &amp; special designs</span>', '<span data-i18n="account.dash_cake_sub">Photo &amp; special designs</span>'],
    ['<strong>Find a branch</strong>', '<strong data-i18n="account.dash_branch">Find a branch</strong>'],
    ['<span>Colombo &amp; outlets</span>', '<span data-i18n="account.dash_branch_sub">Colombo &amp; outlets</span>'],
    ['<h2 id="ac-orders-heading">Order history</h2>', '<h2 id="ac-orders-heading" data-i18n="account.orders_h2">Order history</h2>'],
    ['<p class="ac-card-sub">Tap an order to see full details and track progress.</p>', '<p class="ac-card-sub" data-i18n="account.orders_sub">Tap an order to see full details and track progress.</p>'],
    ['data-order-filter="all">All</button>', 'data-order-filter="all" data-i18n="account.filter_all">All</button>'],
    ['data-order-filter="active">Active</button>', 'data-order-filter="active" data-i18n="account.filter_active">Active</button>'],
    ['data-order-filter="delivered">Delivered</button>', 'data-order-filter="delivered" data-i18n="account.filter_delivered">Delivered</button>'],
    ['data-order-filter="cancelled">Cancelled</button>', 'data-order-filter="cancelled" data-i18n="account.filter_cancelled">Cancelled</button>'],
    ['placeholder="Search orders…" aria-label="Search orders"', 'data-i18n-placeholder="account.search_ph" placeholder="Search orders…" data-i18n-aria-label="account.search_aria" aria-label="Search orders"'],
    ['href="#" aria-label="Instagram" class="social-icon"><i class="fa-brands fa-instagram"></i></a>', 'href="https://www.instagram.com/peoplesbakers/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="social-icon" data-social-instagram><i class="fa-brands fa-instagram"></i></a>'],
  ];
  reps.forEach(([a, b]) => {
    if (h.includes(a)) h = h.replace(a, b);
  });
  fs.writeFileSync(p, h);
}

patchIndex();
patchOrder();
patchAccount();
console.log("HTML i18n wired");
