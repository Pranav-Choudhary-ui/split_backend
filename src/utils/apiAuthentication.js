var jwt = require('jsonwebtoken')
var logger = require('./logger')

exports.generateAccessToken = (user) => {
    return jwt.sign({ emailId: user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' })
}


exports.validateToken = (req, res, next) => {
    // CORS preflight requests do not include Authorization headers.
    // Let them pass so the actual authenticated request can follow.
    // if (req.method === 'OPTIONS') {
    //     return next()
    // }

    //Bypass Authentication when DISABLE_API_AUTH is set in the env file for dev purpose only 
    if (process.env.DISABLE_API_AUTH == "true") {
        next()
    } else {
        //Checking if authorization is present in the header if not present then access is forbidden 
        if (req.headers["authorization"] == null) {
            logger.error(`URL : ${req.originalUrl} | API Authentication Fail | message: Token not present`)
            res.status(403).json({
                message: "Token not present"
            })
            return
        } else {
            //getting token from request header 
            const authHeader = req.headers["authorization"]
            //the request header contains the token "Bearer <token>", split the string and use the second value in the split array.
            const token = authHeader.split(" ")[1]


            //function to verify the token 
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
                if (err) {
                    logger.error(`URL : ${req.originalUrl} | API Authentication Fail | message: Invalid Token`)
                    // Issue: sendStatus(403) sends response AND sets status, then .json() fails because response is already sent
                    // res.sendStatus(403).json({
                    //     message: "Invalid Token"
                    // })
                    // res.end();
                    res.status(403).json({
                        message: "Invalid Token"
                    })
                } else {
                    //Adding user data to the req — now user is { emailId: '...' } object from jwt.sign
                    req.user = user.emailId
                    //proceed to the next action in the calling function 
                    next()
                }
            })
            
        }
    }
}

//Validation function to check if the user is same as the token user 
exports.validateUser = (user, emailId) => {
    if (process.env.DISABLE_API_AUTH != "true" &&
        user != emailId
    ) {
        var err = new Error("Access Denied")
        err.status = 403
        throw err
    } else
        return true
}