const express = require('express');
const controller = require('../controllers/group.controller')

const router = express.Router();

router.post('/', controller.createGroup)
router.get('/user/:userId', controller.findUserGroup)
router.get('/:groupId', controller.viewGroup)
router.put('/:groupId', controller.editGroup)
router.delete('/:groupId', controller.deleteGroup)

router.post('/:groupId/favourite', controller.makeFavourite)
router.delete('/:groupId/favourite', controller.removeFavourite)

router.get('/:groupId/settlement', controller.groupBalanceSheet)
router.post('/:groupId/settlement', controller.makeSettlement)

module.exports = router;