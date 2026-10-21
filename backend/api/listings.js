"use strict";

const connectDB = require("../lib/mongo");
const { randomUUID } = require("crypto");

const ALLOWED_ORIGIN = "https://rassam-market.vercel.app";

const CATEGORIES = [
  "Microcontrollers & Development Boards",
  "Sensors & Electronic Components",
  "Motors, Drivers & Robotics",
  "Batteries, Power & Project Kits",
  "Tools, Lab Equipment & Accessories",
];

const CONDITIONS = ["New", "Like New", "Good", "Fair"];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;

  if (origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  }

  try {
    const body = req.body || {};
    const sellerName = typeof body.sellerName === "string" ? body.sellerName.trim() : "";
    const sellerMobile = typeof body.sellerMobile === "string" ? body.sellerMobile.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (sellerName.length < 2 || sellerName.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Seller name must be between 2 and 80 characters.",
      });
    }

    if (!/^[0-9]{10}$/.test(sellerMobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number.",
      });
    }
    const category = body.category;
    const condition = body.condition;
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const price = Number(body.price);
    const stock = Number(body.stock);

    if (title.length < 3 || title.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 3 and 80 characters.",
      });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid category.",
      });
    }

    if (!CONDITIONS.includes(condition)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid condition.",
      });
    }

    if (!Number.isInteger(price) || price < 1 || price > 100000) {
      return res.status(400).json({
        success: false,
        message: "Price must be between ₹1 and ₹100000.",
      });
    }

    if (!Number.isInteger(stock) || stock < 1 || stock > 99) {
      return res.status(400).json({
        success: false,
        message: "Stock must be between 1 and 99.",
      });
    }

    if (description.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 500 characters.",
      });
    }

    await connectDB();

    const db = require("mongoose").connection.db;
    const listingId = `student-${randomUUID()}`;
    const createdAt = new Date();

    const listing = {
      id: listingId,
      name: title,
      category,
      condition,
      price,
      stock,
      description,
      badge: "Student Listing",
      source: "student",
      createdAt,
    };

    const seller = {
      listingId,
      sellerName,
      sellerMobile,
      createdAt,
    };

    await db.collection("products").insertOne(listing);

    try {
      await db.collection("sellers").insertOne(seller);
    } catch (sellerError) {
      await db.collection("products").deleteOne({ id: listingId });
      throw sellerError;
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(201).json({
      success: true,
      listing: { id: listing.id, name: listing.name },
    });
  } catch (error) {
    console.error("Sell listing error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not save listing. Please try again.",
    });
  }
};
