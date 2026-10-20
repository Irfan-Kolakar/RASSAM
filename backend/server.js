"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ==================================================
// RASSAM CONFIGURATION
// ==================================================

const PORT = Number(process.env.PORT) || 3000;

const FRONTEND_DIR = path.resolve(__dirname, "..", "frontend");
const INDEX_FILE = path.join(FRONTEND_DIR, "index.html");

// MIME types for frontend files.
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

// ==================================================
// RESPONSE HELPERS
// ==================================================

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  res.end(JSON.stringify(data, null, 2));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });

  res.end(message);
}
// ==================================================
// LISTINGS (in memory for now; cleared when the server restarts)
// ==================================================

const LISTING_CATEGORIES = [
  "Microcontrollers & Development Boards",
  "Sensors & Electronic Components",
  "Motors, Drivers & Robotics",
  "Batteries, Power & Project Kits",
  "Tools, Lab Equipment & Accessories",
];
const LISTING_CONDITIONS = ["New", "Like New", "Good", "Fair"];
const listings = [];

function readJSON(req, limitBytes = 20000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Request is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function validateListing(body) {
  const text = (v) => String(v ?? "").trim();
  const listing = {
    title: text(body.title).slice(0, 80),
    category: text(body.category),
    condition: text(body.condition),
    price: Number(body.price),
    stock: Number(body.stock),
    description: text(body.description).slice(0, 500),
  };
  if (listing.title.length < 3) return "Title needs at least 3 characters.";
  if (!LISTING_CATEGORIES.includes(listing.category))
    return "Choose a valid category.";
  if (!LISTING_CONDITIONS.includes(listing.condition))
    return "Choose a valid condition.";
  if (
    !Number.isInteger(listing.price) ||
    listing.price < 1 ||
    listing.price > 100000
  )
    return "Price must be a whole number between 1 and 100000.";
  if (
    !Number.isInteger(listing.stock) ||
    listing.stock < 1 ||
    listing.stock > 99
  )
    return "Stock must be between 1 and 99.";
  return listing;
}

async function handleListings(req, res) {
  if (req.method === "GET") {
    return sendJSON(res, 200, {
      success: true,
      count: listings.length,
      listings: listings.slice(-20).reverse(),
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readJSON(req);
    } catch (error) {
      return sendJSON(res, 400, { success: false, message: error.message });
    }

    const result = validateListing(body);
    if (typeof result === "string") {
      return sendJSON(res, 400, { success: false, message: result });
    }

    const listing = {
      id: "lst-" + Date.now().toString(36) + "-" + listings.length,
      ...result,
      createdAt: new Date().toISOString(),
    };
    listings.push(listing);
    return sendJSON(res, 201, { success: true, listing });
  }

  res.setHeader("Allow", "GET, POST");
  return sendJSON(res, 405, { success: false, message: "Method not allowed." });
}
// ==================================================
// ORDERS (in memory for now; payment is added later)
// ==================================================

const orders = [];
const ID_PATTERN = /^[a-z0-9-]{1,60}$/;

function validateOrder(body) {
  const text = (v) => String(v ?? "").trim();
  const name = text(body.name).slice(0, 60);
  const phone = text(body.phone).replace(/\s+/g, "");
  const address = text(body.address).slice(0, 300);
  const pincode = text(body.pincode);
  const items = Array.isArray(body.items) ? body.items : [];

  if (name.length < 2) return "Enter your full name.";
  if (!/^\d{10}$/.test(phone)) return "Phone must be 10 digits.";
  if (address.length < 10) return "Enter a full delivery address.";
  if (!/^\d{6}$/.test(pincode)) return "Pincode must be 6 digits.";
  if (items.length < 1 || items.length > 20)
    return "Your stash is empty or too large.";

  const cleanItems = [];
  for (const item of items) {
    const id = text(item.id);
    const qty = Number(item.qty);
    if (!ID_PATTERN.test(id)) return "One of the items is invalid.";
    if (!Number.isInteger(qty) || qty < 1 || qty > 99)
      return "Quantities must be 1 to 99.";
    cleanItems.push({ id, qty });
  }

  return { name, phone, address, pincode, items: cleanItems };
}

async function handleOrders(req, res) {
  if (req.method === "GET") {
    return sendJSON(res, 200, { success: true, count: orders.length });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readJSON(req);
    } catch (error) {
      return sendJSON(res, 400, { success: false, message: error.message });
    }

    const result = validateOrder(body);
    if (typeof result === "string") {
      return sendJSON(res, 400, { success: false, message: result });
    }

    const order = {
      id: "ord-" + Date.now().toString(36) + "-" + orders.length,
      status: "awaiting-payment",
      ...result,
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    return sendJSON(res, 201, { success: true, order });
  }

  res.setHeader("Allow", "GET, POST");
  return sendJSON(res, 405, { success: false, message: "Method not allowed." });
}
// ==================================================
// ORDER MESSAGES + ADMIN (in memory; cleared on restart)
// ==================================================
require("dotenv").config();
const messages = [];
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const DELIVERY_STEPS = {
  packed: "Packed and ready",
  shipped: "Shipped",
  delivered: "Delivered",
};

function adminAuthorized(req) {
  const given = String(req.headers["x-admin-token"] || "");
  if (ADMIN_TOKEN.length < 12 || given.length !== ADMIN_TOKEN.length)
    return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(ADMIN_TOKEN));
}

function findOrder(id) {
  return orders.find((o) => o.id === id);
}

function addMessage(orderId, from, text) {
  const msg = {
    id: "msg-" + Date.now().toString(36) + "-" + messages.length,
    orderId,
    from,
    text,
    createdAt: new Date().toISOString(),
  };
  messages.push(msg);
  return msg;
}

async function handleMessages(req, res) {
  if (req.method === "GET") {
    const orderId =
      new URL(req.url, "http://localhost").searchParams.get("orderId") || "";
    const order = findOrder(orderId);
    if (!order)
      return sendJSON(res, 404, {
        success: false,
        message: "Order not found.",
      });
    return sendJSON(res, 200, {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        delivery: order.delivery || null,
      },
      messages: messages.filter((m) => m.orderId === orderId),
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readJSON(req);
    } catch (error) {
      return sendJSON(res, 400, { success: false, message: error.message });
    }
    const orderId = String(body.orderId || "");
    const text = String(body.text || "").trim();
    if (!findOrder(orderId))
      return sendJSON(res, 404, {
        success: false,
        message: "Order not found.",
      });
    if (text.length < 1 || text.length > 500) {
      return sendJSON(res, 400, {
        success: false,
        message: "Message must be 1 to 500 characters.",
      });
    }
    return sendJSON(res, 201, {
      success: true,
      message: addMessage(orderId, "customer", text),
    });
  }

  res.setHeader("Allow", "GET, POST");
  return sendJSON(res, 405, { success: false, message: "Method not allowed." });
}

async function handleAdminInbox(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJSON(res, 405, {
      success: false,
      message: "Method not allowed.",
    });
  }
  if (!adminAuthorized(req))
    return sendJSON(res, 401, {
      success: false,
      message: "Admin access denied.",
    });

  return sendJSON(res, 200, {
    success: true,
    orders: orders
      .slice()
      .reverse()
      .map((o) => ({
        id: o.id,
        status: o.status,
        delivery: o.delivery || null,
        name: o.name,
        phone: o.phone,
        address: o.address,
        pincode: o.pincode,
        items: o.items,
        amountRupees: o.amountRupees,
        createdAt: o.createdAt,
        messages: messages.filter((m) => m.orderId === o.id),
      })),
  });
}

async function handleAdminReply(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJSON(res, 405, {
      success: false,
      message: "Method not allowed.",
    });
  }
  if (!adminAuthorized(req))
    return sendJSON(res, 401, {
      success: false,
      message: "Admin access denied.",
    });

  let body;
  try {
    body = await readJSON(req);
  } catch (error) {
    return sendJSON(res, 400, { success: false, message: error.message });
  }

  const order = findOrder(String(body.orderId || ""));
  if (!order)
    return sendJSON(res, 404, { success: false, message: "Order not found." });

  const text = String(body.text || "")
    .trim()
    .slice(0, 500);
  const step = String(body.delivery || "");
  if (step && !Object.prototype.hasOwnProperty.call(DELIVERY_STEPS, step)) {
    return sendJSON(res, 400, {
      success: false,
      message: "Unknown delivery status.",
    });
  }
  if (!text && !step) {
    return sendJSON(res, 400, {
      success: false,
      message: "Write a message or choose a delivery status.",
    });
  }

  if (step) {
    order.delivery = step;
    addMessage(order.id, "system", `Delivery update: ${DELIVERY_STEPS[step]}.`);
  }
  if (text) addMessage(order.id, "admin", text);

  return sendJSON(res, 201, { success: true });
}
// ==================================================
// API ROUTES
// ==================================================

function handleAPI(req, res, pathname) {
  // Health check.
  if (req.method === "GET" && pathname === "/api/health") {
    return sendJSON(res, 200, {
      success: true,
      name: "RASSAM",
      status: "online",
      message: "RASSAM backend is running successfully.",
      timestamp: new Date().toISOString(),
    });
  }

  // API information.
  if (req.method === "GET" && pathname === "/api") {
    return sendJSON(res, 200, {
      success: true,
      name: "RASSAM API",
      version: "1.0.0",
      status: "online",
      description:
        "A student-to-student marketplace for affordable electronics.",
      endpoints: {
        website: "/",
        api: "/api",
        health: "/api/health",
      },
      database: {
        configured: Boolean(process.env.MONGODB_URI),
        message: process.env.MONGODB_URI
          ? "A MongoDB connection string is configured."
          : "MongoDB is not configured.",
      },
    });
  }
  if (pathname === "/api/listings") {
    return handleListings(req, res);
  }
  if (pathname === "/api/orders") {
    return handleOrders(req, res);
  }

  if (pathname === "/api/messages") return handleMessages(req, res);
  if (pathname === "/api/admin/inbox") return handleAdminInbox(req, res);
  if (pathname === "/api/admin/reply") return handleAdminReply(req, res);

  // No other API routes have been implemented yet.
  return sendJSON(res, 404, {
    success: false,
    error: "API_ENDPOINT_NOT_FOUND",
    message: `No API route exists for ${req.method} ${pathname}.`,
  });
}

// ==================================================
// FRONTEND FILE SERVING
// ==================================================

function serveFrontendFile(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");

    return sendJSON(res, 405, {
      success: false,
      message: "Method not allowed.",
    });
  }

  let decodedPath;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return sendText(res, 400, "Invalid URL.");
  }

  // "/" must resolve to the actual homepage.
  if (decodedPath === "/") {
    decodedPath = "/index.html";
  }

  // Prevent access to files outside the frontend directory.
  const relativePath = decodedPath.replace(/^[/\\]+/, "");
  const filePath = path.resolve(FRONTEND_DIR, relativePath);

  if (
    filePath !== FRONTEND_DIR &&
    !filePath.startsWith(FRONTEND_DIR + path.sep)
  ) {
    return sendText(res, 403, "Forbidden.");
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      console.error(`[FRONTEND] File not found: ${filePath}`);

      return sendText(res, 404, `File not found: ${decodedPath}`);
    }

    const contentType =
      MIME_TYPES[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });

    if (req.method === "HEAD") {
      return res.end();
    }

    const stream = fs.createReadStream(filePath);

    stream.on("error", (error) => {
      console.error("[FRONTEND] File read error:", error.message);

      if (!res.headersSent) {
        sendText(res, 500, "Unable to read frontend file.");
      } else {
        res.destroy(error);
      }
    });

    stream.pipe(res);
  });
}

// ==================================================
// MAIN REQUEST HANDLER
// ==================================================

const server = http.createServer((req, res) => {
  let pathname;

  try {
    const requestURL = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`,
    );

    pathname = requestURL.pathname;
  } catch {
    return sendText(res, 400, "Invalid request URL.");
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  // API routes must be handled before frontend files.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return handleAPI(req, res, pathname);
  }

  // Serve the homepage, CSS, JavaScript, images, and fonts.
  return serveFrontendFile(req, res, pathname);
});

// ==================================================
// SERVER ERRORS
// ==================================================

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing RASSAM server before restarting.`,
    );
  } else {
    console.error("RASSAM server error:", error);
  }

  process.exitCode = 1;
});

// ==================================================
// START SERVER
// ==================================================

server.listen(PORT, () => {
  console.log("");
  console.log("============================================");
  console.log("             RASSAM IS ONLINE");
  console.log("============================================");
  console.log(`Website:  http://localhost:${PORT}`);
  console.log(`API:      http://localhost:${PORT}/api`);
  console.log(`Health:   http://localhost:${PORT}/api/health`);
  console.log("--------------------------------------------");
  console.log(`Backend:  ${__dirname}`);
  console.log(`Frontend: ${FRONTEND_DIR}`);
  console.log(`Homepage: ${fs.existsSync(INDEX_FILE) ? "FOUND" : "MISSING"}`);
  console.log("============================================");
  console.log("");
});

// ==================================================
// GRACEFUL SHUTDOWN
// ==================================================

function shutdown() {
  console.log("\nShutting down RASSAM...");

  server.close((error) => {
    if (error) {
      console.error("Shutdown error:", error.message);
      process.exitCode = 1;
      return;
    }

    console.log("RASSAM server stopped.");
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
