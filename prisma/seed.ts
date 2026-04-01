import {
  PrismaClient,
  UserRole,
  StoreStatus,
  OrderStatus,
  PaymentType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.platformSetting.upsert({
    where: { key: "commission_percent" },
    create: { key: "commission_percent", value: "10" },
    update: {},
  });
  await prisma.platformSetting.upsert({
    where: { key: "delivery_fee_per_order" },
    create: { key: "delivery_fee_per_order", value: "25" },
    update: {},
  });

  const existingPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Basic Monthly" },
  });
  if (!existingPlan) {
    await prisma.subscriptionPlan.create({
      data: {
        name: "Basic Monthly",
        price: 499,
        durationDays: 30,
      },
    });
  }

  // --- Master catalog (template) ---
  // Keeps store onboarding fast: import products, store only sets customer price & toggles active.
  async function upsertMasterMainCategory(input: {
    key: string;
    name: string;
    sortOrder: number;
  }) {
    const existing = await prisma.masterMainCategory.findFirst({
      where: { key: input.key },
    });
    if (!existing) {
      return await prisma.masterMainCategory.create({
        data: { key: input.key, name: input.name, sortOrder: input.sortOrder },
      });
    }
    return await prisma.masterMainCategory.update({
      where: { id: existing.id },
      data: { name: input.name, sortOrder: input.sortOrder },
    });
  }

  async function upsertMasterSubcategory(input: {
    mainCategoryId: string;
    name: string;
    sortOrder: number;
  }) {
    const existing = await prisma.masterCategory.findFirst({
      where: { mainCategoryId: input.mainCategoryId, name: input.name },
    });
    if (!existing) {
      return await prisma.masterCategory.create({
        data: {
          mainCategoryId: input.mainCategoryId,
          name: input.name,
          sortOrder: input.sortOrder,
        },
      });
    }
    return await prisma.masterCategory.update({
      where: { id: existing.id },
      data: { sortOrder: input.sortOrder },
    });
  }

  async function upsertMasterProduct(input: {
    masterCategoryId: string;
    name: string;
    description?: string;
    unitLabel?: string;
    sortOrder: number;
  }) {
    const existing = await prisma.masterProduct.findFirst({
      where: { masterCategoryId: input.masterCategoryId, name: input.name },
    });
    if (!existing) {
      await prisma.masterProduct.create({
        data: {
          masterCategoryId: input.masterCategoryId,
          name: input.name,
          description: input.description ?? "",
          unitLabel: input.unitLabel,
          sortOrder: input.sortOrder,
        },
      });
      return;
    }
    await prisma.masterProduct.update({
      where: { id: existing.id },
      data: {
        description: input.description ?? existing.description,
        unitLabel: input.unitLabel,
        sortOrder: input.sortOrder,
      },
    });
  }

  // Master Categories (ONLY these 4)
  const groceryMain = await upsertMasterMainCategory({
    key: "grocery",
    name: "Grocery",
    sortOrder: 1,
  });
  const foodBeveragesMain = await upsertMasterMainCategory({
    key: "food-beverages",
    name: "Food & Beverages",
    sortOrder: 2,
  });
  const electronicsMain = await upsertMasterMainCategory({
    key: "electronics",
    name: "Electronics",
    sortOrder: 3,
  });
  const fruitsVegMain = await upsertMasterMainCategory({
    key: "fruits-vegetables",
    name: "Fruits & Vegetables",
    sortOrder: 4,
  });

  const fruitsVegCatalog: { name: string; products: string[] }[] = [
    {
      name: "Fruits (फल)",
      products: [
        "Apple",
        "Banana",
        "Mango",
        "Orange",
        "Grapes (Green/Black)",
        "Pineapple",
        "Papaya",
        "Watermelon",
        "Muskmelon",
        "Pomegranate",
        "Guava",
        "Litchi",
        "Kiwi",
        "Strawberry",
        "Blueberry",
      ],
    },
    {
      name: "Vegetables (सब्जियां)",
      products: [
        "Potato",
        "Onion",
        "Tomato",
        "Brinjal",
        "Cabbage",
        "Cauliflower",
        "Carrot",
        "Beetroot",
        "Radish",
        "Capsicum (Green/Red/Yellow)",
        "Cucumber",
        "Bottle Gourd (Lauki)",
        "Bitter Gourd (Karela)",
        "Ridge Gourd (Tori)",
        "Pumpkin",
        "Spinach (Palak)",
        "Fenugreek (Methi)",
        "Coriander (Dhaniya)",
        "Mint (Pudina)",
        "Green Peas",
      ],
    },
  ];

  const groceryCatalog: { name: string; products: string[] }[] = [
    {
      name: "Rice & Grains",
      products: [
        "Basmati Rice",
        "Kolam Rice",
        "Brown Rice",
        "Poha",
        "Sabudana",
        "Quinoa",
        "Barley",
      ],
    },
    {
      name: "Flour (Atta & Others)",
      products: [
        "Wheat Flour (Atta)",
        "Maida",
        "Besan",
        "Suji (Rava)",
        "Multigrain Atta",
      ],
    },
    {
      name: "Pulses (Daal)",
      products: [
        "Toor Dal",
        "Moong Dal (Yellow/Green)",
        "Chana Dal",
        "Urad Dal",
        "Masoor Dal",
        "Rajma",
        "Kabuli Chana",
        "Black Chana",
      ],
    },
    {
      name: "Spices (Masala) — Whole",
      products: [
        "Cumin (Jeera)",
        "Mustard Seeds (Rai)",
        "Cloves",
        "Cardamom",
        "Cinnamon",
        "Bay Leaf",
      ],
    },
    {
      name: "Spices (Masala) — Powder",
      products: [
        "Turmeric (Haldi)",
        "Red Chilli Powder",
        "Coriander Powder",
        "Cumin Powder",
      ],
    },
    {
      name: "Spices (Masala) — Mix Masala",
      products: [
        "Garam Masala",
        "Chaat Masala",
        "Pav Bhaji Masala",
        "Biryani Masala",
      ],
    },
    {
      name: "Oils & Ghee",
      products: [
        "Mustard Oil",
        "Sunflower Oil",
        "Soybean Oil",
        "Groundnut Oil",
        "Olive Oil",
        "Coconut Oil",
        "Desi Ghee",
      ],
    },
    {
      name: "Essentials",
      products: ["Salt", "Sugar", "Jaggery (Gur)", "Honey"],
    },
    {
      name: "Dairy & Bakery",
      products: [
        "Milk",
        "Curd (Dahi)",
        "Butter",
        "Paneer",
        "Cheese",
        "Cream",
        "Bread (White/Brown)",
        "Buns",
        "Pav",
        "Cakes",
        "Biscuits",
        "Cookies",
      ],
    },
    {
      name: "Personal Care",
      products: [
        "Soap",
        "Shampoo",
        "Conditioner",
        "Toothpaste",
        "Toothbrush",
        "Facewash",
        "Lotion",
        "Deodorant",
      ],
    },
    {
      name: "Household",
      products: [
        "Detergent Powder",
        "Detergent Liquid",
        "Dishwash Bar",
        "Dishwash Liquid",
        "Floor Cleaner",
        "Toilet Cleaner",
        "Garbage Bags",
        "Tissue Paper",
      ],
    },
    {
      name: "Baby Products",
      products: ["Baby Food", "Diapers", "Baby Wipes", "Baby Soap"],
    },
    {
      name: "Pet Products",
      products: ["Dog Food", "Cat Food", "Pet Shampoo"],
    },
    {
      name: "Pooja Samagri",
      products: [
        "Agarbatti",
        "Kapoor",
        "Cotton batti",
        "Matchbox",
        "Mitti diya",
        "Kumkum",
        "Haldi",
        "Chawal",
        "Nariyal",
        "Mishri",
        "Batasha",
        "Kalava",
        "Ganga jal",
        "Phool mala",
        "Sarson oil",
      ],
    },
  ];

  // Cleanup: merge categories (hide old ones from import UI)
  for (const oldName of ["Dairy Products", "Bakery"]) {
    const old = await prisma.masterCategory.findFirst({
      where: { mainCategoryId: groceryMain.id, name: oldName },
      select: { id: true },
    });
    if (old) {
      await prisma.masterCategory.delete({ where: { id: old.id } });
    }
  }

  const foodBeveragesCatalog: { name: string; products: string[] }[] = [
    {
      name: "North Indian",
      products: [
        "Dal Tadka",
        "Paneer Butter Masala",
        "Butter Chicken",
        "Naan",
        "Roti",
        "Jeera Rice",
      ],
    },
    {
      name: "Chinese",
      products: [
        "Hakka Noodles",
        "Fried Rice",
        "Manchurian",
        "Chilli Paneer",
        "Chilli Chicken",
      ],
    },
    {
      name: "Fast Food",
      products: ["Burger", "Pizza", "Sandwich", "French Fries"],
    },
    {
      name: "Street Food",
      products: ["Pani Puri", "Bhel Puri", "Sev Puri", "Chaat items"],
    },
    {
      name: "Biryani & Rice",
      products: ["Chicken Biryani", "Veg Biryani", "Egg Biryani", "Pulao"],
    },
    {
      name: "South Indian",
      products: ["Dosa", "Idli", "Vada", "Uttapam"],
    },
    {
      name: "Non-Veg Specials",
      products: ["Chicken Curry", "Mutton Curry", "Fish Fry", "Egg dishes"],
    },
    {
      name: "Pure Veg / Jain Food",
      products: ["Jain Paneer", "No onion garlic items", "Veg thali"],
    },
    {
      name: "Thali & Combos",
      products: ["Veg Thali", "Non-veg Thali", "Mini meal combos"],
    },
    {
      name: "Desserts & Bakery",
      products: ["Cakes", "Pastries", "Gulab Jamun", "Ice Cream"],
    },
    {
      name: "Packaged Food",
      products: [
        "Noodles",
        "Pasta",
        "Maggi",
        "Vermicelli",
        "Oats",
        "Cornflakes",
        "Muesli",
      ],
    },
    {
      name: "Snacks",
      products: ["Potato Chips", "Namkeen", "Bhujia", "Popcorn", "Nachos"],
    },
    {
      name: "Sweets & Chocolates",
      products: ["Dairy Milk", "KitKat", "Perk", "Candies", "Indian Sweets"],
    },
    {
      name: "Beverages",
      products: [
        "Tea",
        "Coffee",
        "Soft Drinks",
        "Fruit Juice",
        "Energy Drinks",
        "Packaged Water",
      ],
    },
    {
      name: "Beverages (Restaurant)",
      products: ["Cold drinks", "Juice", "Lassi", "Tea / Coffee"],
    },
    {
      name: "Rolls & Wraps",
      products: ["Veg roll", "Chicken roll", "Frankie"],
    },
    {
      name: "Italian",
      products: ["Pasta", "Pizza", "Lasagna"],
    },
    {
      name: "Healthy Food",
      products: ["Salads", "Diet meals", "Protein bowls"],
    },
  ];

  const electronicsCatalog: { name: string; products: string[] }[] = [];

  async function seedMain(
    mainId: string,
    groups: { name: string; products: string[] }[],
  ) {
    let catSort = 1;
    for (const group of groups) {
      const cat = await upsertMasterSubcategory({
        mainCategoryId: mainId,
        name: group.name,
        sortOrder: catSort++,
      });
      let prodSort = 1;
      for (const name of group.products) {
        await upsertMasterProduct({
          masterCategoryId: cat.id,
          name,
          sortOrder: prodSort++,
        });
      }
    }
  }

  await seedMain(fruitsVegMain.id, fruitsVegCatalog);
  await seedMain(groceryMain.id, groceryCatalog);
  await seedMain(foodBeveragesMain.id, foodBeveragesCatalog);
  await seedMain(electronicsMain.id, electronicsCatalog);

  const admin = await prisma.user.upsert({
    where: { phone: "9999999999" },
    create: {
      phone: "9999999999",
      name: "Platform Admin",
      role: UserRole.ADMIN,
    },
    update: { name: "Platform Admin", role: UserRole.ADMIN },
  });

  const demoStoreOwner = await prisma.user.upsert({
    where: { phone: "9888888888" },
    create: {
      phone: "9888888888",
      name: "Demo Kirana",
      role: UserRole.STORE_OWNER,
    },
    update: {},
  });

  const demoDelivery = await prisma.user.upsert({
    where: { phone: "9777777777" },
    create: {
      phone: "9777777777",
      name: "Demo Rider",
      role: UserRole.DELIVERY,
    },
    update: { role: UserRole.DELIVERY },
  });

  const demoCustomer = await prisma.user.upsert({
    where: { phone: "9666666666" },
    create: {
      phone: "9666666666",
      name: "Demo Customer",
      role: UserRole.CUSTOMER,
    },
    update: {},
  });

  let store = await prisma.store.findFirst({
    where: { ownerId: demoStoreOwner.id },
  });

  if (!store) {
    store = await prisma.store.create({
      data: {
        name: "Demo Grocery (DLF)",
        address: "Sector 42, Demo City",
        latitude: 28.4595,
        longitude: 77.0266,
        ownerId: demoStoreOwner.id,
        status: StoreStatus.APPROVED,
        shopVertical: "grocery",
        imageUrl:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=600&fit=crop&q=80",
      },
    });
    const grocery = await prisma.category.create({
      data: { storeId: store.id, name: "Grocery" },
    });
    await prisma.product.createMany({
      data: [
        {
          storeId: store.id,
          categoryId: grocery.id,
          name: "Milk 1L",
          description: "Toned milk",
          mrp: 32,
          price: 28,
          stock: 50,
        },
        {
          storeId: store.id,
          categoryId: grocery.id,
          name: "Bread",
          description: "Whole wheat",
          mrp: 45,
          price: 40,
          stock: 30,
        },
      ],
    });
  } else {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        shopVertical: "grocery",
        imageUrl:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=600&fit=crop&q=80",
      },
    });
  }

  const groceryCategoryStores = await prisma.store.findMany({
    where: {
      categories: { some: { name: "Grocery" } },
    },
    select: { id: true },
  });
  for (const { id } of groceryCategoryStores) {
    await prisma.store.update({
      where: { id },
      data: { shopVertical: "grocery" },
    });
  }

  const orderCount = await prisma.order.count();
  if (orderCount === 0 && store) {
    const cat = await prisma.category.findFirst({
      where: { storeId: store.id },
    });
    const milk = await prisma.product.findFirst({
      where: { storeId: store.id, name: "Milk 1L" },
    });
    if (cat && milk) {
      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            userId: demoCustomer.id,
            storeId: store.id,
            totalAmount: 56,
            status: OrderStatus.DELIVERED,
            paymentType: PaymentType.COD,
            deliveryAddress:
              "Demo delivery — Sector 42, Demo City (seed order)",
            deliveryLat: 28.4595,
            deliveryLng: 77.0266,
            items: {
              create: [
                {
                  productId: milk.id,
                  quantity: 2,
                  price: 28,
                },
              ],
            },
          },
        });
        await tx.product.update({
          where: { id: milk.id },
          data: { stock: { decrement: 2 } },
        });
      });
    }
  }

  console.info("Seed OK");
  console.info("Admin phone:", admin.phone, "(Expo app login uses DB OTP — see server logs in dev)");
  console.info("Store owner:", demoStoreOwner.phone);
  console.info("Delivery:", demoDelivery.phone);
  console.info("Customer:", demoCustomer.phone);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
