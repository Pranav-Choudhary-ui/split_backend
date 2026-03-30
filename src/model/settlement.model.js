var mongoose = require('mongoose')

const Settlement = new mongoose.Schema({
    groupId: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    settleTo: {
        type: String,
        required: true
    },
    settleFrom: {
        type: String,
        required: true
    },
    settleDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    settleAmount: {
        type: Number,
        min: 0.01,
        required: true
    },
    settlementCurrency: {
        type: String,
        enum: ["INR", "USD", "EUR"],
        default: "INR"
    }
})

Settlement.index({ groupId: 1, settleDate: -1 })

module.exports = mongoose.model('Settlement', Settlement)