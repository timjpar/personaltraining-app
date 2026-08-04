// The shipped food catalog, following the same reasoning as exercise-presets.ts:
// kept in code rather than the database so it works the moment it deploys, with
// no seeding step against the live Postgres.
//
// The difference from exercises is that a food preset is not just a name — it
// carries macros for one standard serving, which is the whole point. Picking
// "Avocado" fills the calorie and macro boxes; the servings multiplier in the
// builder scales from those numbers.
//
// This module is imported by a client component, so it stays data-only.

export type FoodPreset = {
  name: string;
  // Display string for one serving, e.g. "1 medium (200 g)". This is what lands
  // in Food.quantity, so it has to read well on a plan handed to an athlete.
  serving: string;
  // Per ONE serving. Integers, because the Food columns are Int.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodPresetCategory = {
  label: string;
  foods: FoodPreset[];
};

export type FoodMacros = Pick<
  FoodPreset,
  "calories" | "protein" | "carbs" | "fat"
>;

// Proteins lead: protein is the number coaches program to first. Supplements
// trail. Within a category the order is how often a food gets programmed, not
// alphabetical — the same editorial call EXERCISE_PRESETS makes.
export const FOOD_PRESETS: FoodPresetCategory[] = [
  {
    label: "Proteins",
    foods: [
      { name: "Chicken Breast", serving: "100 g cooked", calories: 165, protein: 31, carbs: 0, fat: 4 },
      { name: "Chicken Thigh", serving: "100 g cooked", calories: 209, protein: 26, carbs: 0, fat: 11 },
      { name: "Turkey Breast", serving: "100 g cooked", calories: 135, protein: 30, carbs: 0, fat: 1 },
      { name: "Lean Ground Beef (5%)", serving: "100 g cooked", calories: 176, protein: 26, carbs: 0, fat: 8 },
      { name: "Ground Beef (15%)", serving: "100 g cooked", calories: 250, protein: 26, carbs: 0, fat: 16 },
      { name: "Ground Turkey (7%)", serving: "100 g cooked", calories: 203, protein: 27, carbs: 0, fat: 10 },
      { name: "Sirloin Steak", serving: "100 g cooked", calories: 206, protein: 31, carbs: 0, fat: 8 },
      { name: "Ribeye Steak", serving: "100 g cooked", calories: 291, protein: 25, carbs: 0, fat: 21 },
      { name: "Pork Loin", serving: "100 g cooked", calories: 187, protein: 28, carbs: 0, fat: 8 },
      { name: "Lamb Leg", serving: "100 g cooked", calories: 216, protein: 29, carbs: 0, fat: 10 },
      { name: "Venison", serving: "100 g cooked", calories: 158, protein: 30, carbs: 0, fat: 3 },
      { name: "Salmon", serving: "100 g cooked", calories: 208, protein: 20, carbs: 0, fat: 13 },
      { name: "Tuna, Canned in Water", serving: "1 can (142 g)", calories: 140, protein: 33, carbs: 0, fat: 1 },
      { name: "Tuna Steak", serving: "100 g cooked", calories: 184, protein: 30, carbs: 0, fat: 6 },
      { name: "Cod", serving: "100 g cooked", calories: 105, protein: 23, carbs: 0, fat: 1 },
      { name: "Haddock", serving: "100 g cooked", calories: 112, protein: 24, carbs: 0, fat: 1 },
      { name: "Tilapia", serving: "100 g cooked", calories: 128, protein: 26, carbs: 0, fat: 3 },
      { name: "Mackerel", serving: "100 g cooked", calories: 262, protein: 24, carbs: 0, fat: 18 },
      { name: "Sardines, Canned", serving: "1 tin (92 g)", calories: 191, protein: 23, carbs: 0, fat: 11 },
      { name: "Prawns", serving: "100 g cooked", calories: 99, protein: 24, carbs: 0, fat: 0 },
      { name: "Firm Tofu", serving: "100 g", calories: 144, protein: 17, carbs: 3, fat: 9 },
      { name: "Tempeh", serving: "100 g", calories: 192, protein: 20, carbs: 8, fat: 11 },
      { name: "Seitan", serving: "100 g", calories: 141, protein: 25, carbs: 14, fat: 2 },
      { name: "Edamame, Shelled", serving: "1 cup (155 g)", calories: 189, protein: 17, carbs: 16, fat: 8 },
      { name: "Ham", serving: "100 g", calories: 145, protein: 21, carbs: 1, fat: 6 },
      { name: "Deli Turkey Slices", serving: "3 slices (56 g)", calories: 60, protein: 10, carbs: 2, fat: 1 },
      { name: "Chicken Sausage", serving: "1 link (85 g)", calories: 140, protein: 14, carbs: 2, fat: 8 },
      { name: "Pork Sausage", serving: "1 link (75 g)", calories: 230, protein: 12, carbs: 2, fat: 20 },
      { name: "Bacon", serving: "2 rashers (30 g)", calories: 130, protein: 9, carbs: 0, fat: 10 },
      { name: "Beef Jerky", serving: "30 g", calories: 120, protein: 10, carbs: 5, fat: 7 },
    ],
  },
  {
    label: "Dairy & Eggs",
    foods: [
      { name: "Whole Egg", serving: "1 large (50 g)", calories: 72, protein: 6, carbs: 0, fat: 5 },
      { name: "Egg White", serving: "1 large (33 g)", calories: 17, protein: 4, carbs: 0, fat: 0 },
      { name: "Greek Yogurt, 0%", serving: "170 g pot", calories: 100, protein: 17, carbs: 6, fat: 0 },
      { name: "Greek Yogurt, 5%", serving: "170 g pot", calories: 160, protein: 15, carbs: 6, fat: 8 },
      { name: "Skyr", serving: "150 g pot", calories: 96, protein: 17, carbs: 6, fat: 0 },
      { name: "Cottage Cheese, 2%", serving: "1 cup (226 g)", calories: 194, protein: 27, carbs: 8, fat: 6 },
      { name: "Plain Yogurt, Whole", serving: "1 cup (245 g)", calories: 149, protein: 9, carbs: 11, fat: 8 },
      { name: "Whole Milk", serving: "1 cup (244 g)", calories: 149, protein: 8, carbs: 12, fat: 8 },
      { name: "Semi-Skimmed Milk", serving: "1 cup (244 g)", calories: 122, protein: 8, carbs: 12, fat: 5 },
      { name: "Skimmed Milk", serving: "1 cup (245 g)", calories: 83, protein: 8, carbs: 12, fat: 0 },
      { name: "Soy Milk, Unsweetened", serving: "1 cup (240 ml)", calories: 80, protein: 7, carbs: 4, fat: 4 },
      { name: "Almond Milk, Unsweetened", serving: "1 cup (240 ml)", calories: 30, protein: 1, carbs: 1, fat: 3 },
      { name: "Cheddar Cheese", serving: "30 g slice", calories: 120, protein: 7, carbs: 0, fat: 10 },
      { name: "Mozzarella", serving: "30 g", calories: 85, protein: 6, carbs: 1, fat: 6 },
      { name: "Feta", serving: "30 g", calories: 79, protein: 4, carbs: 1, fat: 6 },
      { name: "Halloumi", serving: "50 g", calories: 160, protein: 11, carbs: 1, fat: 13 },
      { name: "Parmesan, Grated", serving: "1 tbsp (5 g)", calories: 22, protein: 2, carbs: 0, fat: 1 },
      { name: "Ricotta, Part-Skim", serving: "½ cup (124 g)", calories: 171, protein: 14, carbs: 6, fat: 10 },
      { name: "Cream Cheese", serving: "1 tbsp (15 g)", calories: 51, protein: 1, carbs: 1, fat: 5 },
      { name: "Butter", serving: "1 tbsp (14 g)", calories: 102, protein: 0, carbs: 0, fat: 12 },
    ],
  },
  {
    label: "Grains & Starches",
    foods: [
      { name: "White Rice", serving: "1 cup cooked (158 g)", calories: 205, protein: 4, carbs: 45, fat: 0 },
      { name: "Brown Rice", serving: "1 cup cooked (195 g)", calories: 216, protein: 5, carbs: 45, fat: 2 },
      { name: "Basmati Rice", serving: "1 cup cooked (163 g)", calories: 210, protein: 4, carbs: 46, fat: 1 },
      { name: "Rolled Oats, Dry", serving: "40 g", calories: 150, protein: 5, carbs: 27, fat: 3 },
      { name: "Instant Oats", serving: "1 sachet (35 g)", calories: 130, protein: 4, carbs: 24, fat: 3 },
      { name: "Quinoa", serving: "1 cup cooked (185 g)", calories: 222, protein: 8, carbs: 39, fat: 4 },
      { name: "Couscous", serving: "1 cup cooked (157 g)", calories: 176, protein: 6, carbs: 36, fat: 0 },
      { name: "Barley", serving: "1 cup cooked (157 g)", calories: 193, protein: 4, carbs: 44, fat: 1 },
      { name: "Pasta, Dry", serving: "75 g", calories: 263, protein: 9, carbs: 53, fat: 1 },
      { name: "Wholemeal Pasta, Dry", serving: "75 g", calories: 260, protein: 11, carbs: 50, fat: 2 },
      { name: "Sweet Potato", serving: "1 medium (150 g)", calories: 130, protein: 2, carbs: 30, fat: 0 },
      { name: "White Potato", serving: "1 medium (173 g)", calories: 161, protein: 4, carbs: 37, fat: 0 },
      { name: "Mashed Potato", serving: "1 cup (210 g)", calories: 214, protein: 4, carbs: 35, fat: 8 },
      { name: "Wholemeal Bread", serving: "1 slice (40 g)", calories: 92, protein: 4, carbs: 17, fat: 1 },
      { name: "White Bread", serving: "1 slice (36 g)", calories: 96, protein: 3, carbs: 18, fat: 1 },
      { name: "Sourdough", serving: "1 slice (50 g)", calories: 130, protein: 5, carbs: 25, fat: 1 },
      { name: "Bagel, Plain", serving: "1 medium (99 g)", calories: 260, protein: 10, carbs: 51, fat: 2 },
      { name: "Wholemeal Wrap", serving: "1 large (64 g)", calories: 190, protein: 6, carbs: 30, fat: 5 },
      { name: "Tortilla, Corn", serving: "1 small (26 g)", calories: 52, protein: 1, carbs: 11, fat: 1 },
      { name: "Naan Bread", serving: "1 piece (90 g)", calories: 262, protein: 9, carbs: 45, fat: 5 },
      { name: "Rice Cakes", serving: "2 cakes (18 g)", calories: 70, protein: 1, carbs: 15, fat: 0 },
      { name: "Bran Flakes", serving: "40 g", calories: 140, protein: 4, carbs: 30, fat: 1 },
      { name: "Cornflakes", serving: "30 g", calories: 113, protein: 2, carbs: 25, fat: 0 },
      { name: "Granola", serving: "50 g", calories: 235, protein: 5, carbs: 33, fat: 9 },
    ],
  },
  {
    label: "Fruits",
    foods: [
      { name: "Banana", serving: "1 medium (118 g)", calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: "Apple", serving: "1 medium (182 g)", calories: 95, protein: 0, carbs: 25, fat: 0 },
      { name: "Orange", serving: "1 medium (131 g)", calories: 62, protein: 1, carbs: 15, fat: 0 },
      { name: "Blueberries", serving: "1 cup (148 g)", calories: 84, protein: 1, carbs: 21, fat: 0 },
      { name: "Strawberries", serving: "1 cup (152 g)", calories: 49, protein: 1, carbs: 12, fat: 0 },
      { name: "Raspberries", serving: "1 cup (123 g)", calories: 64, protein: 1, carbs: 15, fat: 1 },
      { name: "Grapes", serving: "1 cup (151 g)", calories: 104, protein: 1, carbs: 27, fat: 0 },
      { name: "Pineapple", serving: "1 cup chunks (165 g)", calories: 83, protein: 1, carbs: 22, fat: 0 },
      { name: "Mango", serving: "1 cup (165 g)", calories: 99, protein: 1, carbs: 25, fat: 1 },
      { name: "Watermelon", serving: "1 cup (152 g)", calories: 46, protein: 1, carbs: 12, fat: 0 },
      { name: "Cantaloupe Melon", serving: "1 cup (160 g)", calories: 54, protein: 1, carbs: 13, fat: 0 },
      { name: "Pear", serving: "1 medium (178 g)", calories: 101, protein: 1, carbs: 27, fat: 0 },
      { name: "Peach", serving: "1 medium (150 g)", calories: 59, protein: 1, carbs: 14, fat: 0 },
      { name: "Kiwi", serving: "1 medium (69 g)", calories: 42, protein: 1, carbs: 10, fat: 0 },
      { name: "Cherries", serving: "1 cup (154 g)", calories: 97, protein: 2, carbs: 25, fat: 0 },
      { name: "Grapefruit", serving: "½ medium (123 g)", calories: 52, protein: 1, carbs: 13, fat: 0 },
      { name: "Pomegranate Seeds", serving: "½ cup (87 g)", calories: 72, protein: 1, carbs: 16, fat: 1 },
      { name: "Medjool Dates", serving: "2 dates (48 g)", calories: 133, protein: 1, carbs: 36, fat: 0 },
      { name: "Raisins", serving: "40 g", calories: 120, protein: 1, carbs: 32, fat: 0 },
      { name: "Dried Apricots", serving: "40 g", calories: 96, protein: 1, carbs: 25, fat: 0 },
    ],
  },
  {
    label: "Vegetables",
    foods: [
      { name: "Broccoli", serving: "1 cup (91 g)", calories: 31, protein: 3, carbs: 6, fat: 0 },
      { name: "Spinach", serving: "1 cup (30 g)", calories: 7, protein: 1, carbs: 1, fat: 0 },
      { name: "Kale", serving: "1 cup (67 g)", calories: 33, protein: 3, carbs: 6, fat: 1 },
      { name: "Cauliflower", serving: "1 cup (107 g)", calories: 27, protein: 2, carbs: 5, fat: 0 },
      { name: "Brussels Sprouts", serving: "1 cup (88 g)", calories: 38, protein: 3, carbs: 8, fat: 0 },
      { name: "Green Beans", serving: "1 cup (100 g)", calories: 31, protein: 2, carbs: 7, fat: 0 },
      { name: "Asparagus", serving: "6 spears (90 g)", calories: 20, protein: 2, carbs: 4, fat: 0 },
      { name: "Carrot", serving: "1 medium (61 g)", calories: 25, protein: 1, carbs: 6, fat: 0 },
      { name: "Bell Pepper", serving: "1 medium (119 g)", calories: 31, protein: 1, carbs: 7, fat: 0 },
      { name: "Courgette", serving: "1 medium (196 g)", calories: 33, protein: 2, carbs: 6, fat: 1 },
      { name: "Aubergine", serving: "1 cup (82 g)", calories: 20, protein: 1, carbs: 5, fat: 0 },
      { name: "Cucumber", serving: "½ medium (150 g)", calories: 23, protein: 1, carbs: 5, fat: 0 },
      { name: "Tomato", serving: "1 medium (123 g)", calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: "Cherry Tomatoes", serving: "1 cup (149 g)", calories: 27, protein: 1, carbs: 6, fat: 0 },
      { name: "Red Onion", serving: "½ medium (55 g)", calories: 22, protein: 1, carbs: 5, fat: 0 },
      { name: "Mushrooms", serving: "1 cup sliced (70 g)", calories: 15, protein: 2, carbs: 2, fat: 0 },
      { name: "Romaine Lettuce", serving: "2 cups (94 g)", calories: 16, protein: 1, carbs: 3, fat: 0 },
      { name: "Rocket", serving: "2 cups (40 g)", calories: 10, protein: 1, carbs: 1, fat: 0 },
      { name: "Beetroot", serving: "1 cup (136 g)", calories: 58, protein: 2, carbs: 13, fat: 0 },
      { name: "Butternut Squash", serving: "1 cup (140 g)", calories: 63, protein: 1, carbs: 16, fat: 0 },
      { name: "Peas", serving: "1 cup (145 g)", calories: 117, protein: 8, carbs: 21, fat: 1 },
      { name: "Sweetcorn", serving: "1 cup (164 g)", calories: 143, protein: 5, carbs: 31, fat: 2 },
    ],
  },
  {
    label: "Nuts, Seeds & Fats",
    foods: [
      { name: "Avocado", serving: "1 medium (200 g)", calories: 240, protein: 3, carbs: 13, fat: 22 },
      { name: "Almonds", serving: "28 g (23 nuts)", calories: 164, protein: 6, carbs: 6, fat: 14 },
      { name: "Walnuts", serving: "28 g", calories: 185, protein: 4, carbs: 4, fat: 18 },
      { name: "Cashews", serving: "28 g", calories: 157, protein: 5, carbs: 9, fat: 12 },
      { name: "Peanuts", serving: "28 g", calories: 161, protein: 7, carbs: 5, fat: 14 },
      { name: "Pistachios", serving: "28 g", calories: 159, protein: 6, carbs: 8, fat: 13 },
      { name: "Brazil Nuts", serving: "28 g", calories: 187, protein: 4, carbs: 3, fat: 19 },
      { name: "Peanut Butter", serving: "1 tbsp (16 g)", calories: 94, protein: 4, carbs: 3, fat: 8 },
      { name: "Almond Butter", serving: "1 tbsp (16 g)", calories: 98, protein: 3, carbs: 3, fat: 9 },
      { name: "Olive Oil", serving: "1 tbsp (14 g)", calories: 119, protein: 0, carbs: 0, fat: 14 },
      { name: "Rapeseed Oil", serving: "1 tbsp (14 g)", calories: 124, protein: 0, carbs: 0, fat: 14 },
      { name: "Coconut Oil", serving: "1 tbsp (14 g)", calories: 121, protein: 0, carbs: 0, fat: 14 },
      { name: "Chia Seeds", serving: "1 tbsp (12 g)", calories: 58, protein: 2, carbs: 5, fat: 4 },
      { name: "Ground Flaxseed", serving: "1 tbsp (7 g)", calories: 37, protein: 1, carbs: 2, fat: 3 },
      { name: "Pumpkin Seeds", serving: "28 g", calories: 158, protein: 9, carbs: 3, fat: 14 },
      { name: "Sunflower Seeds", serving: "28 g", calories: 165, protein: 5, carbs: 6, fat: 14 },
      { name: "Sesame Seeds", serving: "1 tbsp (9 g)", calories: 52, protein: 2, carbs: 2, fat: 4 },
      { name: "Olives", serving: "10 olives (35 g)", calories: 41, protein: 0, carbs: 2, fat: 4 },
    ],
  },
  {
    label: "Legumes",
    foods: [
      { name: "Chickpeas", serving: "1 cup cooked (164 g)", calories: 269, protein: 15, carbs: 45, fat: 4 },
      { name: "Black Beans", serving: "1 cup cooked (172 g)", calories: 227, protein: 15, carbs: 41, fat: 1 },
      { name: "Kidney Beans", serving: "1 cup cooked (177 g)", calories: 225, protein: 15, carbs: 40, fat: 1 },
      { name: "Pinto Beans", serving: "1 cup cooked (171 g)", calories: 245, protein: 15, carbs: 45, fat: 1 },
      { name: "Butter Beans", serving: "1 cup cooked (188 g)", calories: 216, protein: 15, carbs: 39, fat: 1 },
      { name: "Green Lentils", serving: "1 cup cooked (198 g)", calories: 230, protein: 18, carbs: 40, fat: 1 },
      { name: "Red Lentils", serving: "1 cup cooked (198 g)", calories: 212, protein: 16, carbs: 36, fat: 1 },
      { name: "Split Peas", serving: "1 cup cooked (196 g)", calories: 231, protein: 16, carbs: 41, fat: 1 },
      { name: "Soybeans", serving: "1 cup cooked (172 g)", calories: 296, protein: 31, carbs: 17, fat: 15 },
      { name: "Baked Beans", serving: "½ can (200 g)", calories: 162, protein: 10, carbs: 26, fat: 1 },
      { name: "Refried Beans", serving: "½ cup (120 g)", calories: 118, protein: 7, carbs: 20, fat: 2 },
      { name: "Hummus", serving: "2 tbsp (30 g)", calories: 70, protein: 2, carbs: 6, fat: 5 },
    ],
  },
  {
    label: "Beverages",
    foods: [
      { name: "Water", serving: "1 glass (250 ml)", calories: 0, protein: 0, carbs: 0, fat: 0 },
      { name: "Black Coffee", serving: "1 mug (240 ml)", calories: 2, protein: 0, carbs: 0, fat: 0 },
      { name: "Tea with Milk", serving: "1 mug (250 ml)", calories: 30, protein: 2, carbs: 3, fat: 1 },
      { name: "Latte, Semi-Skimmed", serving: "1 medium (350 ml)", calories: 150, protein: 10, carbs: 15, fat: 6 },
      { name: "Cappuccino, Semi-Skimmed", serving: "1 medium (350 ml)", calories: 110, protein: 7, carbs: 11, fat: 4 },
      { name: "Orange Juice", serving: "1 glass (250 ml)", calories: 112, protein: 2, carbs: 26, fat: 0 },
      { name: "Apple Juice", serving: "1 glass (250 ml)", calories: 114, protein: 0, carbs: 28, fat: 0 },
      { name: "Coconut Water", serving: "330 ml", calories: 62, protein: 2, carbs: 12, fat: 0 },
      { name: "Kombucha", serving: "1 bottle (330 ml)", calories: 50, protein: 0, carbs: 12, fat: 0 },
      { name: "Diet Cola", serving: "1 can (330 ml)", calories: 1, protein: 0, carbs: 0, fat: 0 },
      { name: "Cola", serving: "1 can (330 ml)", calories: 139, protein: 0, carbs: 35, fat: 0 },
      { name: "Sports Drink", serving: "1 bottle (500 ml)", calories: 126, protein: 0, carbs: 32, fat: 0 },
      { name: "Beer", serving: "1 pint (568 ml)", calories: 208, protein: 2, carbs: 17, fat: 0 },
      { name: "Red Wine", serving: "1 glass (175 ml)", calories: 149, protein: 0, carbs: 5, fat: 0 },
    ],
  },
  {
    label: "Snacks & Sweets",
    foods: [
      { name: "Protein Bar", serving: "1 bar (60 g)", calories: 220, protein: 20, carbs: 22, fat: 7 },
      { name: "Cereal Bar", serving: "1 bar (35 g)", calories: 140, protein: 2, carbs: 25, fat: 4 },
      { name: "Trail Mix", serving: "40 g", calories: 187, protein: 5, carbs: 17, fat: 12 },
      { name: "Dark Chocolate (70%)", serving: "4 squares (25 g)", calories: 145, protein: 2, carbs: 11, fat: 10 },
      { name: "Milk Chocolate", serving: "25 g", calories: 133, protein: 2, carbs: 14, fat: 8 },
      { name: "Popcorn, Plain", serving: "1 cup popped (8 g)", calories: 31, protein: 1, carbs: 6, fat: 0 },
      { name: "Pretzels", serving: "30 g", calories: 114, protein: 3, carbs: 24, fat: 1 },
      { name: "Crisps", serving: "1 small bag (25 g)", calories: 133, protein: 2, carbs: 13, fat: 8 },
      { name: "Digestive Biscuit", serving: "1 biscuit (15 g)", calories: 71, protein: 1, carbs: 10, fat: 3 },
      { name: "Flapjack", serving: "1 piece (60 g)", calories: 262, protein: 3, carbs: 34, fat: 13 },
      { name: "Croissant", serving: "1 medium (57 g)", calories: 231, protein: 5, carbs: 26, fat: 12 },
      { name: "Blueberry Muffin", serving: "1 muffin (113 g)", calories: 426, protein: 6, carbs: 61, fat: 18 },
      { name: "Glazed Doughnut", serving: "1 doughnut (60 g)", calories: 253, protein: 3, carbs: 31, fat: 14 },
      { name: "Vanilla Ice Cream", serving: "1 scoop (66 g)", calories: 137, protein: 2, carbs: 16, fat: 7 },
    ],
  },
  {
    label: "Condiments & Sauces",
    foods: [
      { name: "Ketchup", serving: "1 tbsp (17 g)", calories: 19, protein: 0, carbs: 5, fat: 0 },
      { name: "Mayonnaise", serving: "1 tbsp (14 g)", calories: 94, protein: 0, carbs: 0, fat: 10 },
      { name: "Light Mayonnaise", serving: "1 tbsp (15 g)", calories: 35, protein: 0, carbs: 1, fat: 3 },
      { name: "Mustard", serving: "1 tsp (5 g)", calories: 3, protein: 0, carbs: 0, fat: 0 },
      { name: "Soy Sauce", serving: "1 tbsp (16 g)", calories: 9, protein: 1, carbs: 1, fat: 0 },
      { name: "Sriracha", serving: "1 tsp (5 g)", calories: 5, protein: 0, carbs: 1, fat: 0 },
      { name: "BBQ Sauce", serving: "1 tbsp (17 g)", calories: 29, protein: 0, carbs: 7, fat: 0 },
      { name: "Salsa", serving: "2 tbsp (36 g)", calories: 10, protein: 0, carbs: 2, fat: 0 },
      { name: "Tomato Pasta Sauce", serving: "½ cup (125 g)", calories: 70, protein: 2, carbs: 11, fat: 2 },
      { name: "Balsamic Vinegar", serving: "1 tbsp (16 g)", calories: 14, protein: 0, carbs: 3, fat: 0 },
      { name: "Honey", serving: "1 tbsp (21 g)", calories: 64, protein: 0, carbs: 17, fat: 0 },
      { name: "Maple Syrup", serving: "1 tbsp (20 g)", calories: 52, protein: 0, carbs: 13, fat: 0 },
    ],
  },
  {
    label: "Supplements",
    foods: [
      { name: "Whey Protein Powder", serving: "1 scoop (30 g)", calories: 120, protein: 24, carbs: 3, fat: 2 },
      { name: "Casein Protein Powder", serving: "1 scoop (33 g)", calories: 120, protein: 24, carbs: 4, fat: 1 },
      { name: "Vegan Protein Powder", serving: "1 scoop (30 g)", calories: 110, protein: 21, carbs: 4, fat: 2 },
      { name: "Protein Shake, Ready-Made", serving: "1 bottle (330 ml)", calories: 150, protein: 25, carbs: 9, fat: 2 },
      { name: "Mass Gainer", serving: "1 scoop (100 g)", calories: 380, protein: 30, carbs: 60, fat: 4 },
      { name: "Creatine Monohydrate", serving: "1 scoop (5 g)", calories: 0, protein: 0, carbs: 0, fat: 0 },
      { name: "BCAA Powder", serving: "1 scoop (10 g)", calories: 20, protein: 5, carbs: 0, fat: 0 },
      { name: "Greens Powder", serving: "1 scoop (10 g)", calories: 35, protein: 2, carbs: 5, fat: 0 },
      { name: "Fish Oil Capsule", serving: "1 capsule (1 g)", calories: 9, protein: 0, carbs: 0, fat: 1 },
    ],
  },
];

// Same contract as normalizeExerciseName: matching and dedupe happen on this
// key, display always uses the name as written.
export function normalizeFoodName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export const FOOD_PRESET_NAMES: string[] = FOOD_PRESETS.flatMap((c) =>
  c.foods.map((f) => f.name),
);

export const FOOD_PRESET_SLUGS: Set<string> = new Set(
  FOOD_PRESET_NAMES.map(normalizeFoodName),
);

// Built once at module load. The picker and the edit page's rehydration both do
// a lookup per food row, so a linear scan of ~200 entries each time would be
// wasted work.
const BY_SLUG: Map<string, FoodPreset> = new Map(
  FOOD_PRESETS.flatMap((c) => c.foods).map((f) => [normalizeFoodName(f.name), f]),
);

export function findFoodPreset(name: string): FoodPreset | null {
  return BY_SLUG.get(normalizeFoodName(name)) ?? null;
}

// Each macro rounds on its own. The Food columns are Int, and rounding the four
// separately is what every tracker does — scaling an already-rounded total
// compounds the error as servings go up.
export function scaleMacros(preset: FoodPreset, servings: number): FoodMacros {
  return {
    calories: Math.round(preset.calories * servings),
    protein: Math.round(preset.protein * servings),
    carbs: Math.round(preset.carbs * servings),
    fat: Math.round(preset.fat * servings),
  };
}

// The servings box is free text, so this is the gate. Capped so a stray
// keypress can't write a nine-digit calorie count.
export function parseServings(value: unknown): number | null {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || n <= 0 || n > 99) return null;
  return n;
}

// Food.quantity is the only place the multiplier survives a round-trip — there
// is no servings column, by design (a saved plan is a snapshot, not a formula).
// One serving writes the bare serving string so plans still read naturally.
export function servingLabel(preset: FoodPreset, servings: number): string {
  return servings === 1
    ? preset.serving
    : `${Number(servings.toFixed(2))} × ${preset.serving}`;
}

// The inverse: "2 × 1 medium (200 g)" -> { servings: 2, serving: "1 medium (200 g)" }
export function parseServingLabel(
  quantity: string | null | undefined,
): { servings: number; serving: string } | null {
  const s = String(quantity ?? "").trim();
  if (!s) return null;
  const m = /^(\d+(?:\.\d+)?)\s*×\s*(.+)$/.exec(s);
  if (m) {
    const n = parseServings(m[1]);
    return n ? { servings: n, serving: m[2].trim() } : null;
  }
  return { servings: 1, serving: s };
}
