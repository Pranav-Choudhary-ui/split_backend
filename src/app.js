// require('dotenv').config()
const express = require('express')
const cors = require('cors')
// const path = require('path')

// const logger = require('../helper/logger')
const requestLogger = require('./utils/requestLogger')
const apiAuth = require('./utils/apiAuthentication')

const usersRouter = require('./routes/user.routes')
const groupRouter = require('./routes/group.routes')
const expenseRouter = require('./routes/expense.routes')

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
  })
)
app.use(express.json())
app.use(requestLogger)

// Routes remove-> 's
app.use('/api/users', usersRouter)
app.use('/api/groups', apiAuth.validateToken, groupRouter)
app.use('/api/expenses', apiAuth.validateToken, expenseRouter)

// Backward-compatible aliases
// app.use('/api/group', apiAuth.validateToken, groupRouter)
// app.use('/api/expense', apiAuth.validateToken, expenseRouter)

// Production build
// if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
//     app.use(express.static('client/build'))

//     app.get('*', (req, res) => {
//         res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
//     })
// }

// Invalid route handler
// app.all('*', (req, res) => {
//     logger.error(`[Invalid Route] ${req.originalUrl}`)
//     res.status(404).json({
//         status: 'fail',
//         message: 'Invalid path'
//     })
// })

module.exports = app