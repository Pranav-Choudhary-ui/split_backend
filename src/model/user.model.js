var mongoose = require('mongoose')

const User = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 60
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: 60
    },
    emailId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    memberId: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    favGroup: {
        type: [String],
        default: []
        // ,validate: {
        //     validator: function (groups) {
        //         return new Set(groups).size === groups.length
        //     },
        //     message: "Duplicate favourites are not allowed"
        // }
    }
}, { timestamps: true })

module.exports = mongoose.model('User', User)

// User.find({ emailId, memberId }) best for indexing