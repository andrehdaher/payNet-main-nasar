// // addUser.js
// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const User = require("./models/User");

// // تحميل متغيرات البيئة
// dotenv.config();

// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(async () => {
//   console.log("🟢 تم الاتصال بقاعدة البيانات");
// const result = await User.updateMany(
//   {},
//   [
//     {
//       $set: {
//         balance: { $divide: ["$balance", 100] }
//       }
//     }
//   ]
// );

// console.log("✅ تم التحديث بنجاح");
// console.log("عدد الحسابات:", result.matchedCount);
// console.log("عدد الحسابات المعدلة:", result.modifiedCount);

//   process.exit(0);
// })
// .catch((err) => {
//   console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err);
//   process.exit(1);
// });
