const userModel = require('../model/user.model')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { isValidObjectId } = require('mongoose')
const validator = require('../utils/validation')
const apiAuth = require('../utils/apiAuthentication')
const { createHttpError } = require('../utils/apiResponse')

class UserService {

    // Normalize email to lowercase and trim
    static normalizeEmail(email) {
        return email?.trim().toLowerCase()
    }

    // Normalize member ID to lowercase and trim
    static normalizeMemberId(value) {
        return typeof value === 'string' ? value.trim().toLowerCase() : value
    }

    // Validate and normalize user ID
    static normalizeUserId(userId) {
        const normalizedUserId = typeof userId === 'string' ? userId.trim() : userId
        validator.notNull(normalizedUserId)

        if (!isValidObjectId(normalizedUserId)) {
            throw createHttpError(400, 'Invalid User Id')
        }

        return normalizedUserId
    }

    // Build a random member ID candidate
    static buildMemberIdCandidate() {
        return `se-${crypto.randomBytes(3).toString('hex')}`
    }

    // Generate a unique member ID by checking for collisions
    static async generateUniqueMemberId() {
        let memberId = this.buildMemberIdCandidate()

        while (await userModel.exists({ memberId })) {
            memberId = this.buildMemberIdCandidate()
        }

        return memberId
    }

    // Ensure the user has a member ID, generating and saving one if not present
    // static async ensureMemberId(user) {
    //     if (user.memberId) {
    //         return user.memberId
    //     }

    //     const memberId = await this.generateUniqueMemberId()
    //     await userModel.updateOne({ _id: user._id }, { $set: { memberId } })
    //     user.memberId = memberId
    //     return memberId
    // }


    // Get user by ID and validate that the authenticated user is authorized to access it
    static async getAuthorizedUserById(userId, authenticatedUser) {
        const normalizedUserId = this.normalizeUserId(userId)
        const user = await userModel.findById(normalizedUserId)

        if (!user) {
            throw createHttpError(404, 'User does not exist!')
        }

        apiAuth.validateUser(authenticatedUser, user.emailId)
        return user
    }

    // Register a new user
    static async registerUser(userData) {
        const normalizedEmail = this.normalizeEmail(userData.emailId)
        const existingUser = await userModel.findOne({ emailId: normalizedEmail })

        if (existingUser) {
            throw createHttpError(409, 'Email Id already present please login!')
        }

        validator.emailValidation(normalizedEmail)
        validator.passwordValidation(userData.password)
        validator.notNull(userData.firstName)

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(userData.password, salt)
        // const hashedPassword = await bcrypt.hash(userData.password, 10)
        const memberId = await this.generateUniqueMemberId()
        
        // const accessToken = apiAuth.generateAccessToken(user.emailId)
        // not working due to frontend

        const user = await userModel.create({
            firstName: userData.firstName.trim(),
            lastName: userData.lastName?.trim(),
            emailId: normalizedEmail,
            memberId,
            password: hashedPassword
            // ,accessToken
        })

        return {
            userId: user.id,
            memberId,
            emailId: user.emailId,
            firstName: user.firstName,
            lastName: user.lastName
        }
    }

    // Authenticate user and generate access token
    static async authenticateUser(emailId, password) {
        validator.notNull(emailId)
        validator.notNull(password)

        const normalizedEmail = this.normalizeEmail(emailId)
        const user = await userModel.findOne({ emailId: normalizedEmail })

        if (!user) {
            throw createHttpError(401, 'Invalid email Id or Password!')
        }

        const validCred = await bcrypt.compare(password, user.password)
        if (!validCred) {
            throw createHttpError(401, 'Invalid email Id or Password!')
        }

        // await this.ensureMemberId(user)
        const accessToken = apiAuth.generateAccessToken(user.emailId)

        return {
            userId: user.id,
            memberId: user.memberId,
            emailId: user.emailId,
            firstName: user.firstName,
            lastName: user.lastName,
            accessToken
        }
    }

    // Get user by ID (private - all fields except password)
    static async getUserById(userId, authenticatedUser) {
        const user = await this.getAuthorizedUserById(userId, authenticatedUser)

        // await this.ensureMemberId(user)
        const safeUser = user.toObject()
        delete safeUser.password
        return safeUser
    }

    // Get user by member ID (public - only non-sensitive fields)
    static async getUserByMemberId(memberId) {
        const normalizedMemberId = this.normalizeMemberId(memberId)
        validator.notNull(normalizedMemberId)

        const user = await userModel.findOne(
            { memberId: normalizedMemberId },
            { password: 0, favGroup: 0 }
        )

        if (!user) {
            throw createHttpError(404, 'Member Id not found!')
        }

        return {
            emailId: user.emailId,
            firstName: user.firstName,
            lastName: user.lastName,
            memberId: user.memberId
        }
    }

    // Get list of all user email IDs (for auto-complete, etc.)
    // static async getAllUserEmails() {
    //     const userEmails = await userModel.find({}, { emailId: 1, _id: 0 })
    //     return userEmails.map((email) => email.emailId)
    // }

    // Delete user by ID
    static async deleteUser(userId, authenticatedUser) {
        const user = await this.getAuthorizedUserById(userId, authenticatedUser)

        const deleteResponse = await userModel.deleteOne({ _id: user._id })
        return deleteResponse
    }

    // Update user profile (first name, last name)
    static async updateUserProfile(userId, firstName, lastName, authenticatedUser) {
        const user = await this.getAuthorizedUserById(userId, authenticatedUser)

        validator.notNull(firstName)

        const updateResponse = await userModel.updateOne(
            { _id: user._id },
            {
                $set: {
                    firstName: firstName.trim(),
                    lastName: lastName?.trim()
                }
            }
        )

        return updateResponse
    }

    // Update user password
    static async updateUserPassword(userId, oldPassword, newPassword, authenticatedUser) {
        const user = await this.getAuthorizedUserById(userId, authenticatedUser)

        validator.notNull(oldPassword)
        validator.passwordValidation(newPassword)

        const validCred = await bcrypt.compare(oldPassword, user.password)
        if (!validCred) {
            throw createHttpError(400, 'Old Password does not match')
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        const updateResponse = await userModel.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
        )

        return updateResponse
    }
}

module.exports = UserService


// const userModel = require('../model/user.model')
// const bcrypt = require('bcryptjs')
// const crypto = require('crypto')
// const { isValidObjectId } = require('mongoose')
// const validator = require('../utils/validation')
// const apiAuth = require('../utils/apiAuthentication')
// const { createHttpError } = require('../utils/apiResponse')

// // Normalize email
// const normalizeEmail = (email) => {
//     return email?.trim().toLowerCase()
// }

// // Normalize member ID
// const normalizeMemberId = (value) => {
//     return typeof value === 'string' ? value.trim().toLowerCase() : value
// }

// // Normalize user ID
// const normalizeUserId = (userId) => {
//     const normalizedUserId = typeof userId === 'string' ? userId.trim() : userId
//     validator.notNull(normalizedUserId)

//     if (!isValidObjectId(normalizedUserId)) {
//         throw createHttpError(400, 'Invalid User Id')
//     }

//     return normalizedUserId
// }

// // Build member ID
// const buildMemberIdCandidate = () => {
//     return `se-${crypto.randomBytes(3).toString('hex')}`
// }

// // Generate unique member ID
// const generateUniqueMemberId = async () => {
//     let memberId = buildMemberIdCandidate()

//     while (await userModel.exists({ memberId })) {
//         memberId = buildMemberIdCandidate()
//     }

//     return memberId
// }

// // Ensure member ID
// const ensureMemberId = async (user) => {
//     if (user.memberId) return user.memberId

//     const memberId = await generateUniqueMemberId()
//     await userModel.updateOne({ _id: user._id }, { $set: { memberId } })
//     user.memberId = memberId
//     return memberId
// }

// // Get authorized user
// const getAuthorizedUserById = async (userId, authenticatedUser) => {
//     const normalizedUserId = normalizeUserId(userId)
//     const user = await userModel.findById(normalizedUserId)

//     if (!user) {
//         throw createHttpError(404, 'User does not exist!')
//     }

//     apiAuth.validateUser(authenticatedUser, user.emailId)
//     return user
// }

// // Register user
// const registerUser = async (userData) => {
//     const normalizedEmail = normalizeEmail(userData.emailId)
//     const existingUser = await userModel.findOne({ emailId: normalizedEmail })

//     if (existingUser) {
//         throw createHttpError(409, 'Email Id already present please login!')
//     }

//     validator.emailValidation(normalizedEmail)
//     validator.passwordValidation(userData.password)
//     validator.notNull(userData.firstName)

//     const salt = await bcrypt.genSalt(10)
//     const hashedPassword = await bcrypt.hash(userData.password, salt)
//     const memberId = await generateUniqueMemberId()

//     const user = await userModel.create({
//         firstName: userData.firstName.trim(),
//         lastName: userData.lastName?.trim(),
//         emailId: normalizedEmail,
//         memberId,
//         password: hashedPassword
//     })

//     return {
//         userId: user.id,
//         memberId,
//         emailId: user.emailId,
//         firstName: user.firstName,
//         lastName: user.lastName
//     }
// }

// // Authenticate user
// const authenticateUser = async (emailId, password) => {
//     validator.notNull(emailId)
//     validator.notNull(password)

//     const normalizedEmail = normalizeEmail(emailId)
//     const user = await userModel.findOne({ emailId: normalizedEmail })

//     if (!user) {
//         throw createHttpError(401, 'Invalid email Id or Password!')
//     }

//     const validCred = await bcrypt.compare(password, user.password)
//     if (!validCred) {
//         throw createHttpError(401, 'Invalid email Id or Password!')
//     }

//     await ensureMemberId(user)
//     const accessToken = apiAuth.generateAccessToken(user.emailId)

//     return {
//         userId: user.id,
//         memberId: user.memberId,
//         emailId: user.emailId,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         accessToken
//     }
// }

// // Get user by ID
// const getUserById = async (userId, authenticatedUser) => {
//     const user = await getAuthorizedUserById(userId, authenticatedUser)

//     await ensureMemberId(user)
//     const safeUser = user.toObject()
//     delete safeUser.password
//     return safeUser
// }

// // Get user by member ID
// const getUserByMemberId = async (memberId) => {
//     const normalizedMemberId = normalizeMemberId(memberId)
//     validator.notNull(normalizedMemberId)

//     const user = await userModel.findOne(
//         { memberId: normalizedMemberId },
//         { password: 0, favGroup: 0 }
//     )

//     if (!user) {
//         throw createHttpError(404, 'Member Id not found!')
//     }

//     return {
//         emailId: user.emailId,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         memberId: user.memberId
//     }
// }

// // Delete user
// const deleteUser = async (userId, authenticatedUser) => {
//     const user = await getAuthorizedUserById(userId, authenticatedUser)
//     return await userModel.deleteOne({ _id: user._id })
// }

// // Update profile
// const updateUserProfile = async (userId, firstName, lastName, authenticatedUser) => {
//     const user = await getAuthorizedUserById(userId, authenticatedUser)

//     validator.notNull(firstName)

//     return await userModel.updateOne(
//         { _id: user._id },
//         {
//             $set: {
//                 firstName: firstName.trim(),
//                 lastName: lastName?.trim()
//             }
//         }
//     )
// }

// // Update password
// const updateUserPassword = async (userId, oldPassword, newPassword, authenticatedUser) => {
//     const user = await getAuthorizedUserById(userId, authenticatedUser)

//     validator.notNull(oldPassword)
//     validator.passwordValidation(newPassword)

//     const validCred = await bcrypt.compare(oldPassword, user.password)
//     if (!validCred) {
//         throw createHttpError(400, 'Old Password does not match')
//     }

//     const salt = await bcrypt.genSalt(10)
//     const hashedPassword = await bcrypt.hash(newPassword, salt)

//     return await userModel.updateOne(
//         { _id: user._id },
//         { $set: { password: hashedPassword } }
//     )
// }

// module.exports = {
//     normalizeEmail,
//     normalizeMemberId,
//     normalizeUserId,
//     buildMemberIdCandidate,
//     generateUniqueMemberId,
//     ensureMemberId,
//     getAuthorizedUserById,
//     registerUser,
//     authenticateUser,
//     getUserById,
//     getUserByMemberId,
//     deleteUser,
//     updateUserProfile,
//     updateUserPassword
// }