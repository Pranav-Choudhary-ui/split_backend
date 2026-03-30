const express = require('express');
const controller = require('../controllers/expense.controller')

const router = express.Router();

router.post('/', controller.addExpense)
router.get('/:expenseId', controller.viewExpense)
router.put('/:expenseId', controller.editExpense)
router.delete('/:expenseId', controller.deleteExpense)

router.get('/group/:groupId', controller.viewGroupExpense)
router.get('/user/:userId', controller.viewUserExpense)
router.get('/user/:userId/recent', controller.recentUserExpenses)
router.get('/user/:userId/transactions', controller.viewUserTransactions)

router.get('/group/:groupId/analytics/category', controller.groupCategoryExpense)
router.get('/group/:groupId/analytics/monthly', controller.groupMonthlyExpense)
router.get('/group/:groupId/analytics/daily', controller.groupDailyExpense)

router.get('/user/:userId/analytics/category', controller.userCategoryExpense)
router.get('/user/:userId/analytics/monthly', controller.userMonthlyExpense)
router.get('/user/:userId/analytics/daily', controller.userDailyExpense)


module.exports = router;