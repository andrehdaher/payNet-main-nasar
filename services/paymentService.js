const mongoose = require('mongoose');
const {
  Decimal,
  sypAmount,
  walletAdjustment,
  moneyError,
} = require('../utils/money');
const Balance = require('../models/Balance');
const User = require('../models/User');
const WalletAdjustment = require('../models/WalletAdjustment');
const atomic = async (task) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await task(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const idRequired = (id) => {
  if (!mongoose.isValidObjectId(id)) throw moneyError('معرف العملية غير صالح');
};

const confirmPaymentService = async ({ id, amount, actorId }) => {
  idRequired(id);
  return atomic(async (session) => {
    const deposit = await Balance.findById(id).session(session);
    if (!deposit)
      throw moneyError('لم يتم العثور على الدفعة', 404, 'DEPOSIT_NOT_FOUND');
    const total = sypAmount(deposit.amount);
    if (amount !== undefined && sypAmount(amount) !== total)
      throw moneyError(
        'المبلغ المرسل لا يطابق الدفعة المسجلة',
        409,
        'AMOUNT_MISMATCH'
      );
    const user = await User.findById(deposit.user).session(session);
    if (!user)
      throw moneyError('صاحب الدفعة غير موجود', 409, 'DEPOSIT_OWNER_MISSING');
    if (deposit.isConfirmed)
      return {
        success: true,
        duplicate: true,
        message: 'الدفعة مؤكدة سابقًا',
        data: {
          userId: user._id,
          newBalance: user.balance,
          paymentId: deposit._id,
        },
      };
    const updated = await Balance.findOneAndUpdate(
      { _id: id, isConfirmed: { $ne: true } },
      {
        $set: {
          isConfirmed: true,
          confirmedAt: new Date(),
          ...(actorId ? { confirmedBy: actorId } : {}),
        },
      },
      { new: true, session }
    );
    if (!updated)
      throw moneyError(
        'تغيرت حالة الدفعة، أعد المحاولة',
        409,
        'DEPOSIT_CHANGED'
      );
    const credited = await User.findOneAndUpdate(
      { _id: user._id },
      walletAdjustment(total),
      { new: true, session }
    );
    if (!credited)
      throw moneyError(
        'صاحب الدفعة غير موجود',
        409,
        'DEPOSIT_OWNER_MISSING'
      );
    await WalletAdjustment.create(
      [
        {
          key: `deposit:${id}`,
          user: user._id,
          actor: actorId,
          source: 'deposit',
          sourceId: deposit._id,
          amountSyp: total,
          balanceBeforeSyp: new Decimal(user.balance || 0).toFixed(2),
          balanceAfterSyp: new Decimal(credited.balance).toFixed(2),
          note: 'تأكيد الدفعة المسجلة',
        },
      ],
      { session }
    );
    return {
      success: true,
      duplicate: false,
      message: 'تم تحديث رصيد المستخدم',
      data: {
        userId: user._id,
        newBalance: credited.balance,
        paymentId: updated._id,
      },
    };
  });
};

module.exports = { confirmPaymentService };
