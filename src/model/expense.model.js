var mongoose = require('mongoose')

const Expense = new mongoose.Schema({
    groupId: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    expenseName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 120
    },
    expenseDescription: {
        type: String,
        trim: true,
        maxlength: 300
    },
    expenseAmount: {
        type: Number,
        required: true,
        min: 0.01
    },
    expenseCategory: {
        type: String,
        enum: [
            "Food & Drink",
            "Shopping",
            "Entertainment",
            "Transport",
            "Rent",
            "Utilities",
            "Health",
            "Education",
            "Others"
        ],
        default: "Others"
    },
    expenseCurrency: {
        type: String,
        enum: ["INR", "USD", "EUR"],
        default: "INR"
    },
    expenseDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    expenseOwner: {
        type: String,
        required: true,
        trim: true,
        // validate: {
        //     validator: function (owner) {
        //         return Array.isArray(this.expenseMembers) && this.expenseMembers.includes(owner)
        //     },
        //     message: "Expense owner must be part of expense members"
        // }
    },
    expenseMembers: {
        type: [String],
        required: true,
        validate: [{
            validator: function (members) {
                return Array.isArray(members) && members.length > 0
            },
            message: "Expense members should be a non-empty array"
        }, {
            validator: function (members) {
                return new Set(members).size === members.length
            },
            message: "Duplicate expense members are not allowed"
        }],
        index: true
    },
    expensePerMember: {
        type: Number,
        required: true,
        min: 0
    },
    expenseType: {
        type: String,
        enum: ["Cash", "Card", "Online"],
        default: "Cash"
    }
})

Expense.index({ groupId: 1, expenseDate: -1 })
Expense.index({ expenseMembers: 1, expenseDate: -1 })

module.exports = mongoose.model('Expense', Expense)