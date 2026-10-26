"use strict";

const connectDB = require("../lib/mongo");

module.exports = async function handler(req, res) {
  const allowedOrigins = new Set(["https://rassam-market.vercel.app","http://localhost:3000","http://127.0.0.1:3000"]);
  const origin = req.headers.origin;

  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  }

  try {
    await connectDB();

    const db = require("mongoose").connection.db;

    const products = await db
      .collection("products")
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            category: 1,
            price: 1,
            badge: 1,
            description: 1,
            icon: 1,
            art: 1,
            image: 1,
            imageUrl: 1,
            imageURL: 1,
            keywords: 1,
            stock: 1,
          },
        },
      )
      .toArray();

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Products API error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load products.",
    });
  }
};
