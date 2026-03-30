const GroupService = require('../services/group.service')
const { sendSuccess, sendError } = require('../utils/apiResponse')

const getGroupId = (req) => req.params.groupId
const getUserId = (req) => req.params.userId

exports.createGroup = async (req, res) => {
    try {
        const group = await GroupService.createGroup(req.body)

        return sendSuccess(res, {
            status: 201,
            message: 'Group Creation Success',
            Id: group.id
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.viewGroup = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const group = await GroupService.getGroupById(groupId)

        return sendSuccess(res, {
            group
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.findUserGroup = async (req, res) => {
    try {
        const userId = getUserId(req)
        const groups = await GroupService.getUserGroups(userId, req.user)

        return sendSuccess(res, {
            groups
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.editGroup = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const response = await GroupService.updateGroup(groupId, req.body)

        return sendSuccess(res, {
            message: 'Group updated successfully!',
            response
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.deleteGroup = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const response = await GroupService.deleteGroup(groupId)

        return sendSuccess(res, {
            message: 'Group deleted successfully!',
            response
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.makeSettlement = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const result = await GroupService.recordSettlement(
            groupId,
            req.body.settleTo,
            req.body.settleFrom,
            req.body.settleAmount,
            req.body.settleDate
        )

        return sendSuccess(res, {
            message: 'Settlement successful!',
            settlementId: result.settlementId,
            update: result.updateResponse
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.groupBalanceSheet = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const balanceSheet = await GroupService.getGroupBalanceSheet(groupId)

        return sendSuccess(res, {
            data: balanceSheet
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.makeFavourite = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const userUpdate = await GroupService.addToFavorites(groupId, req.body.user, req.user)

        return sendSuccess(res, {
            data: userUpdate
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.removeFavourite = async (req, res) => {
    try {
        const groupId = getGroupId(req)
        const userUpdate = await GroupService.removeFromFavorites(groupId, req.body.user, req.user)

        return sendSuccess(res, {
            data: userUpdate
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}
