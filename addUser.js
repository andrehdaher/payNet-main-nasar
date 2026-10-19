const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

const {
  MONGO_URI,
  SEED_USER_EMAIL,
  SEED_USER_PASSWORD,
  SEED_USER_NAME,
  SEED_USER_NUMBER,
} = process.env;

if (!MONGO_URI || !SEED_USER_EMAIL || !SEED_USER_PASSWORD) {
  console.error("Set MONGO_URI, SEED_USER_EMAIL, and SEED_USER_PASSWORD before running addUser.js.");
  process.exit(1);
}

async function addUser() {
  try {
    await mongoose.connect(MONGO_URI);
    await User.create({
      email: SEED_USER_EMAIL,
      password: SEED_USER_PASSWORD,
      name: SEED_USER_NAME || SEED_USER_EMAIL,
      number: SEED_USER_NUMBER || "",
      role: "user",
    });
    console.log("User added successfully.");
  } catch (error) {
    console.error("Unable to add user:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

addUser();
