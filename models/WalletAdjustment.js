const mongoose = require('mongoose');

const walletAdjustmentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actor: mongoose.Schema.Types.ObjectId,
  source: { type: String, required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amountSyp: { type: String, required: true },
  balanceBeforeSyp: { type: String, required: true },
  balanceAfterSyp: { type: String, required: true },
  note: String,
}, { timestamps: true });

module.exports = mongoose.model('WalletAdjustment', walletAdjustmentSchema);
