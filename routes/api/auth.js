const express = require('express')
const router = express.Router()
const authController = require('../../controllers/authController')
const authentication = require('../../middleware/authentication');
const authMiddleware = require('../../middleware/auth')
const bookController = require('../../controllers/bookController');
const { upload } = require('../../controllers/bookController');

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/google', authController.google)
router.post('/logout', authController.logout)
router.post('/refresh', authController.refresh)
router.get('/user', authentication, authMiddleware, authController.user)

router.post('/addPurchase', bookController.addPurchase)
router.get('/getPurchases', authentication, bookController.getPurchases)
router.put('/updateBookQuantity', bookController.updateBookQuantity);
router.post('/addBook', authentication, upload.single('icon'), bookController.addBook);
router.put('/updateBook', bookController.updateBook);
router.delete('/deleteBook', bookController.deleteBook);
router.get('/getBooks', authentication, bookController.getBooks);
router.get('/getAllBooks', bookController.getAllBooks);
router.get('/getBookById/:_id', bookController.getBookById);
router.get('/states', bookController.getStates);
router.get('/getCitiesByStateId/:stateId', bookController.getCitiesByStateId);

module.exports = router