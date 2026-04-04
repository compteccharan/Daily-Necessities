import { assignProductIds } from './catalog.js'
import { ensureUserProfile, getCurrentUser, getLoginUrl, logout, onAuthStateChange, restoreSession } from './auth.js'
import { imageSrc } from './pageHelpers.js'
import { addToCart, getCart, getCartCount, removeFromCart, updateCartQuantity } from './userManager.js'

let currentUser = null
let authSubscription = null
const LOCATION_STORAGE_KEY = 'verdail_selected_location'
const LOCATION_SOURCE_KEY = 'verdail_location_source'
const LOCATION_CACHE_KEY = 'verdail_location_cache'
const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const PREVIEW_DEFAULT_MESSAGE = 'Your selected items will appear here.'
const PREVIEW_EMPTY_MESSAGE = 'Add products from the page to build your cart.'

let homepageCartItems = []
let previewMessageTimer = null
const cartMutationLocks = new Set()

const categoryMapping = {
  cat1: 'all',
  cat2: 'veggies',
  cat3: 'dairy',
  cat4: 'cosmetics',
  cat5: 'sanitary',
  cat6: 'beverages',
  cat7: 'medpharm',
}

const categoryToSections = {
  all: null,
  veggies: ['Rice & Dals', 'Dry Fruits & Nuts'],
  dairy: ['Dairy Products'],
  cosmetics: ['Personal Care & Beauty', 'Hair Care'],
  sanitary: ['Cleaning Supplies'],
  beverages: ['Beverages'],
  medpharm: ['MedPharm'],
}

const NEW_PRODUCTS_BY_SECTION = {
  'Rice & Dals': [
    { name: '24 Mantra Organic Peanuts', price: 179, originalPrice: 220, quantity: '1 pack (500 g)', image: 'new-product-images/Veggies/Imgs/24-Mantra-Organic-Peanuts.webp' },
    { name: 'A TATA Product - Organic India Bilona Cow Ghee', price: 928, originalPrice: 1031, quantity: '1 pc (500 ml)', image: 'new-product-images/Veggies/Imgs/A-TATA-Product-Organic-India-Bilona-Cow-Ghee.webp' },
    { name: 'A TATA Product - Organic India Mustard Oil', price: 375, originalPrice: 450, quantity: '1 pc (1 L)', image: 'new-product-images/Veggies/Imgs/A-TATA-Product-Organic-India-Mustard-Oil-Certified-Organic-Lab-Tested-on-600-Parameters.webp' },
    { name: 'Aashirvaad Organic Chana Dal', price: 120, originalPrice: 240, quantity: '1 pack (1 kg)', image: 'new-product-images/Veggies/Imgs/Aashirvaad-Organic-Chana-Dal-Rich-in-Protein.webp' },
    { name: 'Aashirvaad Select 100% MP Sharbati Wheat Atta', price: 312, originalPrice: 406, quantity: '1 pack (5 kg)', image: 'new-product-images/Veggies/Imgs/Aashirvaad-Select-100-MP-Sharbati-Wheat-Atta-for-Soft-Makhmali-Rotis.webp' },
    { name: 'Anveshan A2 Desi Cow Ghee', price: 685, originalPrice: 1045, quantity: '1 pc (500 ml)', image: 'new-product-images/Veggies/Imgs/Anveshan-A2-Desi-Cow-Ghee-Pure-Traditional.webp' },
    { name: 'Daawat Thai Green Curry Meal Kit', price: 268, originalPrice: 275, quantity: '1 pack (401 g)', image: 'new-product-images/Veggies/Imgs/Daawat-Thai-Green-Curry-Meal-Kit-Ready-to-Cook-Meal.webp' },
    { name: 'DeHaat HF Raw Peanuts', price: 259, originalPrice: 388, quantity: '1 pack (1 kg)', image: 'new-product-images/Veggies/Imgs/DeHaat-HF-Raw-Peanuts.webp' },
    { name: 'Figaro Extra Virgin Olive Oil', price: 305, originalPrice: 599, quantity: '1 pc (250 ml)', image: 'new-product-images/Veggies/Imgs/Figaro-Extra-Virgin-Olive-Oil.webp' },
    { name: 'Gemini Pure It Refined Sunflower Oil Jar', price: 869, originalPrice: 975, quantity: '1 pc (4.35 kg)', image: 'new-product-images/Veggies/Imgs/Gemini-Pure-It-Refined-Sunflower-Oil-Jar.webp' },
    { name: 'India Gate 1 Cup Serves 5 Mini Mogra Basmati Rice', price: 314, originalPrice: 378, quantity: '1 pack (5 kg)', image: 'new-product-images/Veggies/Imgs/India-Gate-1-Cup-Serves-5-Mini-Mogra-Basmati-Rice-Aged-Rice-Smart-Choice.webp' },
    { name: 'Jivika A2 Desi Buffalo Ghee', price: 439, originalPrice: 709, quantity: '1 pc (500 ml)', image: 'new-product-images/Veggies/Imgs/Jivika-A2-Desi-Buffalo-Ghee-Traditionally-Churned-Bilona-Method.webp' },
    { name: 'Jiwa 30 Degree Gluten Free Flour', price: 170, originalPrice: 249, quantity: '1 pack (1 kg)', image: 'new-product-images/Veggies/Imgs/Jiwa-30-Degree-Gluten-Free-Flour.webp' },
    { name: 'Naga Maida', price: 73, originalPrice: 92, quantity: '1 pack (1 kg)', image: 'new-product-images/Veggies/Imgs/Naga-Maida.webp' },
    { name: 'Nirapara White Puttu Podi', price: 100, originalPrice: 125, quantity: '1 pack (1 kg)', image: 'new-product-images/Veggies/Imgs/Nirapara-White-Puttu-Podi.webp' },
    { name: 'Pillsbury Chakki Fresh Atta', price: 58, originalPrice: 73, quantity: '1 pack (1 kg)', image: 'new-product-images/Veggies/Imgs/Pillsbury-Chakki-Fresh-Atta.webp' },
  ],
  'Dairy Products': [
    { name: 'Abhi Eggs Gold+ Brown Eggs with Immunity Boosters', price: 84, originalPrice: 115, quantity: '1 pack (6 pcs)', image: 'new-product-images/Dairy Products/Imgs/Abhi-Eggs-Gold-Brown-Eggs-with-Immunity-Boosters.webp' },
    { name: 'Akshayakalpa Organic Curd Pouch', price: 23, quantity: '1 pack (200 g)', image: 'new-product-images/Dairy Products/Imgs/Akshayakalpa-Organic-Curd-Pouch.webp' },
    { name: 'Akshayakalpa Organic Unsalted Cooking Butter', price: 112, originalPrice: 114, quantity: '1 pack (100 g)', image: 'new-product-images/Dairy Products/Imgs/Akshayakalpa-Organic-Unsalted-Cooking-Butter.webp' },
    { name: 'Amul A+ Process Cheese Slices', price: 115, originalPrice: 170, quantity: '1 pack (200 g)', image: 'new-product-images/Dairy Products/Imgs/Amul-A-Process-Cheese-Slices.webp' },
    { name: 'Amul Processed Cheese Block', price: 270, originalPrice: 290, quantity: '1 pack (500 g)', image: 'new-product-images/Dairy Products/Imgs/Amul-Processed-Cheese-Block.webp' },
    { name: 'Amul Salted Butter', price: 285, quantity: '1 pack (500 g)', image: 'new-product-images/Dairy Products/Imgs/Amul-Salted-Butter.webp' },
    { name: 'Country Delight Buffalo Fresh Milk Pouch', price: 53, originalPrice: 59, quantity: '1 pack (450 ml)', image: 'new-product-images/Dairy Products/Imgs/Country-Delight-Buffalo-Fresh-Milk-Pouch.webp' },
    { name: 'Godrej Jersey Fresh Paneer', price: 95, originalPrice: 120, quantity: '1 pack (200 g)', image: 'new-product-images/Dairy Products/Imgs/Godrej-Jersey-Fresh-Paneer.webp' },
    { name: 'Hatsun Curd Pouch', price: 36, originalPrice: 37, quantity: '1 pack (500 g)', image: 'new-product-images/Dairy Products/Imgs/Hatsun-Curd-Pouch.webp' },
    { name: 'Heritage Special Long Life Toned Milk Pouch', price: 31, originalPrice: 33, quantity: '1 pack (450 ml)', image: 'new-product-images/Dairy Products/Imgs/Heritage-Special-Long-Life-Toned-Milk-Pouch-.webp' },
    { name: 'Heritage Table Butter', price: 270, originalPrice: 295, quantity: '1 pack (500 g)', image: 'new-product-images/Dairy Products/Imgs/Heritage-Table-Butter.webp' },
    { name: 'Milky Mist Greek Yogurt', price: 39, originalPrice: 55, quantity: '1 pc (100 g)', image: 'new-product-images/Dairy Products/Imgs/Milky-Mist-Greek-Yogurt.webp' },
    { name: 'Milky Mist Paneer', price: 228, originalPrice: 335, quantity: '1 pack (500 g)', image: 'new-product-images/Dairy Products/Imgs/Milky-Mist-Paneer.webp' },
    { name: 'Milky Mist Processed Cheese Block', price: 117, originalPrice: 160, quantity: '1 pack (200 g)', image: 'new-product-images/Dairy Products/Imgs/Milky-Mist-Processed-Cheese-Block.webp' },
    { name: 'Milky Mist Pure Cream', price: 76, originalPrice: 80, quantity: '1 pack (250 ml)', image: 'new-product-images/Dairy Products/Imgs/Milky-Mist-Pure-Cream.webp' },
    { name: 'Mother Dairy Fresh Paneer', price: 92, quantity: '1 pack (200 g)', image: 'new-product-images/Dairy Products/Imgs/Mother-Dairy-Fresh-Paneer.webp' },
  ],
  Beverages: [
    { name: 'Amul Kool Rose Milk Drink', price: 24, originalPrice: 25, quantity: '1 pc (180 ml)', image: 'new-product-images/Beverages/Imgs/Amul-Kool-Rose-Milk-Drink-Flavoured-Beverage.webp' },
    { name: 'Appy Fizz Apple Soft Drink', price: 36, originalPrice: 40, quantity: '1 pc (600 ml)', image: 'new-product-images/Beverages/Imgs/Appy-Fizz-Apple-Soft-Drink-Pet-Fizzy-Refreshing.webp' },
    { name: 'Coca-Cola Soft Drink Carbonated Beverage', price: 135, originalPrice: 160, quantity: '1 pack (8 x 250 ml)', image: 'new-product-images/Beverages/Imgs/Coca-Cola-Soft-Drink-Carbonated-Beverage.webp' },
    { name: 'Fanta Grape Soft Drink Tin Can', price: 146, originalPrice: 199, quantity: '1 pc (320 ml)', image: 'new-product-images/Beverages/Imgs/Fanta-Grape-Soft-Drink-Tin-Can.webp' },
    { name: 'Fanta Orange Flavoured Soft Drink', price: 35, originalPrice: 40, quantity: '1 pc (750 ml)', image: 'new-product-images/Beverages/Imgs/Fanta-Orange-Flavoured-Soft-Drink-Carbonated-Beverage.webp' },
    { name: 'Fanta Pineapple And Grapefruit Soft Drink', price: 216, originalPrice: 220, quantity: '1 pc (320 ml)', image: 'new-product-images/Beverages/Imgs/Fanta-Pineapple-And-Grapefruit-Soft-Drink.webp' },
    { name: 'Lemon Iced Tea', price: 129, originalPrice: 159, quantity: '420 ml', image: 'new-product-images/Beverages/Imgs/Lemon-Iced-Tea-.webp' },
    { name: 'Mirinda Orange Flavoured Soft Drink', price: 34, originalPrice: 40, quantity: '1 pc (750 ml)', image: 'new-product-images/Beverages/Imgs/Mirinda-Orange-Flavoured-Soft-Drink-Fizzy-Refreshing.webp' },
    { name: 'Moi Soi Popping Boba With Grapes Fruit Drink', price: 74, originalPrice: 150, quantity: '1 pc (330 ml)', image: 'new-product-images/Beverages/Imgs/Moi-Soi-Popping-Boba-With-Grapes-Fruit-Drink.webp' },
    { name: 'Moi Soi Popping Boba With Peach Fruit Drink', price: 71, originalPrice: 150, quantity: '1 pc (330 ml)', image: 'new-product-images/Beverages/Imgs/Moi-Soi-Popping-Boba-With-Peach-Fruit-Drink.webp' },
    { name: 'Mountain Dew Soft Drink PET', price: 20, quantity: '1 pc (400 ml)', image: 'new-product-images/Beverages/Imgs/Mountain-Dew-Soft-Drink-PET-Carbonated-Beverage.webp' },
    { name: 'Paper Boat Aamras Drink', price: 39, quantity: '1 pc (200 ml)', image: 'new-product-images/Beverages/Imgs/Paper-Boat-Aamras-Drink-Ready-to-Drink-Beverage.webp' },
    { name: 'Red Bull Energy Drink', price: 399, originalPrice: 480, quantity: '1 pack (4 x 250 ml)', image: 'new-product-images/Beverages/Imgs/Red-Bull-Energy-Drink-Ready-to-Drink-Beverage.webp' },
    { name: 'Schweppes Ginger Ale', price: 57, originalPrice: 60, quantity: '1 pc (300 ml)', image: 'new-product-images/Beverages/Imgs/Schweppes-Ginger-Ale-Carbonated-Beverage.webp' },
    { name: 'Sober Non-Alchoholic Pink Gin', price: 474, originalPrice: 499, quantity: '1 pc (180 ml)', image: 'new-product-images/Beverages/Imgs/Sober-Non-Alchoholic-Pink-Gin.webp' },
    { name: 'Vietnamese Cold Coffee', price: 189, originalPrice: 229, quantity: '410 ml', image: 'new-product-images/Beverages/Imgs/Vietnamese-Cold-Coffee.webp' },
  ],
  'Personal Care & Beauty': [
    { name: 'Biotique Fresh Neem Anti Dandruff Shampoo & Conditioner', price: 405, originalPrice: 799, quantity: '1 pc (650 ml)', image: 'new-product-images/Cosmetics/Imgs/Biotique-Fresh-Neem-Anti-Dandruff-Shampoo-Conditioner.webp' },
    { name: 'Bodify Sandalwood And Neroli Handmade Soap', price: 37, originalPrice: 80, quantity: '1 pack (125 g)', image: 'new-product-images/Cosmetics/Imgs/Bodify-Sandalwood-And-Neroli-Handmade-Soap.webp' },
    { name: 'Clinic Plus Strong & Thick Shampoo', price: 259, originalPrice: 365, quantity: '1 pc (355 ml)', image: 'new-product-images/Cosmetics/Imgs/Clinic-Plus-Strong-Thick-Shampoo-with-Rice-Water-Protein-Vitamin-E.webp' },
    { name: 'Dabur Amla Hair Oil', price: 81, originalPrice: 92, quantity: '1 pc (180 ml)', image: 'new-product-images/Cosmetics/Imgs/Dabur-Amla-Hair-Oil-For-Strong-Long-Thick-Hair.webp' },
    { name: 'Dove Hair Fall Rescue Shampoo', price: 160, originalPrice: 172, quantity: '1 pc (180 ml)', image: 'new-product-images/Cosmetics/Imgs/Dove-Hair-Fall-Rescue-Shampoo.webp' },
    { name: 'Himalaya Neem & Turmeric Soap', price: 48, originalPrice: 60, quantity: '1 pc (125 g)', image: 'new-product-images/Cosmetics/Imgs/Himalaya-Neem-Turmeric-Soap.webp' },
    { name: 'Indulekha Bringha Oil', price: 283, originalPrice: 477, quantity: '1 pc (100 ml)', image: 'new-product-images/Cosmetics/Imgs/Indulekha-Bringha-Oil-Reduces-Hair-Fall-And-Grows-New-Hair-100-Ayurvedic-Oil.webp' },
    { name: "L'Oreal Paris Dream Lengths Conditioner", price: 204, originalPrice: 279, quantity: '1 pack (175 ml or 180 ml)', image: 'new-product-images/Cosmetics/Imgs/L-Oreal-Paris-Dream-Lengths-Conditioner.webp' },
    { name: 'Lux International Creamy White Soap Bar', price: 36, originalPrice: 38, quantity: '1 pc (75 g or 80 g)', image: 'new-product-images/Cosmetics/Imgs/Lux-International-Creamy-White-Soap-Bar.webp' },
    { name: 'Mamaearth Onion Hair Oil', price: 147, originalPrice: 177, quantity: '1 pc (50 ml)', image: 'new-product-images/Cosmetics/Imgs/Mamaearth-Onion-Hair-Oil.webp' },
    { name: 'Medimix Classic Ayurvedic Soap with 18 Herbs', price: 42, originalPrice: 47, quantity: '1 pc (125 g)', image: 'new-product-images/Cosmetics/Imgs/Medimix-Classic-Ayurvedic-Traditionally-Made-Soap-with-18-Herbs.webp' },
    { name: 'Pantene Hairfall Control Conditioner', price: 173, originalPrice: 245, quantity: '1 pc (200 ml)', image: 'new-product-images/Cosmetics/Imgs/Pantene-Hairfall-Control-Conditioner.webp' },
    { name: 'Parachute Advansed Jasmine Hair Oil', price: 122, originalPrice: 144, quantity: '1 pc (300 ml)', image: 'new-product-images/Cosmetics/Imgs/Parachute-Advansed-Jasmine-Non-Sticky-Coconut-Hair-Oil.webp' },
    { name: 'Santoor Skin Softening Bathing Soap', price: 170, originalPrice: 199, quantity: '1 pack (5 x 125 g)', image: 'new-product-images/Cosmetics/Imgs/Santoor-Skin-Softening-Sandal-and-Almond-Milk-Bathing-Soap-With-Anti-Aging-Properties.webp' },
    { name: 'ThriveCo Hyapro 5-In-1 Hyaluronic Shampoo', price: 379, originalPrice: 449, quantity: '1 pc (236 ml)', image: 'new-product-images/Cosmetics/Imgs/ThriveCo-Hyapro-5-In-1-Hyaluronic-Shampoo-Repairs-Hydrates-Adds-Shine-Bounce.webp' },
    { name: 'TRESemme Keratin Smooth Shampoo', price: 324, originalPrice: 435, quantity: '1 pc (340 ml)', image: 'new-product-images/Cosmetics/Imgs/TRESemme-Keratin-Smooth-Shampoo.webp' },
  ],
  'Cleaning Supplies': [
    { name: 'Chakaachak Eazo Grass Broom New', price: 70, originalPrice: 115, quantity: '1 pack', image: 'new-product-images/Sanitary/Imgs/Chakaachak-Eazo-Grass-Broom-New.webp' },
    { name: 'Chakaachak Eco Spin Bucket Mop', price: 649, originalPrice: 999, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Chakaachak-Eco-Spin-Bucket-Mop.webp' },
    { name: 'Chakaachak Floor Cleaning Pocha', price: 50, originalPrice: 60, quantity: '1 pack', image: 'new-product-images/Sanitary/Imgs/Chakaachak-Floor-Cleaning-Pocha.webp' },
    { name: 'Domex Ocean Fresh Toilet Cleaner', price: 145, originalPrice: 245, quantity: '1 pc (1 L)', image: 'new-product-images/Sanitary/Imgs/Domex-Ocean-Fresh-Toilet-Cleaner-Fights-Odour-for-Upto-3-Days.webp' },
    { name: 'Ezee Medium Garbage Bags 19x21 Inch', price: 63, originalPrice: 72, quantity: '1 pack (30 pcs)', image: 'new-product-images/Sanitary/Imgs/Ezee-Medium-Garbage-Bags-19x-21-Inch.webp' },
    { name: 'Gala Double Hockey Toilet Brush', price: 159, originalPrice: 180, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Gala-Double-Hockey-Toilet-Brush.webp' },
    { name: 'Gala Long Handle Tile and Floor Scrubber', price: 180, originalPrice: 200, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Gala-Long-Handle-Tile-and-Floor-Scrubber.webp' },
    { name: 'Gebi Antibacterial Delite Cloth Brush', price: 69, originalPrice: 99, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Gebi-Antibacterial-Delite-Cloth-Brush.webp' },
    { name: 'Gebi Aqua Bucket Spin Mop with 1 Refill', price: 669, originalPrice: 1199, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Gebi-Aqua-Bucket-Spin-Mop-With-1-Microfiber-Refill-Colour-May-Vary-.webp' },
    { name: 'Harpic Bathroom Ultra 10X Tough Stain Remover', price: 251, originalPrice: 299, quantity: '1 pc (1 L)', image: 'new-product-images/Sanitary/Imgs/Harpic-Bathroom-Ultra-10X-Tough-Stain-Remover-Citrus-1000ml.webp' },
    { name: 'Lizol Bathroom Cleaner Liquid Pine', price: 250, originalPrice: 299, quantity: '1 pc (1 L)', image: 'new-product-images/Sanitary/Imgs/Lizol-Bathroom-Cleaner-Liquid-Pine.webp' },
    { name: 'Perpetual Self-Adhesive Toothbrush Holder (4 Pcs)', price: 209, originalPrice: 1199, quantity: '1 pack (4 pcs)', image: 'new-product-images/Sanitary/Imgs/Perpetual-Self-Adhesive-Toothbrush-Holder-4-Pcs-Teddy-Bear-Shaped-for-Bathroom-Storage.webp' },
    { name: 'Scotch Brite Bathroom Scrubber Brush', price: 155, originalPrice: 170, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Scotch-Brite-Bathroom-Scrubber-Brush-.webp' },
    { name: 'Scotch-Brite Floor Cloth for Mopping', price: 61, originalPrice: 90, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Scotch-Brite-Floor-Cloth-Cotton-Cloth-for-Floor-Mopping.webp' },
    { name: 'Soft Attire Multipurpose Microfiber Cloth', price: 89, originalPrice: 135, quantity: '2 pcs', image: 'new-product-images/Sanitary/Imgs/Soft-Attire-Multipurpose-Microfiber-Cloth-For-Cleaning-350-g-Assorted-Pack-.webp' },
    { name: 'Soham Housewares Plastic Spray Bottle', price: 42, originalPrice: 139, quantity: '1 pc', image: 'new-product-images/Sanitary/Imgs/Soham-Housewares-Plastic-Spray-Bottle-500ml.webp' },
  ],
  MedPharm: [
    { name: "Azithral-500 Tablet 5's", price: 125.5, originalPrice: 150, quantity: '5 Tablet', image: 'new-product-images/MedPharm/Imgs/azi0013_1.webp' },
    { name: 'Benadryl Cough Formula Syrup', price: 159, quantity: '150 ml Syrup', image: 'new-product-images/MedPharm/Imgs/ben0053_1.webp' },
    { name: 'Benadryl Orange Flavour Lozenges', price: 28, quantity: '8 Lozenges', image: 'new-product-images/MedPharm/Imgs/ben0949_1_2.webp' },
    { name: 'Durex Intense Condoms with Desirex Gel', price: 495, originalPrice: 550, quantity: '10 condoms', image: 'new-product-images/MedPharm/Imgs/dur0287_1.webp' },
    { name: 'Durex Skin-on-Skin Real Feel Condoms', price: 419.3, originalPrice: 599, quantity: '10 condoms', image: 'new-product-images/MedPharm/Imgs/dur0318_1.webp' },
    { name: 'Huggies Complete Comfort Wonder Baby Diaper Pants XL', price: 562, originalPrice: 1124, quantity: '46 diaper', image: 'new-product-images/MedPharm/Imgs/hug0242_1-jun25_1_.webp' },
    { name: 'Koflet-H Orange & Ginger Lozenges', price: 28, quantity: '6 Lozenges', image: 'new-product-images/MedPharm/Imgs/KOF0228_1.webp' },
    { name: 'Wamasutra Strawberry Flavour Condoms', price: 30, quantity: '3 condoms', image: 'new-product-images/MedPharm/Imgs/KAM0237_1.webp' },
    { name: 'Naselin Saline Nasal Spray', price: 47, quantity: '20 ml Spray', image: 'new-product-images/MedPharm/Imgs/NAS0291_1-AUG23_1.webp' },
    { name: 'Navratna Ayurvedic Cool Hair Oil', price: 194, originalPrice: 215.5, quantity: '300 ml oil', image: 'new-product-images/MedPharm/Imgs/NAV0006_1-AUG23_1.webp' },
    { name: 'Neurobion Forte Tablet 30s', price: 43, quantity: '30 tablet', image: 'new-product-images/MedPharm/Imgs/neu0830_1-march25_1_.webp' },
    { name: 'Ourdaily Vitamin E 400 mg Soft Gelatin Capsules', price: 42, quantity: '10 capsule', image: 'new-product-images/MedPharm/Imgs/OUR0005_1-AUG23_1.webp' },
    { name: 'Ozomen Forte 100 Tablet 6s', price: 140.6, originalPrice: 187.5, quantity: '6 tablet', image: 'new-product-images/MedPharm/Imgs/OZO0026_1_1.webp' },
    { name: 'Pampers Premium Care Diaper Pants XXL', price: 769.5, originalPrice: 1399, quantity: '30 diaper', image: 'new-product-images/MedPharm/Imgs/pam0295_1__1_1.webp' },
    { name: "Paracip-650 Tablet 10's", price: 16.8, originalPrice: 21, quantity: '10 tablet', image: 'new-product-images/MedPharm/Imgs/PAR0014_1_1.webp' },
    { name: 'New Saridon for Fast Headache Relief', price: 51.5, quantity: '10 tablet', image: 'new-product-images/MedPharm/Imgs/sar0001_1-sep2023_1_.webp' },
    { name: 'Supradyn Daily Multivitamin Tablet 15s', price: 68, quantity: '15 tablet', image: 'new-product-images/MedPharm/Imgs/sup0009_1-july23_8_.webp' },
    { name: 'Tiger Balm White Ointment', price: 87, quantity: '18 gm balm', image: 'new-product-images/MedPharm/Imgs/tig0006_1.webp' },
    { name: 'Vicks VapoRub Steam Pods', price: 92.5, quantity: '4 capsule', image: 'new-product-images/MedPharm/Imgs/vic0502_1.webp' },
    { name: "Vigore 50 Red Tablet 4's", price: 54.4, originalPrice: 72.5, quantity: '4 tablet', image: 'new-product-images/MedPharm/Imgs/VIG0006_1_3.webp' },
    { name: 'Lifree Durable Absorb Adult Diaper Pants XL', price: 450, originalPrice: 562.5, quantity: '10 diaper', image: 'new-product-images/MedPharm/Imgs/xl_10_front_1.webp' },
  ],
}

document.addEventListener('DOMContentLoaded', () => {
  appendNewProducts()
  assignProductIds(document)
  captureOriginalProductOrder()
  bindLogoHome()
  bindLocationSelector()
  bindPopup()
  bindCartPreview()
  bindSearchAndFilters()
  bindAddToCart()
  bindCartButton()
  initializeAuthUI()
})

function appendNewProducts() {
  Object.entries(NEW_PRODUCTS_BY_SECTION).forEach(([sectionTitle, products]) => {
    const section = getOrCreateProductSection(sectionTitle)
    if (!section) return

    const grid = section.querySelector('.product-grid')
    if (!grid) return

    products.forEach((product) => {
      const existing = grid.querySelector(`[data-source-image="${cssEscape(product.image)}"]`)
      if (existing) return

      const card = document.createElement('article')
      card.className = 'product-card'
      card.dataset.sourceImage = product.image
      card.innerHTML = buildProductCardMarkup(product)
      grid.appendChild(card)
    })
  })
}

function getOrCreateProductSection(sectionTitle) {
  const sections = [...document.querySelectorAll('.product-section')]
  const existingSection = sections.find((section) => section.querySelector('.section-title')?.textContent?.trim() === sectionTitle)
  if (existingSection) return existingSection

  if (sectionTitle !== 'MedPharm') {
    return null
  }

  const mainElement = document.querySelector('main')
  if (!mainElement) return null

  const medPharmSection = document.createElement('section')
  medPharmSection.className = 'product-section'
  medPharmSection.innerHTML = `
    <h2 class="section-title">MedPharm</h2>
    <div class="product-grid"></div>
  `

  const promoSection = mainElement.querySelector('.promo-section')
  if (promoSection) {
    mainElement.insertBefore(medPharmSection, promoSection)
  } else {
    mainElement.appendChild(medPharmSection)
  }

  return medPharmSection
}

function buildProductCardMarkup(product) {
  const currentPrice = formatPriceValue(product.price)
  const hasOriginalPrice = Number(product.originalPrice || 0) > Number(product.price || 0)
  const originalPriceMarkup = hasOriginalPrice
    ? `<span class="original-price">₹${formatPriceValue(product.originalPrice)}</span>`
    : ''
  const discountMarkup = hasOriginalPrice
    ? `<span class="discount-badge">₹${formatPriceValue(product.originalPrice - product.price)} OFF</span>`
    : ''

  return `
    <div class="product-image-container">
      <img src="${imageSrc(product.image)}" alt="${escapeHtml(product.name)}" class="product-image">
      <button class="add-button">ADD</button>
    </div>
    <div class="product-details">
      <div class="price-row">
        <span class="current-price">₹${currentPrice}</span>
        ${originalPriceMarkup}
      </div>
      ${discountMarkup}
      <h3 class="product-name">${escapeHtml(product.name)}</h3>
      <p class="product-quantity">${escapeHtml(product.quantity || '1 pc')}</p>
    </div>
  `
}

function formatPriceValue(value) {
  const numeric = Number(value || 0)
  if (Number.isNaN(numeric)) return '0'
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2)
}

function cssEscape(value) {
  return String(value || '').replace(/"/g, '\\"')
}

function bindLogoHome() {
  const logo = document.querySelector('.logo')
  if (!logo) return

  logo.style.cursor = 'pointer'
  logo.addEventListener('click', () => {
    window.location.href = '/Daily-Necessities/index.html'
  })
}

function captureOriginalProductOrder() {
  document.querySelectorAll('.product-card').forEach((card, index) => {
    card.dataset.originalOrder = String(index)
  })
}

function bindLocationSelector() {
  const locationSelect = document.getElementById('location-select')
  if (!locationSelect) return

  locationSelect.addEventListener('change', () => handleLocationSelection(locationSelect))

  const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY)
  const savedSource = localStorage.getItem(LOCATION_SOURCE_KEY)

  if (savedLocation) {
    applyLocationSelection(locationSelect, savedLocation, { persist: false, source: savedSource || 'manual' })
  }

  if (savedSource === 'manual') {
    return
  }

  const cachedLocation = getCachedLocation()
  if (cachedLocation) {
    applyLocationSelection(locationSelect, cachedLocation.city, { persist: false, source: 'auto' })
  }

  void initializeAutomaticLocation(locationSelect)
}

function handleLocationSelection(locationSelect) {
  const selectedValue = locationSelect.value

  if (selectedValue === '__detect__') {
    void initializeAutomaticLocation(locationSelect, { forcePrompt: true })
    return
  }

  if (!selectedValue) {
    setLocationPlaceholder(locationSelect, 'Select Location')
    return
  }

  applyLocationSelection(locationSelect, selectedValue, { persist: true, source: 'manual' })
}

async function initializeAutomaticLocation(locationSelect, { forcePrompt = false } = {}) {
  if (!('geolocation' in navigator)) {
    await applyIpLocationFallback(locationSelect)
    return
  }

  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    setLocationPlaceholder(locationSelect, 'Location Needs HTTPS')
    return
  }

  let permissionState = 'prompt'

  if (navigator.permissions?.query) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' })
      permissionState = permissionStatus.state

      permissionStatus.onchange = () => {
        if (permissionStatus.state === 'granted') {
          void requestCurrentLocation(locationSelect)
        } else if (permissionStatus.state === 'denied') {
          handleLocationBlocked(locationSelect)
        }
      }
    } catch (error) {
      console.warn('Unable to read geolocation permission state:', error)
    }
  }

  if (permissionState === 'denied' && !forcePrompt) {
    await handleLocationBlocked(locationSelect)
    return
  }

  await requestCurrentLocation(locationSelect)
}

async function requestCurrentLocation(locationSelect) {
  setLocationPlaceholder(locationSelect, 'Detecting Location...')

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 10 * 60 * 1000,
      })
    })

    const city = await lookupCityFromCoordinates(position.coords.latitude, position.coords.longitude)
    if (!city) {
      await applyIpLocationFallback(locationSelect)
      return
    }

    saveLocationCache(city)
    applyLocationSelection(locationSelect, city, { persist: true, source: 'auto' })
  } catch (error) {
    if (error?.code === 1) {
      await handleLocationBlocked(locationSelect)
      return
    }

    console.warn('Unable to detect current location:', error)
    await applyIpLocationFallback(locationSelect)
  }
}

async function lookupCityFromCoordinates(latitude, longitude) {
  return fetchClientSideCity({
    latitude: String(latitude),
    longitude: String(longitude),
  })
}

async function lookupCityFromIp() {
  return fetchClientSideCity()
}

async function fetchClientSideCity(parameters = {}) {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  Object.entries({
    localityLanguage: 'en',
    ...parameters,
  }).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Location lookup failed with status ${response.status}`)
  }

  const payload = await response.json()

  return [
    payload?.city,
    payload?.locality,
    payload?.principalSubdivision,
    payload?.localityInfo?.administrative?.find((item) => item?.order === 5)?.name,
  ]
    .find((value) => typeof value === 'string' && value.trim())
    ?.trim()
}

function applyLocationSelection(locationSelect, city, { persist, source }) {
  const cityName = city.trim()
  const option = ensureLocationOption(locationSelect, cityName)
  locationSelect.value = option.value
  locationSelect.title = `Delivery location: ${cityName}`
  setLocationPlaceholder(locationSelect, 'Select Location')

  if (!persist) return

  localStorage.setItem(LOCATION_STORAGE_KEY, cityName)
  localStorage.setItem(LOCATION_SOURCE_KEY, source)
}

function ensureLocationOption(locationSelect, city) {
  const existingOption = Array.from(locationSelect.options).find(
    (option) => option.value.toLowerCase() === city.toLowerCase()
  )

  if (existingOption) {
    return existingOption
  }

  const option = document.createElement('option')
  option.value = city
  option.textContent = city
  locationSelect.appendChild(option)
  return option
}

function setLocationPlaceholder(locationSelect, text) {
  const placeholderOption = locationSelect.querySelector('option[value=""]')
  if (placeholderOption) {
    placeholderOption.textContent = text
  }
}

async function handleLocationBlocked(locationSelect) {
  setLocationPlaceholder(locationSelect, 'Location Blocked, Choose City')

  if (!sessionStorage.getItem('verdail_location_blocked_notice')) {
    sessionStorage.setItem('verdail_location_blocked_notice', 'shown')
    window.alert('Location access is blocked. Enable location permission in your browser to auto-detect your city, or choose a city manually.')
  }

  await applyIpLocationFallback(locationSelect)
}

async function applyIpLocationFallback(locationSelect) {
  try {
    const city = await lookupCityFromIp()
    if (!city) {
      setLocationPlaceholder(locationSelect, 'Choose City Manually')
      return
    }

    applyLocationSelection(locationSelect, city, { persist: true, source: 'ip' })
  } catch (error) {
    console.warn('Unable to detect approximate city from IP:', error)
    setLocationPlaceholder(locationSelect, 'Choose City Manually')
  }
}

function getCachedLocation() {
  try {
    const rawValue = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!rawValue) return null

    const parsed = JSON.parse(rawValue)
    if (!parsed?.city || !parsed?.timestamp) return null
    if (Date.now() - parsed.timestamp > LOCATION_CACHE_TTL_MS) return null

    return parsed
  } catch (error) {
    console.warn('Unable to read cached location:', error)
    return null
  }
}

function saveLocationCache(city) {
  localStorage.setItem(
    LOCATION_CACHE_KEY,
    JSON.stringify({
      city,
      timestamp: Date.now(),
    })
  )
}

async function initializeAuthUI() {
  try {
    await restoreSession()
  } catch (error) {
    console.error('Failed to restore homepage session:', error.message)
  }

  currentUser = await getCurrentUser()
  if (currentUser) {
    await ensureUserProfile(currentUser)
    updateUIForLoggedInUser(currentUser)
    await syncHomepageCartState()
  } else {
    updateUIForLoggedOutUser()
    resetHomepageCartState()
  }

  const authListener = onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null

    if (currentUser) {
      await ensureUserProfile(currentUser)
      updateUIForLoggedInUser(currentUser)
      await syncHomepageCartState()
    } else {
      updateUIForLoggedOutUser()
      resetHomepageCartState()
    }
  })

  authSubscription = authListener?.data?.subscription || null
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe(), { once: true })
}

function bindPopup() {
  const popup = document.getElementById('cart-popup')
  const closeBtn = document.querySelector('.close-popup')

  closeBtn?.addEventListener('click', () => popup?.classList.add('hidden'))
  popup?.addEventListener('click', (event) => {
    if (event.target === popup) {
      popup.classList.add('hidden')
    }
  })
}

function showPopup() {
  document.getElementById('cart-popup')?.classList.remove('hidden')
}

function bindCartPreview() {
  const previewPanel = document.getElementById('cart-preview-panel')
  if (!previewPanel) return

  previewPanel.querySelector('.cart-preview-close')?.addEventListener('click', () => {
    closeCartPreview()
  })

  previewPanel.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-preview-action]')
    if (!actionButton) return

    event.preventDefault()
    const { previewAction, productId } = actionButton.dataset
    if (!productId) return

    void mutateCartQuantity(productId, previewAction === 'increase' ? 1 : -1, {
      openPreview: true,
      message: previewAction === 'increase' ? 'Cart updated.' : 'Cart updated.',
    })
  })

  document.addEventListener('click', (event) => {
    if (!previewPanel.classList.contains('visible')) return

    const clickedInsidePreview = previewPanel.contains(event.target)
    const clickedCartButton = event.target.closest('.cart-button')
    const clickedCardAction = event.target.closest('.product-card-action')

    if (!clickedInsidePreview && !clickedCartButton && !clickedCardAction) {
      closeCartPreview()
    }
  })
}

function bindCartButton() {
  const cartButton = document.querySelector('.cart-button')
  cartButton?.addEventListener('click', (event) => {
    event.preventDefault()
    if (!currentUser) {
      showPopup()
      return
    }

    if (!homepageCartItems.length) {
      openCartPreview({
        title: 'Your Cart',
        message: PREVIEW_EMPTY_MESSAGE,
      })
      return
    }

    toggleCartPreview()
  })
}

function bindAddToCart() {
  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('.add-button')
    if (addButton) {
      event.preventDefault()
      const productCard = addButton.closest('.product-card')
      if (!productCard) return
      void addHomepageCardToCart(productCard)
      return
    }

    const quantityButton = event.target.closest('[data-card-action]')
    if (!quantityButton) return

    event.preventDefault()
    const productCard = quantityButton.closest('.product-card')
    const productId = productCard?.getAttribute('data-product-id')
    if (!productId) return

    const delta = quantityButton.dataset.cardAction === 'increase' ? 1 : -1
    void mutateCartQuantity(productId, delta, {
      openPreview: true,
      message: delta > 0 ? 'Cart updated.' : 'Cart updated.',
    })
  })
}

function resetHomepageCartState() {
  homepageCartItems = []
  renderHomepageCardActions()
  renderCartPreview()
  closeCartPreview()
  void updateCartBadge([])
}

async function syncHomepageCartState({ openPreview = false, title = 'Your Cart', message = '' } = {}) {
  if (!currentUser) {
    resetHomepageCartState()
    return
  }

  homepageCartItems = await getCart()
  renderHomepageCardActions()
  renderCartPreview({ title, message })
  await updateCartBadge(homepageCartItems)

  if (openPreview) {
    openCartPreview({ title, message })
  }
}

function renderHomepageCardActions() {
  document.querySelectorAll('.product-card').forEach((card) => {
    const productId = card.getAttribute('data-product-id')
    const actionHost = ensureProductCardActionHost(card)
    if (!productId || !actionHost) return

    const cartItem = getHomepageCartItem(productId)
    const quantity = Number(cartItem?.quantity || 0)
    const isBusy = cartMutationLocks.has(productId)

    if (quantity > 0) {
      actionHost.innerHTML = `
        <div class="card-quantity-control${isBusy ? ' is-busy' : ''}" aria-label="Adjust quantity">
          <button type="button" data-card-action="decrease" aria-label="Decrease quantity">-</button>
          <span class="card-qty-value">${quantity}</span>
          <button type="button" data-card-action="increase" aria-label="Increase quantity">+</button>
        </div>
      `
      return
    }

    actionHost.innerHTML = `
      <button class="add-button" type="button"${isBusy ? ' disabled' : ''}>ADD</button>
    `
  })
}

function ensureProductCardActionHost(card) {
  const imageContainer = card.querySelector('.product-image-container')
  if (!imageContainer) return null

  let actionHost = imageContainer.querySelector('.product-card-action')
  if (actionHost) return actionHost

  actionHost = document.createElement('div')
  actionHost.className = 'product-card-action'

  const existingButton = imageContainer.querySelector('.add-button')
  if (existingButton) {
    existingButton.replaceWith(actionHost)
  } else {
    imageContainer.appendChild(actionHost)
  }

  return actionHost
}

function getHomepageCartItem(productId) {
  return homepageCartItems.find((item) => item.product_id === productId)
}

function getProductPayloadFromCard(card) {
  const productName = card.querySelector('.product-name')?.textContent?.trim() || 'Product'
  const productImage = card.querySelector('.product-image')?.getAttribute('src') || ''

  return {
    id: card.getAttribute('data-product-id') || productName,
    name: productName,
    price: parseCurrencyValue(card.querySelector('.current-price')?.textContent),
    image: productImage,
  }
}

function renderCartPreview({ title = 'Your Cart', message = '' } = {}) {
  const previewBody = document.getElementById('cart-preview-body')
  const previewCount = document.getElementById('cart-preview-count')
  const previewTotal = document.getElementById('cart-preview-total')
  if (!previewBody || !previewCount || !previewTotal) return

  const totalItems = homepageCartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const subtotal = homepageCartItems.reduce((sum, item) => {
    return sum + (Number(item.price_at_add ?? item.price ?? 0) * Number(item.quantity || 0))
  }, 0)

  setPreviewCopy({
    title,
    message: message || (homepageCartItems.length ? PREVIEW_DEFAULT_MESSAGE : PREVIEW_EMPTY_MESSAGE),
    temporary: Boolean(message && ![PREVIEW_DEFAULT_MESSAGE, PREVIEW_EMPTY_MESSAGE].includes(message)),
  })

  previewCount.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`
  previewTotal.textContent = formatCurrency(subtotal)

  if (!homepageCartItems.length) {
    previewBody.innerHTML = `
      <div class="cart-preview-empty">
        <p>Your cart is empty right now.</p>
        <p>Add items from the page and they will appear here instantly.</p>
      </div>
    `
    return
  }

  previewBody.innerHTML = homepageCartItems
    .map((item) => {
      const productId = item.product_id
      const quantity = Number(item.quantity || 0)
      const price = Number(item.price_at_add ?? item.price ?? 0)
      const isBusy = cartMutationLocks.has(productId)

      return `
        <article class="cart-preview-item">
          ${renderPreviewItemImage(item)}
          <div>
            <h4 class="cart-preview-item-name">${escapeHtml(item.product_name || 'Product')}</h4>
            <div class="cart-preview-item-meta">
              <div class="cart-preview-qty${isBusy ? ' is-busy' : ''}">
                <button type="button" data-preview-action="decrease" data-product-id="${escapeHtml(productId)}" aria-label="Decrease quantity">-</button>
                <span>${quantity}</span>
                <button type="button" data-preview-action="increase" data-product-id="${escapeHtml(productId)}" aria-label="Increase quantity">+</button>
              </div>
              <span class="cart-preview-item-price">${formatCurrency(price * quantity)}</span>
            </div>
          </div>
        </article>
      `
    })
    .join('')
}

function renderPreviewItemImage(item) {
  const image = item.product_image || ''
  const name = item.product_name || 'Product'

  if (!image) {
    return '<div class="cart-preview-image" aria-hidden="true"></div>'
  }

  return `<img class="cart-preview-image" src="${imageSrc(image)}" alt="${escapeHtml(name)}">`
}

function setPreviewCopy({ title = 'Your Cart', message, temporary = false } = {}) {
  const previewTitle = document.getElementById('cart-preview-title')
  const previewStatus = document.getElementById('cart-preview-status')
  if (!previewTitle || !previewStatus) return

  previewTitle.textContent = title
  previewStatus.textContent = message || (homepageCartItems.length ? PREVIEW_DEFAULT_MESSAGE : PREVIEW_EMPTY_MESSAGE)

  if (previewMessageTimer) {
    window.clearTimeout(previewMessageTimer)
    previewMessageTimer = null
  }

  if (!temporary) return

  previewMessageTimer = window.setTimeout(() => {
    setPreviewCopy({
      title: 'Your Cart',
      message: homepageCartItems.length ? PREVIEW_DEFAULT_MESSAGE : PREVIEW_EMPTY_MESSAGE,
    })
  }, 2200)
}

function openCartPreview({ title = 'Your Cart', message = '' } = {}) {
  const previewPanel = document.getElementById('cart-preview-panel')
  if (!previewPanel) return

  renderCartPreview({ title, message })
  previewPanel.classList.add('visible')
  previewPanel.setAttribute('aria-hidden', 'false')
}

function closeCartPreview() {
  const previewPanel = document.getElementById('cart-preview-panel')
  if (!previewPanel) return

  previewPanel.classList.remove('visible')
  previewPanel.setAttribute('aria-hidden', 'true')
}

function toggleCartPreview() {
  const previewPanel = document.getElementById('cart-preview-panel')
  if (!previewPanel) return

  if (previewPanel.classList.contains('visible')) {
    closeCartPreview()
  } else {
    openCartPreview({
      title: 'Your Cart',
      message: homepageCartItems.length ? PREVIEW_DEFAULT_MESSAGE : PREVIEW_EMPTY_MESSAGE,
    })
  }
}

async function addHomepageCardToCart(productCard) {
  if (!currentUser) {
    showPopup()
    return
  }

  const productId = productCard.getAttribute('data-product-id')
  if (!productId) return

  await mutateCartQuantity(productId, 1, {
    openPreview: true,
    title: 'Added to Cart',
    message: 'Item added to your cart.',
  })
}

async function mutateCartQuantity(productId, delta, { openPreview = false, title = 'Your Cart', message = '' } = {}) {
  if (!currentUser) {
    showPopup()
    return
  }

  if (!productId || cartMutationLocks.has(productId)) return

  const existingItem = getHomepageCartItem(productId)
  if (!existingItem && delta < 0) return

  cartMutationLocks.add(productId)
  renderHomepageCardActions()
  renderCartPreview()

  try {
    if (!existingItem && delta > 0) {
      const productCard = Array.from(document.querySelectorAll('.product-card'))
        .find((card) => card.getAttribute('data-product-id') === productId)

      if (!productCard) {
        throw new Error('Unable to find that product on the page.')
      }

      await addToCart(getProductPayloadFromCard(productCard))
    } else if (existingItem) {
      const nextQuantity = Number(existingItem.quantity || 0) + delta

      if (nextQuantity <= 0) {
        await removeFromCart(existingItem.id)
      } else {
        await updateCartQuantity(existingItem.id, nextQuantity)
      }
    }

    cartMutationLocks.delete(productId)
    await syncHomepageCartState({
      openPreview,
      title,
      message: message || (delta > 0 ? 'Cart updated.' : 'Item removed from your cart.'),
    })
  } catch (error) {
    cartMutationLocks.delete(productId)
    renderHomepageCardActions()
    renderCartPreview()
    window.alert(error.message || 'Unable to update cart right now.')
  }
}

function formatCurrency(value) {
  return `₹${Math.round(Number(value) || 0)}`
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function updateUIForLoggedInUser(user) {
  const loginButton = document.querySelector('.login-button')
  if (!loginButton) return

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
  loginButton.innerHTML = `
    <svg fill="none" height="24" viewBox="0 0 26 26" width="24" xmlns="http://www.w3.org/2000/svg"><circle cx="12.5" cy="11.168" r="3.5" stroke="#4CAF50" stroke-linecap="round" stroke-width="1.6"></circle><circle cx="12.5" cy="13.5" r="10.5" stroke="#4CAF50" stroke-width="1.6"></circle><path d="M19.5 21.3236C19.0871 20.0832 18.1773 18.9872 16.9117 18.2054C15.646 17.4237 14.0953 17 12.5 17C10.9047 17 9.35398 17.4237 8.08835 18.2054C6.82271 18.9872 5.91289 20.0832 5.5 21.3236" stroke="#4CAF50" stroke-linecap="round" stroke-width="1.6"></path></svg>
    <span class="user-name" style="color: #4CAF50; font-weight: 500; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
  `
  loginButton.style.cursor = 'pointer'
  loginButton.onclick = showUserMenu
  document.getElementById('cart-popup')?.classList.add('hidden')
}

function updateUIForLoggedOutUser() {
  const loginButton = document.querySelector('.login-button')
  if (!loginButton) return

  loginButton.innerHTML = `
    <svg fill="none" height="24" viewBox="0 0 26 26" width="24" xmlns="http://www.w3.org/2000/svg"><circle cx="12.5" cy="11.168" r="3.5" stroke="#000000" stroke-linecap="round" stroke-width="1.6"></circle><circle cx="12.5" cy="13.5" r="10.5" stroke="#000000" stroke-width="1.6"></circle><path d="M19.5 21.3236C19.0871 20.0832 18.1773 18.9872 16.9117 18.2054C15.646 17.4237 14.0953 17 12.5 17C10.9047 17 9.35398 17.4237 8.08835 18.2054C6.82271 18.9872 5.91289 20.0832 5.5 21.3236" stroke="#000000" stroke-linecap="round" stroke-width="1.6"></path></svg>
    <a href="${getLoginUrl()}">Login</a>
  `
  loginButton.onclick = null
  document.querySelector('.user-dropdown-menu')?.remove()
}

function showUserMenu(event) {
  event.preventDefault()
  event.stopPropagation()

  const existingMenu = document.querySelector('.user-dropdown-menu')
  if (existingMenu) {
    existingMenu.remove()
    return
  }

  const loginButton = document.querySelector('.login-button')
  if (!loginButton) return
  const menuHost = loginButton.parentElement
  if (!menuHost) return

  const menu = document.createElement('div')
  menu.className = 'user-dropdown-menu'
  menu.innerHTML = `
    <div style="padding: 12px 16px; border-bottom: 1px solid #eee; font-size: 12px; color: #666;">
      Signed in as<br><strong style="color: #333;">${currentUser?.email || 'User'}</strong>
    </div>
    <a id="menu-orders" href="/Daily-Necessities/orders.html" style="display: block; width: 100%; box-sizing: border-box; padding: 12px 16px; border-bottom: 1px solid #eee; background: none; text-align: left; cursor: pointer; font-size: 14px; color: #333; text-decoration: none;">My Orders</a>
    <button id="menu-logout" style="width: 100%; padding: 12px 16px; border: none; background: none; text-align: left; cursor: pointer; font-size: 14px; color: #d32f2f;">Sign Out</button>
  `
  menu.style.cssText = `
    position: absolute;
    top: ${loginButton.offsetTop + loginButton.offsetHeight + 8}px;
    left: ${loginButton.offsetLeft}px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    min-width: 200px;
    z-index: 1000;
    overflow: hidden;
  `

  menuHost.style.position = 'relative'
  menuHost.appendChild(menu)

  document.getElementById('menu-orders')?.addEventListener('click', (menuEvent) => menuEvent.stopPropagation())

  document.getElementById('menu-logout')?.addEventListener('click', async () => {
    try {
      await logout()
      currentUser = null
      updateUIForLoggedOutUser()
      await updateCartBadge()
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error.message)
    }
  })

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(clickEvent) {
      if (!menu.contains(clickEvent.target)) {
        menu.remove()
        document.removeEventListener('click', closeMenu)
      }
    })
  }, 0)
}

async function updateCartBadge(cartItems = null) {
  const cartButton = document.querySelector('.cart-button')
  if (!cartButton) return

  let badge = cartButton.querySelector('.cart-badge')
  if (!currentUser) {
    badge?.remove()
    return
  }

  const totalItems = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : await getCartCount()

  if (!badge && totalItems > 0) {
    badge = document.createElement('span')
    badge.className = 'cart-badge'
    cartButton.style.position = 'relative'
    cartButton.appendChild(badge)
  }

  if (badge) {
    if (totalItems > 0) {
      badge.textContent = String(totalItems)
      badge.style.display = 'flex'
    } else {
      badge.remove()
    }
  }
}

function bindSearchAndFilters() {
  const searchBox = document.querySelector('.search-box')
  const categoryLabels = document.querySelectorAll('.nav-item')
  const sortFilter = document.getElementById('sort-filter')

  searchBox?.addEventListener('input', (event) => {
    applyFilters(event.target.value.toLowerCase().trim(), getCurrentCategory(), getCurrentSort())
  })

  searchBox?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      searchBox.value = ''
      applyFilters('', getCurrentCategory(), getCurrentSort())
    }
  })

  sortFilter?.addEventListener('change', () => {
    applyFilters(searchBox?.value?.toLowerCase().trim() || '', getCurrentCategory(), getCurrentSort())
  })

  categoryLabels.forEach((label) => {
    label.addEventListener('click', () => {
      if (searchBox) searchBox.value = ''
      applyFilters('', categoryMapping[label.getAttribute('for')] || 'all', getCurrentSort())
    })
  })
}

function getCurrentCategory() {
  const checkedRadio = document.querySelector('input[name="cat"]:checked')
  return checkedRadio ? categoryMapping[checkedRadio.id] || 'all' : 'all'
}

function getCurrentSort() {
  return document.getElementById('sort-filter')?.value || 'recommended'
}

function applyFilters(searchTerm, category, sortBy = 'recommended') {
  const productSections = document.querySelectorAll('.product-section')
  const allowedSections = categoryToSections[category]
  let visibleProducts = 0

  productSections.forEach((section) => {
    const sectionTitle = section.querySelector('.section-title')?.textContent?.trim() || ''
    const sectionAllowed = !allowedSections || allowedSections.includes(sectionTitle)

    if (!sectionAllowed) {
      section.style.display = 'none'
      return
    }

    let sectionVisibleCount = 0
    section.querySelectorAll('.product-card').forEach((card) => {
      const productName = card.querySelector('.product-name')?.textContent?.toLowerCase() || ''
      const matchesSearch = !searchTerm || productName.includes(searchTerm)
      card.style.display = matchesSearch ? '' : 'none'
      if (matchesSearch) {
        sectionVisibleCount += 1
        visibleProducts += 1
      }
    })

    sortSectionProducts(section, sortBy)
    section.style.display = sectionVisibleCount > 0 ? '' : 'none'
  })

  updateNoResultsMessage(searchTerm, category, visibleProducts === 0)
}

function sortSectionProducts(section, sortBy) {
  const productGrid = section.querySelector('.product-grid')
  if (!productGrid) return

  const cards = Array.from(productGrid.querySelectorAll('.product-card'))
  const comparator = createProductComparator(sortBy)
  cards.sort(comparator).forEach((card) => productGrid.appendChild(card))
}

function createProductComparator(sortBy) {
  return (cardA, cardB) => {
    const cardAMeta = getProductSortMeta(cardA)
    const cardBMeta = getProductSortMeta(cardB)

    switch (sortBy) {
      case 'price-low-high':
        return compareNumbers(cardAMeta.currentPrice, cardBMeta.currentPrice, cardAMeta.originalOrder, cardBMeta.originalOrder)
      case 'price-high-low':
        return compareNumbers(cardBMeta.currentPrice, cardAMeta.currentPrice, cardAMeta.originalOrder, cardBMeta.originalOrder)
      case 'discount-high-low':
        return compareNumbers(cardBMeta.discountAmount, cardAMeta.discountAmount, cardAMeta.originalOrder, cardBMeta.originalOrder)
      case 'best-selling':
      case 'recommended':
      default:
        return cardAMeta.originalOrder - cardBMeta.originalOrder
    }
  }
}

function getProductSortMeta(card) {
  const currentPrice = parseCurrencyValue(card.querySelector('.current-price')?.textContent)
  const originalPrice = parseCurrencyValue(card.querySelector('.original-price')?.textContent)
  const badgeDiscount = parseCurrencyValue(card.querySelector('.discount-badge')?.textContent)

  return {
    currentPrice,
    originalPrice,
    discountAmount: badgeDiscount || Math.max(0, originalPrice - currentPrice),
    originalOrder: Number(card.dataset.originalOrder || 0),
  }
}

function parseCurrencyValue(value) {
  const normalized = String(value || '').replace(/[^\d.]/g, '')
  return Number.parseFloat(normalized) || 0
}

function compareNumbers(firstValue, secondValue, firstOrder, secondOrder) {
  if (firstValue === secondValue) {
    return firstOrder - secondOrder
  }

  return firstValue - secondValue
}

function updateNoResultsMessage(searchTerm, category, shouldShow) {
  let noResultsDiv = document.getElementById('no-results-message')

  if (shouldShow && (searchTerm || category !== 'all')) {
    if (!noResultsDiv) {
      noResultsDiv = document.createElement('div')
      noResultsDiv.id = 'no-results-message'
      noResultsDiv.style.cssText = 'text-align: center; padding: 60px 20px; color: #666; font-size: 18px;'
      noResultsDiv.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">No results</div>
        <p>No products found${searchTerm ? ` for "${searchTerm}"` : ''}</p>
        <button id="reset-filters-btn" style="margin-top: 15px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Show All Products
        </button>
      `
      document.querySelector('main')?.appendChild(noResultsDiv)
      document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
        const searchBox = document.querySelector('.search-box')
        const sortFilter = document.getElementById('sort-filter')
        if (searchBox) searchBox.value = ''
        if (sortFilter) sortFilter.value = 'recommended'
        document.getElementById('cat1')?.click()
        applyFilters('', 'all', 'recommended')
      })
    }

    noResultsDiv.style.display = 'block'
  } else if (noResultsDiv) {
    noResultsDiv.style.display = 'none'
  }
}
