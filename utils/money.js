const Decimal = require('decimal.js');
const moneyError = (message, status = 400, code = 'INVALID_AMOUNT') => Object.assign(new Error(message), { status, code });
const sypAmount = (value, { allowZero = false } = {}) => {
  if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !/^\d+(\.\d{1,2})?$/.test(value))) throw moneyError('المبلغ يجب أن يكون رقمًا صالحًا بحد أقصى منزلتين عشريتين');
  let amount;
  try { amount = new Decimal(value); } catch { throw moneyError('المبلغ غير صالح'); }
  if (!Number.isFinite(amount.toNumber()) || amount.lt(0) || (!allowZero && amount.eq(0)) || amount.decimalPlaces() > 2) throw moneyError('المبلغ خارج الحدود المسموحة');
  return amount.toFixed(2);
};
const walletAdjustment = (amount) => [{ $set: { balance: { $round: [{ $add: [{ $ifNull: ['$balance', 0] }, Number(amount)] }, 2] } } }];
module.exports = { Decimal, sypAmount, walletAdjustment, moneyError };
