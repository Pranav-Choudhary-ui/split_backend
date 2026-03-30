const ExpenseService = require('../services/expense.service')
const { sendSuccess, sendError } = require('../utils/apiResponse')

const getGroupId = (req) => req.params.groupId || req.body.groupId
const getExpenseId = (req) => req.params.expenseId
const getUserId = (req) => req.params.userId

exports.addExpense = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const expense = await ExpenseService.createExpense(req.body, groupId)

        return sendSuccess(res, {
            status: 201,
            message: 'New expense added',
            expenseId: expense.expenseId
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.editExpense = async (req, res) => {
    try {
        const expenseId = getExpenseId(req)
        const updatedExpense = await ExpenseService.updateExpense(expenseId, req.body)

        return sendSuccess(res, {
            message: 'Expense updated',
            expense: updatedExpense
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.deleteExpense = async (req, res) => {
    try {
        const expenseId = getExpenseId(req)
        const response = await ExpenseService.deleteExpense(expenseId)

        return sendSuccess(res, {
            message: 'Expense deleted',
            response
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.viewExpense = async (req, res) => {
    try {
        const expenseId = getExpenseId(req)
        const expense = await ExpenseService.getExpenseById(expenseId)

        return sendSuccess(res, {
            expense
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.viewGroupExpense = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const result = await ExpenseService.getGroupExpenses(groupId)

        return sendSuccess(res, {
            expense: result.expenses,
            total: result.total
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.viewUserExpense = async (req, res) => {
    try {
        const userId = getUserId(req)
        const result = await ExpenseService.getUserExpenses(userId, req.user)

        return sendSuccess(res, {
            expense: result.expenses,
            total: result.total
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.recentUserExpenses = async (req, res) => {
    try {
        const userId = getUserId(req)
        const expenses = await ExpenseService.getRecentUserExpenses(userId, req.user)

        return sendSuccess(res, {
            expense: expenses
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.groupCategoryExpense = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const data = await ExpenseService.getGroupCategoryExpenses(groupId)

        return sendSuccess(res, {
            data
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.groupMonthlyExpense = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const data = await ExpenseService.getGroupMonthlyExpenses(groupId)

        return sendSuccess(res, {
            data
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.groupDailyExpense = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const data = await ExpenseService.getGroupDailyExpenses(groupId)

        return sendSuccess(res, {
            data
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.userCategoryExpense = async (req, res) => {
    try {
        const userId = getUserId(req)
        const data = await ExpenseService.getUserCategoryExpenses(userId, req.user)

        return sendSuccess(res, {
            data
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.userMonthlyExpense = async (req, res) => {
    try {
        const userId = getUserId(req)
        const data = await ExpenseService.getUserMonthlyExpenses(userId, req.user)

        return sendSuccess(res, {
            data
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.userDailyExpense = async (req, res) => {
    try {
        const userId = getUserId(req)
        const data = await ExpenseService.getUserDailyExpenses(userId, req.user)

        return sendSuccess(res, {
            data
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.viewUserTransactions = async (req, res) => {
    try {
        const userId = getUserId(req)
        const transactions = await ExpenseService.getUserTransactions(userId, req.user)

        return sendSuccess(res, {
            transactions
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}
