"use strict";

const connectDB = require("../lib/mongo");
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  try {
    await connectDB();

    const db = require("mongoose").connection.db;

    // Allow customers to place orders
    if (req.method === "POST") {
      const { name, phone, address, pincode, items } = req.body || {};

      if (
        !name ||
        !phone ||
        !address ||
        !pincode ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide your details and cart items.",
        });
      }

      // Validate each cart item
      for (const item of items) {
        if (
          !item.id ||
          !Number.isInteger(Number(item.qty)) ||
          Number(item.qty) < 1 ||
          Number(item.qty) > 100
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid product or quantity.",
          });
        }
      }

      // Get actual product details from MongoDB
      const productIds = [...new Set(items.map((item) => String(item.id)))];

      const products = await db
        .collection("products")
        .find({ id: { $in: productIds } })
        .toArray();

      const productMap = new Map(
        products.map((product) => [String(product.id), product]),
      );

      const orderItems = [];

      for (const item of items) {
        const product = productMap.get(String(item.id));

        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.id}`,
          });
        }

        const qty = Number(item.qty);
        const price = Number(product.price);

        if (!Number.isFinite(price) || price < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid product price.",
          });
        }

        orderItems.push({
          id: String(product.id),
          name: product.name,
          price,
          qty,
        });
      }

      const amountRupees = orderItems.reduce(
        (total, item) => total + item.price * item.qty,
        0,
      );

      const order = {
        id: `ord-${crypto.randomUUID()}`,
        name: String(name).trim(),
        phone: String(phone).trim(),
        address: String(address).trim(),
        pincode: String(pincode).trim(),
        items: orderItems,
        amountRupees,
        status: "awaiting-payment",
        delivery: "packed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("orders").insertOne(order);

      return res.status(201).json({
        success: true,
        message: "Order saved successfully!",
        order: {
          id: order.id,
          items: order.items,
          amountRupees: order.amountRupees,
          status: order.status,
        },
      });
    }

    // Check the total number of saved orders
    if (req.method === "GET") {
      const count = await db.collection("orders").countDocuments();

      return res.status(200).json({
        success: true,
        count,
      });
    }

    res.setHeader("Allow", "GET, POST");

    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  } catch (error) {
    console.error("RASSAM orders API error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process the order right now.",
    });
  }
};
