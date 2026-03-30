var mongoose = require('mongoose')

const Group = new mongoose.Schema({
    groupName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 1,
        maxlength: 120
    },
    groupDescription: {
        type: String,
        trim: true,
        maxlength: 300
    },
    groupCurrency: {
        type: String,
        enum: ["INR", "USD", "EUR"],
        default: "INR"
    },
    groupOwner: {
        type: String,
        required: true,
        trim: true
    },
    groupMembers: {
        type: [String],
        required: true
        // ,validate: [{
        //     validator: function (members) {
        //         return Array.isArray(members) && members.length > 0
        //     },
        //     message: "Group members should be a non-empty array"
        // }, {
        //     validator: function (members) {
        //         return new Set(members).size === members.length
        //     },
        //     message: "Duplicate group members are not allowed"
        // }]
    },
    groupCategory: {
        type: String,
        enum: ["Home", "Trip", "Office", "Sports", "Others"],
        default: "Others"
    },
    groupTotal: {
        type: Number,
        min: 0,
        default: 0
    },
    split: {
        type: [mongoose.Schema.Types.Mixed],
        default: [{}]
    },
})

module.exports = mongoose.model('Group', Group)