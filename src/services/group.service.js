const userModel = require('../model/user.model')
const groupModel = require('../model/group.model')
const settlementModel = require('../model/settlement.model')
const { isValidObjectId } = require('mongoose')
const validator = require('../utils/validation')
const apiAuth = require('../utils/apiAuthentication')
const splitCalculator = require('../utils/split')
const { createHttpError } = require('../utils/apiResponse')

const roundTo2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

class GroupService {
    /**
     * Normalize group members (trim and prepare for processing)
     */
    static normalizeMembers(members) {
        return members.map((member) => member.trim())
    }

    /**
     * Resolve user identifier (Mongo userId or email) to email
     */
    static async resolveUserEmail(userIdentifier) {
        validator.notNull(userIdentifier)

        const normalizedIdentifier = typeof userIdentifier === 'string'
            ? userIdentifier.trim()
            : userIdentifier

        if (isValidObjectId(normalizedIdentifier)) {
            const user = await userModel.findById(normalizedIdentifier, { emailId: 1 })
            if (!user) {
                throw createHttpError(404, 'User Id not found!')
            }

            return user.emailId
        }

        return typeof normalizedIdentifier === 'string'
            ? normalizedIdentifier.toLowerCase()
            : normalizedIdentifier
    }

    /**
     * Validate that all group members exist in database
     */
    static async validateGroupMembers(groupMembers) {
        for (const user of groupMembers) {
            const memberCheck = await validator.userValidation(user)
            if (!memberCheck) {
                throw createHttpError(400, `Invalid member id: ${user}`)
            }
        }
    }

    /**
     * Build and validate group creation payload
     */
    static async buildGroupPayload(body) {
        validator.notNull(body.groupName)
        validator.notNull(body.groupOwner)
        validator.notNull(body.groupMembers)
        validator.currencyValidation(body.groupCurrency || 'INR')

        validator.nonEmptyUniqueStringArray(body.groupMembers, 'groupMembers')
        const groupMembers = this.normalizeMembers(body.groupMembers)
        validator.nonEmptyUniqueStringArray(groupMembers, 'groupMembers')

        const groupOwner = body.groupOwner.trim()
        if (!groupMembers.includes(groupOwner)) {
            throw createHttpError(400, 'groupOwner should be present in groupMembers')
        }

        await this.validateGroupMembers(groupMembers)

        const ownerCheck = await validator.userValidation(groupOwner)
        if (!ownerCheck) {
            throw createHttpError(400, 'Invalid owner id')
        }

        return {
            groupName: body.groupName.trim(),
            groupDescription: body.groupDescription?.trim(),
            groupCurrency: body.groupCurrency || 'INR',
            groupOwner,
            groupMembers,
            groupCategory: body.groupCategory,
            groupTotal: body.groupTotal || 0
        }
    }

    /**
     * Create a new group
     */
    static async createGroup(groupData) {
        const payload = await this.buildGroupPayload(groupData)

        const splitJson = {}
        for (const user of payload.groupMembers) {
            splitJson[user] = 0
        }

        const newGroup = new groupModel({
            ...payload,
            split: [splitJson]
        })

        const group = await groupModel.create(newGroup)

        return {
            id: group._id,
            ...payload
        }
    }

    /**
     * Get group by ID
     */
    static async getGroupById(groupId) {
        validator.notNull(groupId)

        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        return group
    }

    /**
     * Find all groups for a user
     */
    static async getUserGroups(userIdentifier, authenticatedUser) {
        const emailId = await this.resolveUserEmail(userIdentifier)
        apiAuth.validateUser(authenticatedUser, emailId)

        const user = await userModel.findOne({ emailId })
        if (!user) {
            throw createHttpError(404, 'User Id not found!')
        }

        const groups = await groupModel.find({ groupMembers: emailId }).sort({ _id: -1 })
        return groups
    }

    /**
     * Update a group
     */
    static async updateGroup(groupId, groupData) {
        validator.notNull(groupId)

        const existingGroup = await groupModel.findOne({ _id: groupId })
        if (!existingGroup) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        const payload = await this.buildGroupPayload(groupData)

        const currentSplit = existingGroup.split?.[0] || {}
        const nextSplit = { ...currentSplit }

        for (const user of payload.groupMembers) {
            if (typeof nextSplit[user] !== 'number') {
                nextSplit[user] = 0
            }
        }

        const updateResponse = await groupModel.updateOne(
            { _id: groupId },
            {
                $set: {
                    groupName: payload.groupName,
                    groupDescription: payload.groupDescription,
                    groupCurrency: payload.groupCurrency,
                    groupMembers: payload.groupMembers,
                    groupOwner: payload.groupOwner,
                    groupCategory: payload.groupCategory,
                    split: [nextSplit]
                }
            }
        )

        return updateResponse
    }

    /**
     * Delete a group
     */
    static async deleteGroup(groupId) {
        validator.notNull(groupId)

        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        const deleteResponse = await groupModel.deleteOne({ _id: groupId })
        return deleteResponse
    }

    /**
     * Record a settlement between two group members
     */
    static async recordSettlement(groupId, settleTo, settleFrom, settleAmount, settleDate) {
        validator.notNull(groupId)
        validator.notNull(settleTo)
        validator.notNull(settleFrom)
        validator.notNull(settleAmount)

        const amount = Number(settleAmount)
        validator.positiveNumberValidation(amount, 'settleAmount')

        if (settleTo === settleFrom) {
            throw createHttpError(400, 'settleTo and settleFrom should be different users')
        }

        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        const settleToValid = await validator.groupUserValidation(settleTo, groupId)
        const settleFromValid = await validator.groupUserValidation(settleFrom, groupId)
        if (!settleToValid || !settleFromValid) {
            throw createHttpError(400, 'Settlement users should be part of the group')
        }

        const split = group.split?.[0] || {}
        if (typeof split[settleFrom] !== 'number') {
            split[settleFrom] = 0
        }
        if (typeof split[settleTo] !== 'number') {
            split[settleTo] = 0
        }

        split[settleFrom] = roundTo2(split[settleFrom] + amount)
        split[settleTo] = roundTo2(split[settleTo] - amount)

        const settlementPayload = {
            groupId,
            settleTo,
            settleFrom,
            settleAmount: amount,
            settleDate: settleDate ? new Date(settleDate) : new Date(),
            settlementCurrency: group.groupCurrency
        }

        if (Number.isNaN(settlementPayload.settleDate.getTime())) {
            throw createHttpError(400, 'settleDate is invalid')
        }

        const settlement = await settlementModel.create(settlementPayload)
        const updateResponse = await groupModel.updateOne(
            { _id: group._id },
            { $set: { split: [split] } }
        )

        return {
            settlementId: settlement._id,
            updateResponse
        }
    }

    /**
     * Add expense split to group (internal use)
     */
    static async addSplit(groupId, expenseAmount, expenseOwner, expenseMembers) {
        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        const normalizedAmount = Number(expenseAmount)
        validator.positiveNumberValidation(normalizedAmount, 'expenseAmount')
        validator.nonEmptyUniqueStringArray(expenseMembers, 'expenseMembers')
        validator.ownerInMembersValidation(expenseOwner, expenseMembers)

        const split = group.split?.[0] || {}

        if (typeof split[expenseOwner] !== 'number') {
            split[expenseOwner] = 0
        }

        for (const user of expenseMembers) {
            if (typeof split[user] !== 'number') {
                split[user] = 0
            }
        }

        group.groupTotal = roundTo2(group.groupTotal + normalizedAmount)
        split[expenseOwner] = roundTo2(split[expenseOwner] + normalizedAmount)

        const expensePerPerson = roundTo2(normalizedAmount / expenseMembers.length)
        for (const user of expenseMembers) {
            split[user] = roundTo2(split[user] - expensePerPerson)
        }

        let balance = 0
        for (const value of Object.values(split)) {
            balance += value
        }

        split[expenseOwner] = roundTo2(split[expenseOwner] - balance)

        return await groupModel.updateOne(
            { _id: groupId },
            {
                $set: {
                    groupTotal: group.groupTotal,
                    split: [split]
                }
            }
        )
    }

    /**
     * Remove expense split from group (internal use)
     */
    static async clearSplit(groupId, expenseAmount, expenseOwner, expenseMembers) {
        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        const normalizedAmount = Number(expenseAmount)
        validator.positiveNumberValidation(normalizedAmount, 'expenseAmount')
        validator.nonEmptyUniqueStringArray(expenseMembers, 'expenseMembers')
        validator.ownerInMembersValidation(expenseOwner, expenseMembers)

        const split = group.split?.[0] || {}

        if (typeof split[expenseOwner] !== 'number') {
            split[expenseOwner] = 0
        }

        for (const user of expenseMembers) {
            if (typeof split[user] !== 'number') {
                split[user] = 0
            }
        }

        group.groupTotal = roundTo2(group.groupTotal - normalizedAmount)
        if (group.groupTotal < 0) {
            group.groupTotal = 0
        }

        split[expenseOwner] = roundTo2(split[expenseOwner] - normalizedAmount)

        const expensePerPerson = roundTo2(normalizedAmount / expenseMembers.length)
        for (const user of expenseMembers) {
            split[user] = roundTo2(split[user] + expensePerPerson)
        }

        let balance = 0
        for (const value of Object.values(split)) {
            balance += value
        }

        split[expenseOwner] = roundTo2(split[expenseOwner] - balance)

        return await groupModel.updateOne(
            { _id: groupId },
            {
                $set: {
                    groupTotal: group.groupTotal,
                    split: [split]
                }
            }
        )
    }

    /**
     * Get group balance sheet with settlements
     */
    static async getGroupBalanceSheet(groupId) {
        validator.notNull(groupId)

        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        return splitCalculator(group.split?.[0] || {})
    }

    /**
     * Add group to user's favorites
     */
    static async addToFavorites(groupId, emailId, authenticatedUser) {
        validator.notNull(groupId)
        validator.notNull(emailId)
        apiAuth.validateUser(authenticatedUser, emailId)

        const user = await userModel.findOne({ emailId })
        if (!user) {
            throw createHttpError(404, 'User not present in the database')
        }

        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        const userUpdate = await userModel.updateOne(
            { emailId },
            { $addToSet: { favGroup: groupId } }
        )

        return userUpdate
    }

    /**
     * Remove group from user's favorites
     */
    static async removeFromFavorites(groupId, emailId, authenticatedUser) {
        validator.notNull(groupId)
        validator.notNull(emailId)
        apiAuth.validateUser(authenticatedUser, emailId)

        const user = await userModel.findOne({ emailId })
        if (!user) {
            throw createHttpError(404, 'User not present in the database')
        }

        const group = await groupModel.findOne({ _id: groupId })
        if (!group) {
            throw createHttpError(404, 'Invalid Group Id')
        }

        const userUpdate = await userModel.updateOne(
            { emailId },
            { $pull: { favGroup: groupId } }
        )

        return userUpdate
    }
}

module.exports = GroupService
