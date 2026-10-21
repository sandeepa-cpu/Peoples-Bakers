/**
 * Seeds initial data on first run:
 *  - one admin account
 *  - products imported from data/cakes.json
 * Safe to run multiple times (it won't duplicate).
 */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const store = require("./store");

const DEV_ADMIN_PASSWORD = "admin123";

function adminSeedCredentials() {
  const email = String(process.env.ADMIN_SEED_EMAIL || "admin@peoplesbakers.lk")
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_SEED_PASSWORD || "").trim();
  const isProd = process.env.NODE_ENV === "production";

  if (password) {
    return { email, password, source: "env" };
  }
  if (isProd) {
    return null;
  }
  return { email, password: DEV_ADMIN_PASSWORD, source: "dev" };
}

function parsePrice(label) {
  // "MRP Rs. 1600.00" -> 1600
  const m = String(label || "").match(/([\d,]+(?:\.\d+)?)/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1].replace(/,/g, "")) || 0);
}

function seedAdmin() {
  const existing = store.findOne("users", (u) => u.role === "admin");
  if (existing) return existing;

  const creds = adminSeedCredentials();
  if (!creds) {
    console.warn(
      "\n  No admin account found. Set ADMIN_SEED_PASSWORD in .env or run:\n" +
        "    npm run promote-admin -- your@email.com\n"
    );
    return null;
  }

  const user = store.insert("users", {
    name: "Bakery Admin",
    email: creds.email,
    phone: "",
    role: "admin",
    passwordHash: bcrypt.hashSync(creds.password, 10),
  });

  if (creds.source === "dev") {
    console.log(
      "\n  Seeded dev admin account:\n    email:    " +
        creds.email +
        "\n    password: " +
        DEV_ADMIN_PASSWORD +
        "\n  (dev only — set ADMIN_SEED_PASSWORD before production)\n"
    );
  } else {
    console.log("\n  Seeded admin account:\n    email:    " + creds.email + "\n");
  }
  return user;
}

function seedProducts() {
  const current = store.read("products");
  if (current.length > 0) return current;

  const cakesPath = path.join(__dirname, "..", "data", "cakes.json");
  let cakes = [];
  try {
    cakes = JSON.parse(fs.readFileSync(cakesPath, "utf8"));
  } catch (err) {
    console.warn("  Could not read data/cakes.json, skipping product seed.");
    return [];
  }

  const rows = cakes.map((c) => {
    const price = parsePrice(c.price);
    return {
      id: store.genId("prd"),
      createdAt: new Date().toISOString(),
      title: c.title || "Untitled",
      category: c.category || "other",
      description: c.description || "",
      price,
      priceLabel: c.price || "",
      imageUrl: c.imageUrl || "",
      imageAlt: c.imageAlt || c.title || "",
      available: price > 0,
    };
  });
  store.write("products", rows);
  console.log("  Seeded " + rows.length + " products from data/cakes.json");
  return rows;
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Insert bakery catalogue extras that are not already in the products table. */
function seedCatalogExtras() {
  const oldHulan = store.findOne(
    "products",
    (p) => normalizeTitle(p.title) === "hulan wiskothu 100g"
  );
  if (oldHulan) {
    store.update("products", oldHulan.id, {
      title: "Hulan Biscuit 150g (Small)",
    });
  }

  const extras = [
    {
      title: "Katta Sambol Bun",
      category: "savory",
      description: "Spicy coconut sambol packed in a golden baked bun.",
      price: 110,
      priceLabel: "Rs. 110",
      imageUrl: "images/savory/katta-sambol-bun.png",
      imageAlt: "Katta sambol bun",
      available: true,
    },
    {
      title: "Iced Coffee",
      category: "drinks",
      description: "Chilled PB iced coffee, bold and refreshing. 185 ml.",
      price: 180,
      priceLabel: "Rs. 180",
      imageUrl: "images/drinks/pb-iced-coffee.png",
      imageAlt: "PB iced coffee",
      available: true,
    },
    {
      title: "Rose Faluda Drink",
      category: "drinks",
      description: "Sweet rose-flavoured faluda drink, ice cold. 185 ml.",
      price: 170,
      priceLabel: "Rs. 170",
      imageUrl: "images/drinks/pb-rose-faluda-drink.png",
      imageAlt: "PB rose faluda drink",
      available: true,
    },
    {
      title: "Mixed Fruit Drink",
      category: "drinks",
      description: "Cool mixed fruit flavoured drink. 185 ml.",
      price: 150,
      priceLabel: "Rs. 150",
      imageUrl: "images/drinks/pb-mixed-fruit-drink.png",
      imageAlt: "PB mixed fruit drink",
      available: true,
    },
    {
      title: "Lime Drink",
      category: "drinks",
      description: "Zesty lime flavoured drink, ice cold. 185 ml.",
      price: 140,
      priceLabel: "Rs. 140",
      imageUrl: "images/drinks/pb-lime-drink.png",
      imageAlt: "PB lime drink",
      available: true,
    },
    {
      title: "Mango Drink",
      category: "drinks",
      description: "Sweet mango flavoured drink, chilled. 185 ml.",
      price: 140,
      priceLabel: "Rs. 140",
      imageUrl: "images/drinks/pb-mango-drink.png",
      imageAlt: "PB mango drink",
      available: true,
    },
    {
      title: "Orange Drink",
      category: "drinks",
      description: "Refreshing orange flavoured drink. 185 ml.",
      price: 140,
      priceLabel: "Rs. 140",
      imageUrl: "images/drinks/pb-orange-drink.png",
      imageAlt: "PB orange drink",
      available: true,
    },
    {
      title: "Pineapple Drink",
      category: "drinks",
      description: "Tropical pineapple flavoured drink. 185 ml.",
      price: 140,
      priceLabel: "Rs. 140",
      imageUrl: "images/drinks/pb-pineapple-drink.png",
      imageAlt: "PB pineapple drink",
      available: true,
    },
    {
      title: "Rusks 100g",
      category: "cookies",
      description: "Twice-baked golden rusks in a 100g pack.",
      price: 110,
      priceLabel: "Rs. 110",
      imageUrl: "images/cookies/pb-rusks-100g.png",
      imageAlt: "Peoples Bakers rusks 100g",
      available: true,
    },
    {
      title: "Rusks 200g",
      category: "cookies",
      description: "Twice-baked golden rusks in a 200g pack — crunchy with tea.",
      price: 200,
      priceLabel: "Rs. 200",
      imageUrl: "images/cookies/pb-rusks-200g.png",
      imageAlt: "Peoples Bakers rusks 200g",
      available: true,
    },
    {
      title: "Wine Biscuits 90g",
      category: "cookies",
      description: "Classic wine biscuits in a 90g pack — a tea-time favourite.",
      price: 140,
      priceLabel: "Rs. 140",
      imageUrl: "images/cookies/pb-wine-biscuits-90g.png",
      imageAlt: "Peoples Bakers wine biscuits 90g",
      available: true,
    },
    {
      title: "Hulan Biscuit 150g (Small)",
      category: "cookies",
      description: "Light, airy hulan biscuits in the 150g small pack.",
      price: 133,
      priceLabel: "Rs. 133",
      imageUrl: "images/cookies/pb-hulan-biscuit-150g.png",
      imageAlt: "Peoples Bakers hulan biscuit 150g small",
      available: true,
    },
    {
      title: "Hulan Biscuit 260g (Large)",
      category: "cookies",
      description: "Light, airy hulan biscuits in the 260g large pack.",
      price: 215,
      priceLabel: "Rs. 215",
      imageUrl: "images/cookies/pb-hulan-biscuit-260g.png",
      imageAlt: "Peoples Bakers hulan biscuit 260g large",
      available: true,
    },
    {
      title: "Wiskirigngna 140g (Small)",
      category: "cookies",
      description: "Sugar-dusted wiskirigngna in the 140g small pack.",
      price: 102,
      priceLabel: "Rs. 102",
      imageUrl: "images/cookies/pb-wiskirigngna-140g.png",
      imageAlt: "Peoples Bakers wiskirigngna 140g small",
      available: true,
    },
    {
      title: "Wiskirigngna 350g (Large)",
      category: "cookies",
      description: "Sugar-dusted wiskirigngna in the 350g large pack.",
      price: 240,
      priceLabel: "Rs. 240",
      imageUrl: "images/cookies/pb-wiskirigngna-350g.png",
      imageAlt: "Peoples Bakers wiskirigngna 350g large",
      available: true,
    },
    {
      title: "Wiskirigngna Pieces 150g",
      category: "cookies",
      description: "Bite-size wiskirigngna pieces in a 150g pack.",
      price: 65,
      priceLabel: "Rs. 65",
      imageUrl: "images/cookies/pb-wiskirigngna-pcs-150g.png",
      imageAlt: "Peoples Bakers wiskirigngna pieces 150g",
      available: true,
    },
    {
      title: "Macaroni Biscuit Vanilla 175g (Small)",
      category: "cookies",
      description: "Vanilla macaroni biscuits in the 175g small pack.",
      price: 130,
      priceLabel: "Rs. 130",
      imageUrl: "images/cookies/pb-macaroni-vanilla-175g.png",
      imageAlt: "Peoples Bakers macaroni biscuit vanilla 175g small",
      available: true,
    },
    {
      title: "Macaroni Biscuit Vanilla 350g (Large)",
      category: "cookies",
      description: "Vanilla macaroni biscuits in the 350g large pack.",
      price: 230,
      priceLabel: "Rs. 230",
      imageUrl: "images/cookies/pb-macaroni-vanilla-350g.png",
      imageAlt: "Peoples Bakers macaroni biscuit vanilla 350g large",
      available: true,
    },
    {
      title: "Macaroni Biscuit Chocolate 175g (Small)",
      category: "cookies",
      description: "Chocolate macaroni biscuits in the 175g small pack.",
      price: 140,
      priceLabel: "Rs. 140",
      imageUrl: "images/cookies/pb-macaroni-chocolate-175g.png",
      imageAlt: "Peoples Bakers macaroni biscuit chocolate 175g small",
      available: true,
    },
    {
      title: "Macaroni Biscuit Chocolate 350g (Large)",
      category: "cookies",
      description: "Chocolate macaroni biscuits in the 350g large pack.",
      price: 250,
      priceLabel: "Rs. 250",
      imageUrl: "images/cookies/pb-macaroni-chocolate-350g.png",
      imageAlt: "Peoples Bakers macaroni biscuit chocolate 350g large",
      available: true,
    },
    {
      title: "Mini Macaroni Biscuit Vanilla 100g",
      category: "cookies",
      description: "Mini vanilla macaroni biscuits in a 100g pack.",
      price: 85,
      priceLabel: "Rs. 85",
      imageUrl: "images/cookies/pb-mini-macaroni-vanilla-100g.png",
      imageAlt: "Peoples Bakers mini macaroni biscuit vanilla 100g",
      available: true,
    },
    {
      title: "Vanilla Cookies 90g",
      category: "cookies",
      description: "Vanilla flavoured cookies in a 90g pack.",
      price: 115,
      priceLabel: "Rs. 115",
      imageUrl: "images/cookies/pb-cookies-vanilla-90g.png",
      imageAlt: "Peoples Bakers vanilla cookies 90g",
      available: true,
    },
    {
      title: "Kisses 100g",
      category: "cookies",
      description: "Colourful meringue kisses in a 100g pack.",
      price: 150,
      priceLabel: "Rs. 150",
      imageUrl: "images/cookies/pb-kisses-100g.jpg",
      imageAlt: "Peoples Bakers kisses 100g",
      available: true,
    },
    {
      title: "Jujubes 100g",
      category: "cookies",
      description: "Soft fruit jujubes in a 100g pack — pineapple, strawberry, lemon, mango and orange.",
      price: 150,
      priceLabel: "Rs. 150",
      imageUrl: "images/cookies/pb-jujubes-100g.png",
      imageAlt: "Peoples Bakers jujubes 100g",
      available: true,
    },
    {
      title: "Icing Gem Biscuits 70g",
      category: "cookies",
      description: "Classic icing gem biscuits in a 70g pack.",
      price: 115,
      priceLabel: "Rs. 115",
      imageUrl: "images/cookies/pb-icing-gem-biscuits-70g.png",
      imageAlt: "Peoples Bakers icing gem biscuits 70g",
      available: true,
    },
    {
      title: "Fresh Bread",
      category: "breads",
      description: "Daily baked loaves — soft inside, golden crust.",
      price: 150,
      priceLabel: "From Rs. 150",
      imageUrl: "images/breads/fresh-bread-loaf.png",
      imageAlt: "Fresh bread",
      available: true,
    },
    {
      title: "Cream Bun",
      category: "breads",
      description: "Fluffy bun with rich vanilla cream filling.",
      price: 80,
      priceLabel: "Rs. 80",
      imageUrl: "images/breads/cream-bun.png",
      imageAlt: "Cream bun",
      available: true,
    },
    {
      title: "Seeni Sambol Roll",
      category: "savory",
      description: "Sweet onion relish wrapped in soft bakery bread.",
      price: 120,
      priceLabel: "Rs. 120",
      imageUrl: "images/savory/seeni-sambol-roll.png",
      imageAlt: "Seeni sambol roll",
      available: true,
    },
    {
      title: "Sausage Roll",
      category: "savory",
      description: "Crisp pastry with seasoned sausage filling.",
      price: 180,
      priceLabel: "Rs. 180",
      imageUrl: "images/savory/sausage-roll.png",
      imageAlt: "Sausage roll",
      available: true,
    },
    {
      title: "Fish Bun",
      category: "savory",
      description: "Soft bun with spiced fish filling — a bakery staple.",
      price: 100,
      priceLabel: "Rs. 100",
      imageUrl: "images/savory/fish-bun.png",
      imageAlt: "Fish bun",
      available: true,
    },
    {
      title: "Egg Bun",
      category: "savory",
      description: "Fluffy bun with a whole boiled egg inside.",
      price: 90,
      priceLabel: "Rs. 90",
      imageUrl: "images/savory/egg-bun.png",
      imageAlt: "Egg bun",
      available: true,
    },
    {
      title: "Vegetable Roll",
      category: "savory",
      description: "Crispy golden roll with seasoned vegetable filling.",
      price: 110,
      priceLabel: "Rs. 110",
      imageUrl: "images/savory/vegetable-roll.png",
      imageAlt: "Vegetable roll",
      available: true,
    },
    {
      title: "Chicken Puff",
      category: "savory",
      description: "Flaky puff pastry with savoury chicken filling.",
      price: 160,
      priceLabel: "Rs. 160",
      imageUrl: "images/savory/chicken-puff.png",
      imageAlt: "Chicken puff",
      available: true,
    },
    {
      title: "Butter Bun",
      category: "breads",
      description: "Soft golden bun with a warm buttery finish.",
      price: 90,
      priceLabel: "Rs. 90",
      imageUrl: "images/breads/butter-bun.png",
      imageAlt: "Butter bun",
      available: true,
    },
    {
      title: "Classic Bakery Bun",
      category: "breads",
      description: "Everyday favourite — soft inside, lightly golden.",
      price: 70,
      priceLabel: "Rs. 70",
      imageUrl: "images/breads/classic-bakery-bun.png",
      imageAlt: "Classic bakery bun",
      available: true,
    },
    {
      title: "Cherry Jam Bun",
      category: "breads",
      description: "Sesame-coated bun with a sweet cherry centre.",
      price: 110,
      priceLabel: "Rs. 110",
      imageUrl: "images/breads/cherry-jam-bun.png",
      imageAlt: "Cherry jam bun",
      available: true,
    },
    {
      title: "Butter Croissant",
      category: "breads",
      description: "Layered, flaky, baked fresh each morning.",
      price: 280,
      priceLabel: "Rs. 280",
      imageUrl: "images/breads/butter-croissant.png",
      imageAlt: "Butter croissant",
      available: true,
    },
    {
      title: "Chocolate Swiss Roll",
      category: "sweets",
      description: "Soft chocolate sponge rolled with cream.",
      price: 850,
      priceLabel: "Rs. 850",
      imageUrl: "images/home/hero-chocolate-swiss-roll.png",
      imageAlt: "Chocolate Swiss Roll",
      available: true,
    },
    {
      title: "Cupcakes",
      category: "sweets",
      description: "Assorted flavours — ideal for sharing.",
      price: 220,
      priceLabel: "Rs. 220 each",
      imageUrl: "images/sweets/vanilla-sprinkle-cupcake.png",
      imageAlt: "Cupcakes",
      available: true,
    },
    {
      title: "Vanilla Sprinkle Cupcake",
      category: "sweets",
      description: "Classic vanilla cupcake topped with colourful sprinkles.",
      price: 220,
      priceLabel: "Rs. 220",
      imageUrl: "images/sweets/vanilla-sprinkle-cupcake.png",
      imageAlt: "Vanilla sprinkle cupcake",
      available: true,
    },
    {
      title: "White Cream Cupcake",
      category: "sweets",
      description: "Buttercream swirl with delicate gold star sprinkles.",
      price: 240,
      priceLabel: "Rs. 240",
      imageUrl: "images/sweets/white-cream-cupcake.png",
      imageAlt: "White cream cupcake",
      available: true,
    },
    {
      title: "Chocolate Frosting Cupcake",
      category: "sweets",
      description: "Moist chocolate cake with rich cocoa frosting.",
      price: 260,
      priceLabel: "Rs. 260",
      imageUrl: "images/sweets/chocolate-cupcake.png",
      imageAlt: "Chocolate frosting cupcake",
      available: true,
    },
    {
      title: "Apple Glaze Cupcake",
      category: "sweets",
      description: "Festive spiced cupcake with bright apple glaze topping.",
      price: 250,
      priceLabel: "Rs. 250",
      imageUrl: "images/sweets/apple-cupcake.png",
      imageAlt: "Apple glaze cupcake",
      available: true,
    },
    {
      title: "Glazed Donuts",
      category: "sweets",
      description: "Soft rings with classic sugar glaze.",
      price: 150,
      priceLabel: "Rs. 150 each",
      imageUrl: "images/sweets/glazed-donut.png",
      imageAlt: "Glazed donuts",
      available: true,
    },
    {
      title: "Fruit Tart",
      category: "sweets",
      description: "Custard base with seasonal fresh fruit.",
      price: 450,
      priceLabel: "Rs. 450",
      imageUrl: "images/sweets/fruit-tart.png",
      imageAlt: "Fruit tart",
      available: true,
    },
    {
      title: "Chocolate Chip Muffin",
      category: "sweets",
      description: "Double chocolate muffin loaded with chips.",
      price: 200,
      priceLabel: "Rs. 200",
      imageUrl: "images/sweets/chocolate-chip-muffin.png",
      imageAlt: "Chocolate chip muffin",
      available: true,
    },
    {
      title: "Dark Chocolate Muffin",
      category: "sweets",
      description: "Deep cocoa muffin with melted chocolate centre.",
      price: 210,
      priceLabel: "Rs. 210",
      imageUrl: "images/sweets/dark-chocolate-muffin.png",
      imageAlt: "Dark chocolate muffin",
      available: true,
    },
    {
      title: "Banana Muffin",
      category: "sweets",
      description: "Soft banana muffin — perfect with morning tea.",
      price: 180,
      priceLabel: "Rs. 180",
      imageUrl: "images/sweets/banana-muffin.png",
      imageAlt: "Banana muffin",
      available: true,
    },
    {
      title: "Vanilla Muffin",
      category: "sweets",
      description: "Classic buttery vanilla muffin, baked fresh daily.",
      price: 160,
      priceLabel: "Rs. 160",
      imageUrl: "images/sweets/vanilla-muffin.png",
      imageAlt: "Vanilla muffin",
      available: true,
    },
    {
      title: "Strawberry Muffin",
      category: "sweets",
      description: "Pink berry muffin with real strawberry chunks.",
      price: 220,
      priceLabel: "Rs. 220",
      imageUrl: "images/sweets/strawberry-muffin.png",
      imageAlt: "Strawberry muffin",
      available: true,
    },
    {
      title: "Chocolate Sprinkle Donut",
      category: "sweets",
      description: "Chocolate-glazed donut finished with rainbow sprinkles.",
      price: 180,
      priceLabel: "Rs. 180",
      imageUrl: "images/sweets/chocolate-donut.png",
      imageAlt: "Chocolate sprinkle donut",
      available: true,
    },
    {
      title: "Strawberry Glaze Donut",
      category: "sweets",
      description: "Pink-glazed ring donut with a sweet berry finish.",
      price: 170,
      priceLabel: "Rs. 170",
      imageUrl: "images/sweets/strawberry-donut.png",
      imageAlt: "Strawberry glaze donut",
      available: true,
    },
    {
      title: "Chocolate Eclair",
      category: "sweets",
      description: "Choux pastry filled with cream, topped with chocolate.",
      price: 190,
      priceLabel: "Rs. 190",
      imageUrl: "images/sweets/chocolate-eclair.png",
      imageAlt: "Chocolate eclair",
      available: true,
    },
    {
      title: "Cream Eclair",
      category: "sweets",
      description: "Classic eclair with vanilla cream and chocolate drizzle.",
      price: 200,
      priceLabel: "Rs. 200",
      imageUrl: "images/sweets/cream-eclair.png",
      imageAlt: "Cream eclair",
      available: true,
    },
    {
      title: "Chocolate Wafer Stack",
      category: "sweets",
      description: "Crispy layered wafers with rich chocolate cream.",
      price: 150,
      priceLabel: "Rs. 150",
      imageUrl: "images/sweets/chocolate-wafer.png",
      imageAlt: "Chocolate wafer stack",
      available: true,
    },
  ];

  extras.forEach((item) => {
    const existing = store.findOne(
      "products",
      (p) => normalizeTitle(p.title) === normalizeTitle(item.title)
    );
    if (existing) {
      if (item.category === "cookies") {
        store.update("products", existing.id, {
          description: item.description,
          price: item.price,
          priceLabel: item.priceLabel,
          imageUrl: item.imageUrl,
          imageAlt: item.imageAlt,
          category: "cookies",
          available: true,
        });
      }
      return;
    }
    store.insert("products", item);
    console.log("  Seeded catalogue product: " + item.title);
  });
}

/** Mark zero-price catalogue rows as unavailable (safe on every start). */
function fixZeroPriceProducts() {
  const rows = store.read("products");
  if (!rows.length) return;
  let changed = false;
  const updated = rows.map((p) => {
    const price = Math.max(0, Number(p.price) || 0);
    if (price <= 0 && p.available !== false) {
      changed = true;
      return { ...p, available: false };
    }
    return p;
  });
  if (changed) store.write("products", updated);
}

function run() {
  seedAdmin();
  seedProducts();
  seedCatalogExtras();
  fixZeroPriceProducts();
}

module.exports = {
  run,
  seedAdmin,
  seedProducts,
  seedCatalogExtras,
  fixZeroPriceProducts,
  parsePrice,
};

// Allow `npm run seed`
if (require.main === module) {
  run();
  console.log("  Seeding complete.");
}
