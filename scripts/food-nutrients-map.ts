// Which USDA entry each catalog food's micronutrients come from.
//
// Every food in FOOD_PRESETS (src/lib/food-presets.ts) is listed, matched or
// not, so scripts/build-food-nutrients.ts can tell "no honest match, on
// purpose" (null) from "added to the catalog and forgotten here" (missing). A
// null food still gets grams and ounces from its serving weight — it only goes
// without micronutrients.
//
// Ids are FoodData Central SR Legacy (April 2018) fdc_ids, the last full
// release of USDA's reference nutrient database. Branded entries are avoided:
// a catalog food is a generic, and a brand's fortification would be passed off
// as a property of the food.
//
// `cup` overrides USDA's household cup weight, and null suppresses cups for a
// food where they'd be a strange thing to offer. Where the catalog serving is
// already written in cups or spoons ("1 cup (148 g)"), that wins over both.
//
// `iodine` is a DB_ID in the USDA, FDA and ODS-NIH iodine database, for a food
// that database files under a different code than the SR Legacy match above;
// foods it files under the same code are joined without being listed. null
// refuses that automatic join. Where a cooked entry stands in for a raw food
// it's a vegetable or fruit, where iodine runs well under a microgram per 100 g
// either way and the difference is noise.
//
// `japan` is a five-digit food number in the Standard Tables of Food
// Composition in Japan, for chromium, molybdenum and biotin, which no US
// database measures. The build adjusts it for moisture, so a raw entry can
// stand in for a cooked food; a note says when a near relative stands in.
//
// `extra` is per 100 g, in each nutrient's unit, for a value no database
// carries but chemistry fixes.

import type { NutrientKey } from "@/lib/nutrients";

export type UsdaMatch = {
  fdc: number;
  cup?: number | null;
  iodine?: number | null;
  japan?: string;
  extra?: Partial<Record<NutrientKey, number>>;
  note?: string;
};

export const USDA_MATCHES: Record<string, UsdaMatch | null> = {
  // Proteins
  "Chicken Breast": { fdc: 171477, japan: "11288" },
  "Chicken Thigh": { fdc: 172388, japan: "11224" },
  "Turkey Breast": { fdc: 174516, iodine: 30 },
  "Lean Ground Beef (5%)": { fdc: 171791, iodine: 251, japan: "11272" },
  "Ground Beef (15%)": { fdc: 174032, iodine: 251, japan: "11272" },
  "Ground Turkey (7%)": { fdc: 174492, iodine: 189 },
  "Sirloin Steak": { fdc: 168635, cup: null, iodine: 260, japan: "11270", note: "imported beef round stands in for chromium, molybdenum and biotin" },
  "Ribeye Steak": { fdc: 170220, cup: null, iodine: 260, japan: "11268", note: "loin/sirloin steak stands in for iodine" },
  "Pork Loin": { fdc: 168233, iodine: 333, japan: "11124" },
  "Lamb Leg": { fdc: 174314, iodine: 252, japan: "11283", note: "lamb chop stands in for iodine" },
  "Venison": { fdc: 175085, japan: "11275" },
  "Salmon": { fdc: 175168, japan: "10442" },
  "Tuna, Canned in Water": { fdc: 173709 },
  "Tuna Steak": { fdc: 173707, japan: "10253", note: "bluefin, the entry matching the catalog macros" },
  "Cod": { fdc: 171956, iodine: 186, japan: "10205" },
  "Haddock": { fdc: 174198 },
  "Tilapia": { fdc: 175177 },
  "Mackerel": { fdc: 175120, japan: "10160" },
  "Sardines, Canned": { fdc: 175139 },
  "Prawns": { fdc: 175180, iodine: 132, japan: "10468", note: "Argentine red shrimp stands in for chromium, molybdenum and biotin" },
  "Firm Tofu": { fdc: 172475, iodine: 458, japan: "04032" },
  "Tempeh": { fdc: 174272, japan: "04063" },
  "Seitan": null,
  "Edamame, Shelled": { fdc: 168411, japan: "06017" },
  "Ham": { fdc: 168296, iodine: 26, japan: "11176" },
  "Deli Turkey Slices": { fdc: 172941 },
  "Chicken Sausage": { fdc: 173871, cup: null, note: "fresh turkey sausage; USDA has no chicken-only entry, and its smoked ones carry curing-salt iron and ascorbate as if they were nutrients" },
  "Pork Sausage": { fdc: 174578, cup: null, iodine: 28, japan: "11307" },
  "Bacon": { fdc: 168322, cup: null, iodine: 29, japan: "11315" },
  "Beef Jerky": { fdc: 167536, cup: null, japan: "11107" },

  // Dairy & Eggs
  "Whole Egg": { fdc: 171287, japan: "12004" },
  "Egg White": { fdc: 172183, iodine: 358, japan: "12014" },
  "Greek Yogurt, 0%": { fdc: 170894, japan: "13054", note: "plain nonfat yogurt stands in for chromium, molybdenum and biotin" },
  "Greek Yogurt, 5%": { fdc: 171304, japan: "13025", note: "plain whole yogurt stands in for chromium, molybdenum and biotin" },
  "Skyr": { fdc: 170894, japan: "13054", note: "nonfat Greek yogurt; USDA has no skyr, and the two are close; plain nonfat yogurt stands in for chromium, molybdenum and biotin" },
  "Cottage Cheese, 2%": { fdc: 172182 },
  "Plain Yogurt, Whole": { fdc: 171284, japan: "13025" },
  "Whole Milk": { fdc: 171265, japan: "13003" },
  "Semi-Skimmed Milk": { fdc: 171267, japan: "13005", note: "2% milk" },
  "Skimmed Milk": { fdc: 171269, japan: "13006" },
  "Soy Milk, Unsweetened": { fdc: 175215, japan: "04052" },
  "Almond Milk, Unsweetened": { fdc: 174832, cup: 240, note: "USDA weighs a cup at 262 g, which is heavier than the milk is" },
  "Cheddar Cheese": { fdc: 173414, japan: "13037" },
  "Mozzarella": { fdc: 170845, iodine: 191 },
  "Feta": { fdc: 173420 },
  "Halloumi": null,
  "Parmesan, Grated": { fdc: 171247 },
  "Ricotta, Part-Skim": { fdc: 171248, iodine: 350, note: "whole-milk ricotta stands in for iodine" },
  "Cream Cheese": { fdc: 173418, japan: "13035" },
  "Butter": { fdc: 173410, japan: "14017" },

  // Grains & Starches
  "White Rice": { fdc: 168878, iodine: 40, japan: "01088" },
  "Brown Rice": { fdc: 169704, iodine: 200, japan: "01085" },
  "Basmati Rice": { fdc: 169757, japan: "01088", note: "unenriched long-grain white; USDA has no basmati", iodine: 40 },
  "Rolled Oats, Dry": { fdc: 173904, japan: "01004" },
  "Instant Oats": { fdc: 171661, japan: "01004" },
  "Quinoa": { fdc: 168917, japan: "01167" },
  "Couscous": { fdc: 169700 },
  "Barley": { fdc: 170285, japan: "01170" },
  "Pasta, Dry": { fdc: 169736, japan: "01063" },
  "Wholemeal Pasta, Dry": { fdc: 169738, iodine: 233, note: "none measured cooked, so none dry" },
  "Sweet Potato": { fdc: 168483, japan: "02008" },
  "White Potato": { fdc: 170093, japan: "02064" },
  "Mashed Potato": { fdc: 168555, iodine: 293 },
  "Wholemeal Bread": { fdc: 172688, cup: null, japan: "01208" },
  "White Bread": { fdc: 174924, cup: null, japan: "01026" },
  "Sourdough": { fdc: 172675, cup: null, japan: "01031", note: "French bread stands in for chromium, molybdenum and biotin" },
  "Bagel, Plain": { fdc: 174899, cup: null },
  "Wholemeal Wrap": { fdc: 174081, cup: null, iodine: 49, note: "flour tortilla stands in for iodine" },
  "Tortilla, Corn": { fdc: 175036, cup: null },
  "Naan Bread": { fdc: 171845, cup: null },
  "Rice Cakes": { fdc: 170250, cup: null },
  "Bran Flakes": { fdc: 173888 },
  "Cornflakes": { fdc: 174648, iodine: 253, japan: "01137" },
  "Granola": { fdc: 171646 },

  // Fruits
  "Banana": { fdc: 173944, cup: 150, japan: "07107", note: "cup of slices, not mashed" },
  "Apple": { fdc: 171688, japan: "07176" },
  "Orange": { fdc: 169097, japan: "07041" },
  "Blueberries": { fdc: 171711, japan: "07124" },
  "Strawberries": { fdc: 167762, japan: "07012" },
  "Raspberries": { fdc: 167755 },
  "Grapes": { fdc: 174683, japan: "07178" },
  "Pineapple": { fdc: 169124, japan: "07097" },
  "Mango": { fdc: 169910, japan: "07132" },
  "Watermelon": { fdc: 167765, japan: "07077" },
  "Cantaloupe Melon": { fdc: 169092, japan: "07174" },
  "Pear": { fdc: 169118, japan: "07091" },
  "Peach": { fdc: 169928, japan: "07184" },
  "Kiwi": { fdc: 168153, japan: "07054" },
  "Cherries": { fdc: 171719 },
  "Grapefruit": { fdc: 174673, iodine: 65, japan: "07164" },
  "Pomegranate Seeds": { fdc: 169134 },
  "Medjool Dates": { fdc: 168191 },
  "Raisins": { fdc: 168165, japan: "07117" },
  "Dried Apricots": { fdc: 173941 },

  // Vegetables
  "Broccoli": { fdc: 170379, iodine: 72, japan: "06263" },
  "Spinach": { fdc: 168462, japan: "06267" },
  "Kale": { fdc: 168421, iodine: 452, japan: "06080" },
  "Cauliflower": { fdc: 169986, iodine: 75, japan: "06054" },
  "Brussels Sprouts": { fdc: 170383, iodine: 140 },
  "Green Beans": { fdc: 169961, iodine: 77, japan: "06010" },
  "Asparagus": { fdc: 168389, iodine: 74, japan: "06007" },
  "Carrot": { fdc: 170393, iodine: 175, japan: "06214" },
  "Bell Pepper": { fdc: 170108, japan: "06245", note: "red; green pepper stands in for iodine; green pepper stands in for chromium, molybdenum and biotin", iodine: 80 },
  "Courgette": { fdc: 169291, iodine: 205, japan: "06116" },
  "Aubergine": { fdc: 169228, iodine: 315, japan: "06191" },
  "Cucumber": { fdc: 168409, iodine: 79, japan: "06065" },
  "Tomato": { fdc: 170457, japan: "06182" },
  "Cherry Tomatoes": { fdc: 170457, japan: "06183" },
  "Red Onion": { fdc: 170000, japan: "06153", note: "yellow onion stands in for chromium, molybdenum and biotin" },
  "Mushrooms": { fdc: 169251, japan: "08031" },
  "Romaine Lettuce": { fdc: 169247, iodine: 176, japan: "06314", note: "leaf lettuce stands in for iodine; leaf lettuce stands in for chromium, molybdenum and biotin" },
  "Rocket": { fdc: 169387 },
  "Beetroot": { fdc: 169145 },
  "Butternut Squash": { fdc: 169295, iodine: 81, japan: "06048", note: "hubbard/acorn squash stands in for iodine; kabocha stands in for chromium, molybdenum and biotin" },
  "Peas": { fdc: 170419, iodine: 37, japan: "06023" },
  "Sweetcorn": { fdc: 169998, iodine: 44, japan: "06175" },

  // Nuts, Seeds & Fats
  "Avocado": { fdc: 171706, cup: 150, japan: "07006", note: "Hass (California); cup of cubes", iodine: 67 },
  "Almonds": { fdc: 170567, cup: 143, japan: "05002", note: "cup of whole almonds, not sliced; fried, salted almonds stand in for chromium, molybdenum and biotin" },
  "Walnuts": { fdc: 170187 },
  "Cashews": { fdc: 170162, iodine: 455, japan: "05005", note: "fried, salted cashews stand in for chromium, molybdenum and biotin" },
  "Peanuts": { fdc: 172430, iodine: 39, japan: "05034" },
  "Pistachios": { fdc: 170184 },
  "Brazil Nuts": { fdc: 170569 },
  "Peanut Butter": { fdc: 174266, iodine: 38, japan: "05037" },
  "Almond Butter": { fdc: 168588 },
  "Olive Oil": { fdc: 171413, japan: "14001" },
  "Rapeseed Oil": { fdc: 172336, japan: "14008" },
  "Coconut Oil": { fdc: 171412 },
  "Chia Seeds": { fdc: 170554, japan: "05046" },
  "Ground Flaxseed": { fdc: 169414, japan: "05041" },
  "Pumpkin Seeds": { fdc: 170556, japan: "05006", note: "roasted, salted kernels stand in for chromium, molybdenum and biotin" },
  "Sunflower Seeds": { fdc: 170562, iodine: 168, japan: "05027", note: "fried, salted kernels stand in for chromium, molybdenum and biotin" },
  "Sesame Seeds": { fdc: 170150, japan: "05017" },
  "Olives": { fdc: 169094 },

  // Legumes
  "Chickpeas": { fdc: 173757, iodine: 456, japan: "04066" },
  "Black Beans": { fdc: 173735, iodine: 270, japan: "04008", note: "kidney beans, the same species, stand in for chromium, molybdenum and biotin" },
  "Kidney Beans": { fdc: 173740, iodine: 271, japan: "04008" },
  "Pinto Beans": { fdc: 175200, japan: "04008", note: "kidney beans, the same species, stand in for chromium, molybdenum and biotin" },
  "Butter Beans": { fdc: 174253 },
  "Green Lentils": { fdc: 172421, iodine: 457, japan: "04073" },
  "Red Lentils": { fdc: 172421, japan: "04073", note: "USDA only has red lentils raw; cooked lentils are close", iodine: 457 },
  "Split Peas": { fdc: 172429, japan: "04013" },
  "Soybeans": { fdc: 174271, japan: "04024" },
  "Baked Beans": { fdc: 175182 },
  "Refried Beans": { fdc: 172438 },
  "Hummus": { fdc: 174289 },

  // Beverages
  "Water": { fdc: 173647 },
  "Black Coffee": { fdc: 171890, japan: "16045" },
  "Tea with Milk": null,
  "Latte, Semi-Skimmed": null,
  "Cappuccino, Semi-Skimmed": null,
  "Orange Juice": { fdc: 169098, japan: "07042" },
  "Apple Juice": { fdc: 173933, iodine: 68, japan: "07149" },
  "Coconut Water": { fdc: 170174, iodine: 211 },
  "Kombucha": null,
  "Diet Cola": { fdc: 175099 },
  "Cola": { fdc: 174852 },
  "Sports Drink": { fdc: 173660 },
  "Beer": { fdc: 168746, japan: "16006" },
  "Red Wine": { fdc: 173190, iodine: 342, japan: "16011" },

  // Snacks & Sweets
  "Protein Bar": null,
  "Cereal Bar": { fdc: 167954, cup: null, iodine: 224 },
  "Trail Mix": { fdc: 167561 },
  "Dark Chocolate (70%)": { fdc: 170273, cup: null, japan: "15187" },
  "Milk Chocolate": { fdc: 167587, cup: null, japan: "15116" },
  "Popcorn, Plain": { fdc: 167959 },
  "Pretzels": { fdc: 167555, cup: null },
  "Crisps": { fdc: 169677, cup: null, japan: "15103" },
  "Digestive Biscuit": null,
  "Flapjack": null,
  "Croissant": { fdc: 174987, cup: null, japan: "01209" },
  "Blueberry Muffin": { fdc: 172765, cup: null },
  "Glazed Doughnut": { fdc: 172758, cup: null, japan: "15077" },
  "Vanilla Ice Cream": { fdc: 167575, japan: "13042" },

  // Condiments & Sauces
  "Ketchup": { fdc: 168556, japan: "17036" },
  "Mayonnaise": { fdc: 171009, iodine: 92, japan: "17042" },
  "Light Mayonnaise": { fdc: 173594, japan: "17118" },
  "Mustard": { fdc: 172234, japan: "17059", note: "Japanese prepared mustard stands in for chromium, molybdenum and biotin" },
  "Soy Sauce": { fdc: 174277, japan: "17007" },
  "Sriracha": { fdc: 171186 },
  "BBQ Sauce": { fdc: 174523 },
  "Salsa": { fdc: 174524 },
  "Tomato Pasta Sauce": { fdc: 171192 },
  "Balsamic Vinegar": { fdc: 172241, japan: "17091" },
  "Honey": { fdc: 169640, japan: "03022" },
  "Maple Syrup": { fdc: 169661, japan: "03023" },
  // Both salts are SR Legacy's table salt for sodium. Chloride is that sodium
  // scaled by atomic mass (35.45 / 22.99), since salt is sodium chloride.
  "Iodized Salt": { fdc: 173468, iodine: 19, japan: "17012", extra: { chloride: 59760 } },
  "Sea Salt, Not Iodized": { fdc: 173468, iodine: 373, japan: "17012", extra: { chloride: 59760 } },

  // Supplements — brands differ too much for a generic to be honest, apart
  // from whey and fish oil, which are close to commodities.
  "Whey Protein Powder": { fdc: 173180, cup: null },
  "Casein Protein Powder": null,
  "Vegan Protein Powder": null,
  "Protein Shake, Ready-Made": null,
  "Mass Gainer": null,
  "Creatine Monohydrate": null,
  "BCAA Powder": null,
  "Greens Powder": null,
  "Fish Oil Capsule": { fdc: 172343, cup: null },
};
