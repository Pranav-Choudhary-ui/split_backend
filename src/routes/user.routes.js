const express = require('express');
const userController = require('../controllers/user.controller')
const apiAuth = require('../utils/apiAuthentication')

const router = express.Router();

router.post('/register', userController.userRegister)
router.post('/login', userController.userLogin)

// router.get('/emails', apiAuth.validateToken, userController.emailList)
router.get('/member/:memberId', apiAuth.validateToken, userController.viewUserByMemberId)

router.get('/:userId', apiAuth.validateToken, userController.viewUser)
router.put('/:userId', apiAuth.validateToken, userController.editUser)
router.delete('/:userId', apiAuth.validateToken, userController.deleteUser)
router.patch('/:userId/password', apiAuth.validateToken, userController.updatePassword)

module.exports = router;