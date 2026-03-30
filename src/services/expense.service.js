const groupModel = require('../model/group.model')
const expenseModel = require('../model/expense.model')
const settlementModel = require('../model/settlement.model')
const userModel = require('../model/user.model')
const { isValidObjectId } = require('mongoose')
const validator = require('../utils/validation')
const apiAuth = require('../utils/apiAuthentication')
const { createHttpError } = require('../utils/apiResponse')
const GroupService = require('./group.service')

const roundTo2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

class ExpenseService {
    /**
     * Parse and validate date
     */
    static parseDate(value, fieldName) {
        if (!value) {
            return undefined
        }

        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) {
            throw createHttpError(400, `${fieldName} is invalid`)
        }

        return parsed
    }

    /**
     * Build and validate expense payload
     */
    static buildExpensePayload(body, fallbackGroupId) {
        validator.notNull(body.expenseName)
        validator.notNull(body.expenseOwner)
        validator.notNull(body.expenseMembers)

        const expenseAmount = Number(body.expenseAmount)
        validator.positiveNumberValidation(expenseAmount, 'expenseAmount')

        validator.nonEmptyUniqueStringArray(body.expenseMembers, 'expenseMembers')
        const expenseMembers = body.expenseMembers.map((member) => member.trim())
        validator.nonEmptyUniqueStringArray(expenseMembers, 'expenseMembers')

        const expenseOwner = body.expenseOwner.trim()
        validator.ownerInMembersValidation(expenseOwner, expenseMembers)

        const groupId = body.groupId || fallbackGroupId
        validator.notNull(groupId)

        const expensePayload = {
            groupId,
            expenseName: body.expenseName.trim(),
            expenseDescription: body.expenseDescription?.trim(),
            expenseAmount,
            expenseCategory: body.expenseCategory,
            expenseCurrency: body.expenseCurrency,
            expenseDate: this.parseDate(body.expenseDate, 'expenseDate') || new Date(),
            expenseOwner,
            expenseMembers,
            expenseType: body.expenseType
        }

        if (expensePayload.expenseDescription && expensePayload.expenseDescription.length > 300) {
            throw createHttpError(400, 'expenseDescription should be less than 300 characters')
        }

        return expensePayload
    }

    /**
     * Validate that all expense members are in the group
     */
    static async validateMembersInGroup(groupId, members) {
        for (const member of members) {
            const memberValidation = await validator.groupUserValidation(member, groupId)
            if (!memberValidation) {
                throw createHttpError(400, `User ${member} is not part of this group`)
            }
        }
    }

    /**
     * Load group by ID
     */
    static async loadGroup(groupId) {
        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(400, 'Invalid Group Id')
        }

        return group
    }

    /**
     * Validate that request user matches the param user
     */
    static async resolveRequestedUserEmail(requestedUser) {
        validator.notNull(requestedUser)

        const normalizedUser = typeof requestedUser === 'string'
            ? requestedUser.trim()
            : requestedUser

        if (isValidObjectId(normalizedUser)) {
            const user = await userModel.findById(normalizedUser, { emailId: 1 })
            if (!user) {
                throw createHttpError(404, 'User Id not found!')
            }

            return user.emailId
        }

        return typeof normalizedUser === 'string'
            ? normalizedUser.toLowerCase()
            : normalizedUser
    }

    static async validateRequestedUser(authenticatedUser, requestedUser) {
        const resolvedUser = await this.resolveRequestedUserEmail(requestedUser)
        apiAuth.validateUser(authenticatedUser, resolvedUser)
        return resolvedUser
    }

    /**
     * Build lookup map for groups by their IDs
     */
    static async buildGroupLookup(groupIds) {
        if (groupIds.length === 0) {
            return new Map()
        }

        const groups = await groupModel.find(
            { _id: { $in: groupIds } },
            { groupName: 1, groupCurrency: 1 }
        )

        return new Map(groups.map((group) => [String(group._id), group]))
    }

    /**
     * Create a new expense
     */
    static async createExpense(expenseData, groupId) {
        const group = await this.loadGroup(groupId)

        const expensePayload = this.buildExpensePayload(expenseData, groupId)
        await this.validateMembersInGroup(groupId, expensePayload.expenseMembers)

        expensePayload.expenseCurrency = group.groupCurrency
        expensePayload.expensePerMember = roundTo2(
            expensePayload.expenseAmount / expensePayload.expenseMembers.length
        )

        const newExpense = await expenseModel.create(expensePayload)

        await GroupService.addSplit(
            groupId,
            expensePayload.expenseAmount,
            expensePayload.expenseOwner,
            expensePayload.expenseMembers
        )

        return {
            expenseId: newExpense._id,
            ...expensePayload
        }
    }

    /**
     * Update an existing expense
     */
    static async updateExpense(expenseId, expenseData) {
        validator.notNull(expenseId)

        const oldExpense = await expenseModel.findOne({ _id: expenseId })
        if (!oldExpense) {
            throw createHttpError(400, 'Invalid Expense Id')
        }

        const groupId = expenseData.groupId || oldExpense.groupId
        const group = await this.loadGroup(groupId)

        const expensePayload = this.buildExpensePayload(expenseData, groupId)
        await this.validateMembersInGroup(groupId, expensePayload.expenseMembers)

        expensePayload.expenseCurrency = group.groupCurrency
        expensePayload.expensePerMember = roundTo2(
            expensePayload.expenseAmount / expensePayload.expenseMembers.length
        )

        const updatedExpense = await expenseModel.findOneAndUpdate(
            { _id: expenseId },
            { $set: expensePayload },
            { new: true, runValidators: true }
        )

        // Update splits: remove old split, add new split
        await GroupService.clearSplit(
            oldExpense.groupId,
            oldExpense.expenseAmount,
            oldExpense.expenseOwner,
            oldExpense.expenseMembers
        )

        await GroupService.addSplit(
            expensePayload.groupId,
            expensePayload.expenseAmount,
            expensePayload.expenseOwner,
            expensePayload.expenseMembers
        )

        return updatedExpense
    }

    /**
     * Delete an expense
     */
    static async deleteExpense(expenseId) {
        validator.notNull(expenseId)

        const expense = await expenseModel.findOne({ _id: expenseId })
        if (!expense) {
            throw createHttpError(400, 'Invalid Expense Id')
        }

        const deleteResult = await expenseModel.deleteOne({ _id: expenseId })

        await GroupService.clearSplit(
            expense.groupId,
            expense.expenseAmount,
            expense.expenseOwner,
            expense.expenseMembers
        )

        return deleteResult
    }

    /**
     * Get a single expense by ID
     */
    static async getExpenseById(expenseId) {
        validator.notNull(expenseId)

        const expense = await expenseModel.findOne({ _id: expenseId })
        if (!expense) {
            throw createHttpError(404, 'No expense present for the Id')
        }

        return expense
    }

    /**
     * Get all expenses for a group
     */
    static async getGroupExpenses(groupId) {
        validator.notNull(groupId)

        const groupExpenses = await expenseModel.find({ groupId }).sort({ expenseDate: -1 })
        const totalAmount = groupExpenses.reduce((acc, expense) => acc + expense.expenseAmount, 0)

        return {
            expenses: groupExpenses,
            total: roundTo2(totalAmount)
        }
    }

    /**
     * Get all expenses for a user
     */
    static async getUserExpenses(userId, authenticatedUser) {
        const user = await this.validateRequestedUser(authenticatedUser, userId)

        const userExpenses = await expenseModel.find({ expenseMembers: user }).sort({ expenseDate: -1 })
        const totalAmount = userExpenses.reduce((acc, expense) => acc + expense.expensePerMember, 0)

        return {
            expenses: userExpenses,
            total: roundTo2(totalAmount)
        }
    }

    /**
     * Get recent expenses for a user (limited to 5)
     */
    static async getRecentUserExpenses(userId, authenticatedUser) {
        const user = await this.validateRequestedUser(authenticatedUser, userId)

        const recentExpenses = await expenseModel
            .find({ expenseMembers: user })
            .sort({ expenseDate: -1 })
            .limit(5)

        return recentExpenses
    }

    /**
     * Get expenses grouped by category with currency
     */
    static async getGroupCategoryExpenses(groupId) {
        validator.notNull(groupId)

        const categoryExpenses = await expenseModel.aggregate([
            {
                $match: { groupId }
            },
            {
                $group: {
                    _id: {
                        category: '$expenseCategory',
                        currency: '$expenseCurrency'
                    },
                    amount: { $sum: '$expenseAmount' }
                }
            },
            { $sort: { '_id.category': 1, '_id.currency': 1 } }
        ])

        return categoryExpenses.map((entry) => ({
            category: entry._id.category,
            currency: entry._id.currency,
            amount: roundTo2(entry.amount)
        }))
    }

    /**
     * Get expenses grouped by month with currency
     */
    static async getGroupMonthlyExpenses(groupId) {
        validator.notNull(groupId)

        const monthlyExpenses = await expenseModel.aggregate([
            {
                $match: { groupId }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$expenseDate' },
                        year: { $year: '$expenseDate' },
                        currency: '$expenseCurrency'
                    },
                    amount: { $sum: '$expenseAmount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.currency': 1 } }
        ])

        return monthlyExpenses.map((entry) => ({
            month: entry._id.month,
            year: entry._id.year,
            currency: entry._id.currency,
            amount: roundTo2(entry.amount)
        }))
    }

    /**
     * Get expenses grouped by day for the last month
     */
    static async getGroupDailyExpenses(groupId) {
        validator.notNull(groupId)

        const dailyExpenses = await expenseModel.aggregate([
            {
                $match: {
                    groupId,
                    expenseDate: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                        $lte: new Date()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dayOfMonth: '$expenseDate' },
                        month: { $month: '$expenseDate' },
                        year: { $year: '$expenseDate' }
                    },
                    amount: { $sum: '$expenseAmount' }
                }
            },
            { $sort: { '_id.month': 1, '_id.date': 1 } }
        ])

        return dailyExpenses
    }

    /**
     * Get user expenses grouped by category with currency
     */
    static async getUserCategoryExpenses(userId, authenticatedUser) {
        const user = await this.validateRequestedUser(authenticatedUser, userId)

        const categoryExpenses = await expenseModel.aggregate([
            {
                $match: { expenseMembers: user }
            },
            {
                $group: {
                    _id: {
                        category: '$expenseCategory',
                        currency: '$expenseCurrency'
                    },
                    amount: { $sum: '$expensePerMember' }
                }
            },
            { $sort: { '_id.category': 1, '_id.currency': 1 } }
        ])

        return categoryExpenses.map((entry) => ({
            category: entry._id.category,
            currency: entry._id.currency,
            amount: roundTo2(entry.amount)
        }))
    }

    /**
     * Get user expenses grouped by month with currency
     */
    static async getUserMonthlyExpenses(userId, authenticatedUser) {
        const user = await this.validateRequestedUser(authenticatedUser, userId)

        const monthlyExpenses = await expenseModel.aggregate([
            {
                $match: { expenseMembers: user }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$expenseDate' },
                        year: { $year: '$expenseDate' },
                        currency: '$expenseCurrency'
                    },
                    amount: { $sum: '$expensePerMember' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.currency': 1 } }
        ])

        return monthlyExpenses.map((entry) => ({
            month: entry._id.month,
            year: entry._id.year,
            currency: entry._id.currency,
            amount: roundTo2(entry.amount)
        }))
    }

    /**
     * Get user expenses grouped by day for the last month
     */
    static async getUserDailyExpenses(userId, authenticatedUser) {
        const user = await this.validateRequestedUser(authenticatedUser, userId)

        const dailyExpenses = await expenseModel.aggregate([
            {
                $match: {
                    expenseMembers: user,
                    expenseDate: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                        $lte: new Date()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dayOfMonth: '$expenseDate' },
                        month: { $month: '$expenseDate' },
                        year: { $year: '$expenseDate' }
                    },
                    amount: { $sum: '$expensePerMember' }
                }
            },
            { $sort: { '_id.month': 1, '_id.date': 1 } }
        ])

        return dailyExpenses
    }

    /**
     * Get merged transactions for a user (expenses + settlements)
     */
    static async getUserTransactions(userId, authenticatedUser) {
        const user = await this.validateRequestedUser(authenticatedUser, userId)

        const [expenses, settlements] = await Promise.all([
            expenseModel.find({ expenseMembers: user }).sort({ expenseDate: -1 }),
            settlementModel.find({
                $or: [{ settleFrom: user }, { settleTo: user }]
            }).sort({ settleDate: -1 })
        ])

        const groupIds = [...new Set([
            ...expenses.map((expense) => expense.groupId),
            ...settlements.map((settlement) => settlement.groupId)
        ].filter(Boolean))]

        const groupsById = await this.buildGroupLookup(groupIds)

        const expenseTransactions = expenses.map((expense) => {
            const group = groupsById.get(String(expense.groupId))
            const isOwner = expense.expenseOwner === user

            return {
                _id: expense._id,
                transactionType: 'expense',
                transactionDate: expense.expenseDate,
                groupId: expense.groupId,
                groupName: group?.groupName || 'Deleted Group',
                currency: expense.expenseCurrency || group?.groupCurrency || 'INR',
                title: expense.expenseName,
                subtitle: isOwner ? 'You paid this expense' : `Added by ${expense.expenseOwner}`,
                amount: isOwner ? expense.expenseAmount : expense.expensePerMember,
                totalAmount: expense.expenseAmount,
                yourShare: expense.expensePerMember,
                category: expense.expenseCategory,
                direction: isOwner ? 'paid' : 'share'
            }
        })

        const settlementTransactions = settlements.map((settlement) => {
            const group = groupsById.get(String(settlement.groupId))
            const isOutgoing = settlement.settleFrom === user
            const counterparty = isOutgoing ? settlement.settleTo : settlement.settleFrom

            return {
                _id: settlement._id,
                transactionType: 'settlement',
                transactionDate: settlement.settleDate,
                groupId: settlement.groupId,
                groupName: group?.groupName || 'Deleted Group',
                currency: settlement.settlementCurrency || group?.groupCurrency || 'INR',
                title: isOutgoing ? 'Settlement Paid' : 'Settlement Received',
                subtitle: isOutgoing ? `You paid ${counterparty}` : `${counterparty} paid you`,
                amount: settlement.settleAmount,
                direction: isOutgoing ? 'outgoing' : 'incoming'
            }
        })

        const transactions = [...expenseTransactions, ...settlementTransactions].sort(
            (left, right) => new Date(right.transactionDate) - new Date(left.transactionDate)
        )

        return transactions
    }
}

module.exports = ExpenseService
