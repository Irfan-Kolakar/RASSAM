"use strict";

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const localEnv = path.resolve(process.cwd(), ".env.local");
const defaultEnv = path.resolve(process.cwd(), ".env");

dotenv.config({
  path: fs.existsSync(localEnv) ? localEnv : defaultEnv,
});

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error(
    "MONGODB_URI is missing. Configure it in your private .env.local file.",
  );
  process.exit(1);
}

const productsPath = path.resolve(__dirname, "../data/products.json");

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

async function main() {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  const collection = mongoose.connection.db.collection("products");

  let inserted = 0;
  let updated = 0;

  for (const product of products) {
    const result = await collection.updateOne(
      { id: product.id },
      {
        $set: {
          ...product,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount) {
      inserted++;
    } else if (result.modifiedCount) {
      updated++;
    }
  }

  await collection.createIndex({ id: 1 }, { unique: true });

  console.log("RASSAM catalogue seeding completed.");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Source products: ${products.length}`);
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  console.log("Collection: products");
}

main()
  .catch((error) => {
    console.error("Database seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
