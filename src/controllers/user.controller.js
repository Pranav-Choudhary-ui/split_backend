const UserService = require('../services/user.service')
const { sendSuccess, sendError } = require('../utils/apiResponse')

const getUserId = (req) => req.params.userId
const getMemberId = (req) => req.params.memberId

exports.userRegister = async (req, res) => {
    try {
        const result = await UserService.registerUser(req.body)

        return sendSuccess(res, {
            status: 201,
            message: 'User Registration Success',
            userId: result.userId,
            memberId: result.memberId
            // ,accessToken: result.accessToken
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.userLogin = async (req, res) => {
    try {
        const result = await UserService.authenticateUser(req.body.emailId, req.body.password)

    //     res.cookie("accessToken", result.accessToken, {
    //     httpOnly: true,
    //     secure: true,
    //     sameSite: "Strict",
    //     maxAge: 24 * 60 * 60 * 1000
    // })

        return sendSuccess(res, {
            message: 'User Login Success',
            userId: result.userId,
            memberId: result.memberId,
            emailId: result.emailId,
            firstName: result.firstName,
            lastName: result.lastName,
            accessToken: result.accessToken
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.viewUser = async (req, res) => {
    try {
        const userId = getUserId(req)
        const user = await UserService.getUserById(userId, req.user)

        return sendSuccess(res, {
            user
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.viewUserByMemberId = async (req, res) => {
    try {
        const memberId = getMemberId(req)
        const user = await UserService.getUserByMemberId(memberId)

        return sendSuccess(res, {
            user
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

// exports.emailList = async (req, res) => {
//     try {
//         const emailList = await UserService.getAllUserEmails()

//         return sendSuccess(res, {
//             user: emailList
//         })
//     } catch (err) {
//         return sendError(req, res, err)
//     }
// }

exports.deleteUser = async (req, res) => {
    try {
        const userId = getUserId(req)
        const response = await UserService.deleteUser(userId, req.user)

        return sendSuccess(res, {
            message: 'User Account deleted!',
            response
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.editUser = async (req, res) => {
    try {
        const userId = getUserId(req)
        const updateResponse = await UserService.updateUserProfile(
            userId,
            req.body.firstName,
            req.body.lastName,
            req.user
        )

        return sendSuccess(res, {
            message: 'User update Success',
            userId: updateResponse
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}

exports.updatePassword = async (req, res) => {
    try {
        const userId = getUserId(req)
        const updateResponse = await UserService.updateUserPassword(
            userId,
            req.body.oldPassword,
            req.body.newPassword,
            req.user
        )

        return sendSuccess(res, {
            message: 'Password update Success',
            userId: updateResponse
        })
    } catch (err) {
        return sendError(req, res, err)
    }
}
