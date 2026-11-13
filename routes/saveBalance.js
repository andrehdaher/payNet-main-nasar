// routes/balanceRoutes.js
const express = require('express');
const router = express.Router();
const Balance = require('../models/Balance');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sypAmount } = require('../utils/money');
const { confirmPaymentService } = require('../services/paymentService');


const MANUAL_PAYMENT_REVIEW_MESSAGE =
  'جار التاكد من الدفعة بشكل يدوي الرجاء الانتظار';

// const invalidateBalanceCache = async () => {
//   await cache.delByPrefix('balance:');
//   await cache.delByPrefix('report:');
//   await cache.delByPrefix('users:');
// };
//شحن رصيد الي مع حساب شام كاش
router.post('/haram', authMiddleware, async (req, res) => {
  try {
    const { destination, name, number, operator, noticeNumber, amount, date } =
      req.body;

    const userId = req.user.id;
    const cleanNoticeNumber = String(noticeNumber || '').trim();

    if (!/^\d{1,30}$/.test(cleanNoticeNumber)) {
      console.error('Invalid notice number format:', cleanNoticeNumber);
      return res.status(400).json({
        message: MANUAL_PAYMENT_REVIEW_MESSAGE,
      });
    }

    const existingNotice = await Balance.collection.findOne({
      noticeNumber: { $in: [cleanNoticeNumber, Number(cleanNoticeNumber)] },
    });

    if (existingNotice) {
      console.error('Duplicate notice number:', cleanNoticeNumber);
      return res.status(409).json({
        message: MANUAL_PAYMENT_REVIEW_MESSAGE,
      });
    }

    const balanceDaen = await Balance.findOne({}).sort({ _id: -1 });
    const amountDaen = balanceDaen?.amountDaen || 0;

    const user = await User.findById(userId);

    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({
        message: MANUAL_PAYMENT_REVIEW_MESSAGE,
      });
    }

    const balanceDoc = new Balance({
      user: userId,
      destination,
      name: user.email,
      number,
      operator,
      noticeNumber: cleanNoticeNumber,
      amount: Number(sypAmount(amount)),
      date,
      amountDaen,
    });

    await balanceDoc.save();
    //  await invalidateBalanceCache();

    const params = new URLSearchParams({
      resource: 'shamcash',
      action: 'find_tx',
      tx: cleanNoticeNumber,
      account_address: "4d647bc98f063537bf482868590807a1",
      api_key: "5eef4628bbf241f2b56bb73c60e8cd8de633513818b68db362b477eb17c05771",
    });
    const response = await fetch('https://apisyria.com/api/v1?' + params, {
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.log('API Error:', response.status);
      console.log('API Response:', await response.text());
      return res.status(500).json({
        message: MANUAL_PAYMENT_REVIEW_MESSAGE,
      });
    }

    const autoConfirm = await response.json();

    if (!autoConfirm?.data?.found) {
      console.error('Transaction not found for notice number:', cleanNoticeNumber);
      return res.status(404).json({
        message: MANUAL_PAYMENT_REVIEW_MESSAGE,
      });
    }

    const apiDate = new Date(
      autoConfirm.data.transaction.datetime.replace(' ', 'T')
    );

    const requestDate = new Date(date);

    const diffMs = Math.abs(apiDate.getTime() - requestDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);

    if (
      Number(autoConfirm?.data?.transaction?.amount) === Number(amount) &&
      autoConfirm?.data?.transaction?.currency === 'SYP' &&
      diffHours <= 48
    ) {
      await confirmPaymentService({
        id: balanceDoc.id,
        amount: Number(amount),
      });

      return res.status(200).json({
        message: 'تم اضافة الرصيد تلقائيا بنجاح',
      });
    }

    return res.status(200).json({
      message: MANUAL_PAYMENT_REVIEW_MESSAGE,
    });
  } catch (error) {
    console.error('Error in /haram route:', error);
    if (error.code === 11000)
      return res.status(409).json({ message: MANUAL_PAYMENT_REVIEW_MESSAGE });
    console.error('Deposit verification failed:', error.code || error.name);

    return res.status(error.status || 500).json({
      message: MANUAL_PAYMENT_REVIEW_MESSAGE,
    });
  }
});

router.get('/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await Balance.find({ user: userId }).sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    console.error('خطأ في جلب الدفعات:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.get('/all-admin', async (req, res) => {
  try {
    const payments = await Balance.find().sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    console.error('خطأ في جلب الدفعات:', error);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;
