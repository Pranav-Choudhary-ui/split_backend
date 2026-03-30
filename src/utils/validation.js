const userModel = require('../model/user.model')
const groupModel = require('../model/group.model')
const logger = require('./logger')

const throwValidationError = (message, status = 400) => {
    var err = new Error(message)
    err.status = status
    throw err
}

exports.notNull = (value) => {
    if (value)
        return true
    else {
        throwValidationError("Please input the required field")
    }
}

// exports.notNull = (value) => {
//     if (value !== null && value !== undefined) {
//         return true;
//     }
//     throwValidationError("Value is required");
// }

exports.emailValidation = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && emailRegex.test(email))
        return true
    else {
        throwValidationError("Email validation fail!!")
    }
}

// exports.emailValidation = (email) => {
//     if (typeof email !== "string" || email.trim() === "") {
//         throwValidationError("Email is required");
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

//     if (!emailRegex.test(email.trim())) {
//         throwValidationError("Invalid email format");
//     }
// }

exports.passwordValidation = (pass) => {
    // const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{10,}$/;
    // if (strongRegex.test(pass)) {
    //     return true
    // }
    if (pass && pass.length >= 8) {
        return true
    }
    throwValidationError("Password validation fail!!")
}

exports.currencyValidation = (currency) => {
    if (currency && (
        currency == "INR" ||
        currency == "USD" ||
        currency == "EUR")) {
        return true
    } else {
        throwValidationError("Currency validation fail!!")

    }
}

exports.positiveNumberValidation = (value, fieldName = 'value') => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return true
    }

    throwValidationError(`${fieldName} should be a positive number`)
}

exports.nonEmptyUniqueStringArray = (value, fieldName = 'value') => {
    if (!Array.isArray(value)) {
        throwValidationError(`${fieldName} should be an array`)
    }

    if (value.length === 0) {
        throwValidationError(`${fieldName} should contain at least one value`)
    }

    if (value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
        throwValidationError(`${fieldName} should contain valid string values`)
    }

    if (new Set(value).size !== value.length) {
        throwValidationError(`Duplicate values are not allowed in ${fieldName}`)
    }

    return true
}

// exports.nonEmptyUniqueStringArray = (value, fieldName = 'value') => {
//     if (!Array.isArray(value)) {
//         throwValidationError(`${fieldName} should be an array`)
//     }

//     if (value.length === 0) {
//         throwValidationError(`${fieldName} should contain at least one value`)
//     }

//     const normalized = value.map((item) => {
//         if (typeof item !== 'string') {
//             throwValidationError(`${fieldName} should contain valid string values`)
//         }

//         const trimmed = item.trim()
//         if (trimmed.length === 0) {
//             throwValidationError(`${fieldName} should contain non-empty strings`)
//         }

//         return trimmed.toLowerCase()
//     })

//     if (new Set(normalized).size !== normalized.length) {
//         throwValidationError(`Duplicate values are not allowed in ${fieldName}`)
//     }
// }

exports.ownerInMembersValidation = (owner, members) => {
    if (!Array.isArray(members) || !members.includes(owner)) {
        throwValidationError("Expense owner should be present in expense members")
    }
    return true
}

exports.userValidation = async (email) => {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email
    var user = await userModel.findOne({
        emailId: normalizedEmail
    })
    if (!user)
        return false
    else
        return true
}

exports.groupUserValidation = async (email, groupId) => {
    var groupMembers = await groupModel.findOne({
        _id: groupId
    }, {
        groupMembers: 1,
        _id: 0
    })

    if (!groupMembers) {
        logger.warn([`Group User Valdation fail : Group ID : [${groupId}] | group not found`])
        return false
    }

    groupMembers = groupMembers['groupMembers']
    if (groupMembers.includes(email))
        return true
    else {
        logger.warn([`Group User Valdation fail : Group ID : [${groupId}] | user : [${email}]`])
        return false
    }
}

// exports.groupUserValidation = async (email, groupId) => {
//     if (!isValidObjectId(groupId)) {
//         logger.warn(`Invalid groupId: ${groupId}`)
//         return false
//     }

//     const normalizedEmail = email.trim().toLowerCase()

//     const exists = await groupModel.exists({
//         _id: groupId,
//         groupMembers: normalizedEmail
//     })

//     if (!exists) {
//         logger.warn(`Validation failed: groupId [${groupId}], user [${normalizedEmail}]`)
//         return false
//     }

//     return true
// }