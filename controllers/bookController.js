const Book = require('../models/Book');
const State = require('../models/State');
const City = require('../models/City');
const Purchase = require('../models/Purchase');
const User = require('../models/User');
const authenticate = require('../middleware/authentication');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');

const uploadDir = path.join(__dirname, '..', 'images', 'booksicon');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'images', 'booksicon');
        if (!fs.existsSync(dir)) {
            console.log('Creating directory:', dir);
            fs.mkdirSync(dir, { recursive: true });
        }
        console.log('File will be uploaded to:', dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const filename = `${Date.now()}-${file.originalname}`;
        console.log('Generated filename:', filename);
        cb(null, filename);
    },
});
const upload = multer({ storage: storage });

// Add book
async function addBook(req, res) {
    try {
        const { name, isbn, price, written_by, quantity } = req.body;
        const icon = req.file ? `images/booksicon/${req.file.filename}` : null;

        if (!name || !isbn || !price || !written_by || !quantity) {
            return res.status(400).json({ error: 'All fields except icon are required.' });
        }

        const existingBook = await Book.findOne({ isbn, added_by: req.user.id });
        if (existingBook) {
            return res.status(400).json({ error: 'ISBN must be unique for this admin.' });
        }

        const newBook = new Book({
            name,
            isbn,
            price: parseFloat(price),
            written_by,
            quantity: parseInt(quantity),
            icon,
            added_by: req.user.id,
        });
        await newBook.save();
        return res.status(201).json({ message: 'Book added successfully.', newbook: newBook });
    } catch (error) {
        console.error('Error adding book:', error);
        return res.status(500).json({ error: 'An error occurred while adding the book.' });
    }
}

// Fetch books added by the logged-in admin
async function getBooks(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const books = await Book.find({ added_by: req.user.id });
        return res.status(200).json({ message: 'Books retrieved successfully.', books });
    } catch (error) {
        console.error('Error fetching books:', error);
        return res.status(500).json({ error: 'An error occurred while fetching books.' });
    }
}

// Fetch all books added by all admins
async function getAllBooks(req, res) {
    try {
        const books = await Book.find();

        if (!books || books.length === 0) {
            return res.status(404).json({ message: 'No books found.' });
        }
        return res.status(200).json({
            message: 'All books retrieved successfully.',
            books: books.map(book => ({
                id: book._id, name: book.name, isbn: book.isbn, quantity: book.quantity, price: book.price, icon: book.icon || null,
            })),
        });
    } catch (error) {
        console.error('Error fetching all books:', error);
        return res.status(500).json({ error: 'An error occurred while fetching all books.' });
    }
}

// Fetch a single book by ID
async function getBookById(req, res) {
    try {
        const { _id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ error: "Invalid book ID format." });
        }
        const book = await Book.findById(_id);
        if (!book) {
            return res.status(404).json({ error: "Book not found." });
        }
        return res.status(200).json(book);
    } catch (error) {
        console.error("Error fetching book:", error);
        return res.status(500).json({ error: "An error occurred while fetching the book." });
    }
}

// Update book 
async function updateBook(req, res) {
    try {
        console.log(req.body);  

        const { _id, name, isbn, price, written_by, quantity, icon } = req.body;

        if (!_id || !name || !isbn || !price || !written_by || !quantity) {
            return res.status(400).json({ error: "All fields except icon are required." });
        }

        const updatedBook = await Book.findByIdAndUpdate(
            _id,
            {
                name,
                isbn,
                price: parseFloat(price),
                written_by,
                quantity: parseInt(quantity),
                icon: icon || null 
            },
            { new: true }
        );

        if (!updatedBook) {
            return res.status(404).json({ error: "Book not found." });
        }
        await updatedBook.save();  
        return res.status(200).json({ message: "Book updated successfully.", updatedBook });
    } catch (error) {
        console.error("Error updating book:", error);
        return res.status(500).json({ error: "An error occurred while updating the book." });
    }
}

// Delete a book
async function deleteBook(req, res) {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({ error: "Book ID is required to delete." });
        }

        const deletedBook = await Book.findByIdAndDelete(_id);
        if (!deletedBook) {
            return res.status(404).json({ error: "Book not found." });
        }

        return res.status(200).json({ message: "Book deleted successfully." });
    } catch (error) {
        console.error("Error deleting book:", error);
        return res.status(500).json({ error: "An error occurred while deleting the book." });
    }
}

// Add Purchased Books
async function addPurchase(req, res) {
    try {
        const { userId, bookId, quantity, pickupDetails } = req.body;

        if (!userId || !bookId || !quantity || !pickupDetails) {
            return res.status(400).json({ error: "All fields are required in the request body." });
        }

        const { name, phone, address, selectedState, selectedCity, postalCode } = pickupDetails;
        if (!name || !phone || !address || !selectedState || !selectedCity || !postalCode) {
            return res.status(400).json({ error: "Pickup details are incomplete." });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: "Book not found." });
        }

        if (book.quantity < quantity) {
            return res.status(400).json({ error: "Insufficient stock." });
        }

        let purchaseDetails;
        const existingPurchase = await Purchase.findOne({ userId, bookId });
        if (existingPurchase) {
            existingPurchase.quantity += quantity;
            existingPurchase.pickupDetails = pickupDetails;
            existingPurchase.totalAmount = book.price * existingPurchase.quantity;
            purchaseDetails = await existingPurchase.save();
        } else {
            purchaseDetails = new Purchase({
                userId,
                bookId,
                quantity,
                purchaseDate: new Date(),
                pickupDetails,
                totalAmount: book.price * quantity,
            });
            await purchaseDetails.save();
        }

        book.quantity -= quantity;
        await book.save();

        return res.status(200).json({
            message: "Purchase successful.",
            purchaseDetails: {
                bookId: book._id,
                bookName: book.name,
                quantity: purchaseDetails.quantity,
                price: book.price,
                totalAmount: purchaseDetails.totalAmount,
            },
        });
    } catch (error) {
        console.error("Error processing purchase:", error);
        return res.status(500).json({ error: "An error occurred while processing the purchase." });
    }
}

// Get Purchased Books
async function getPurchases(req, res) {
    try {
        console.log("Fetching purchases for userId:", req.user.id);
        console.log("User Role:", req.user.role);

        let query = {};

        if (req.user.role.toLowerCase() === 'admin') {
            console.log("Admin is viewing purchases for their books");

            // Get all books added by the logged-in admin
            const books = await Book.find({ added_by: req.user.id });

            if (books.length === 0) {
                return res.status(200).json([]); // No books added by this admin
            }

            // Extract book IDs
            const bookIds = books.map(book => book._id);

            // Filter purchases based on the books added by the admin
            query.bookId = { $in: bookIds };

        } else {
            console.log("Regular user, filtering by userId:", req.user.id);
            query.userId = req.user.id;  // Regular user sees their own purchases
        }

        console.log("Query for purchases:", query);

        // Fetch purchases based on the query
        const purchases = await Purchase.find(query)
            .populate('userId', 'username email first_name last_name')
            .populate('bookId', 'name price')
            .exec();

        console.log("Fetched purchases:", purchases);

        if (purchases.length === 0) {
            return res.status(200).json([]); // No purchases found for this query
        }

        // Aggregate purchases to combine same book purchases by the same user
        const aggregatedPurchases = purchases.reduce((acc, purchase) => {
            const key = `${purchase.userId._id}_${purchase.bookId._id}`;
            if (!acc[key]) {
                acc[key] = {
                    userId: purchase.userId,
                    bookId: purchase.bookId,
                    quantity: 0,
                    totalAmount: 0,
                    purchaseDate: purchase.purchaseDate,
                    pickupDetails: purchase.pickupDetails
                };
            }
            acc[key].quantity += purchase.quantity;
            acc[key].totalAmount += purchase.quantity * purchase.bookId.price;

            return acc;
        }, {});

        // Map the aggregated purchases to a response format
        const result = Object.values(aggregatedPurchases).map(purchase => ({
            _id: purchase.bookId._id,
            quantity: purchase.quantity,
            totalAmount: purchase.totalAmount,
            bookName: purchase.bookId.name,
            price: purchase.bookId.price,
            purchaseDate: purchase.purchaseDate,
            pickupDetails: purchase.pickupDetails,
            user: {
                id: purchase.userId._id,
                username: purchase.userId.username,
                email: purchase.userId.email,
                name: `${purchase.userId.first_name} ${purchase.userId.last_name}`
            },
            book: {
                id: purchase.bookId._id,
                name: purchase.bookId.name,
                price: purchase.bookId.price
            }
        }));

        return res.status(200).json(result);

    } catch (error) {
        console.error("Error fetching purchases:", error);
        return res.status(500).json({ error: "An error occurred while fetching purchases." });
    }
}

// Update Book Quantity
async function updateBookQuantity(req, res) {
    try {
        const { bookId, quantity } = req.body;

        if (!bookId || quantity == null) {
            return res.status(400).json({ error: "Book ID and quantity are required." });
        }
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: "Book not found." });
        }
        book.quantity = quantity;
        await book.save();
        return res.status(200).json({ message: "Book quantity updated successfully." });
    } catch (error) {
        console.error("Error updating book quantity:", error);
        return res.status(500).json({ error: "An error occurred while updating the book quantity." });
    }
}

// API to Get States
async function getStates(req, res) {
    try {
        const states = await State.find({});
        if (!states || states.length === 0) {
            return res.status(404).json({ error: 'No states found.' });
        }
        const formattedStates = states.map(state => ({
            id: state.stateId,
            name: state.stateName,
        }));
        return res.status(200).json(formattedStates);
    } catch (error) {
        console.error('Error fetching states:', error);
        return res.status(500).json({ error: 'An error occurred while fetching states.' });
    }
}

// API to Get Cities by StateId
async function getCitiesByStateId(req, res) {
    try {
        const { stateId } = req.params;
        if (!stateId) {
            return res.status(400).json({ error: 'State ID is required.' });
        }
        const cities = await City.find({ stateId: stateId });
        if (!cities || cities.length === 0) {
            return res.status(404).json({ error: 'No cities found for the given state ID.' });
        }
        const formattedCities = cities.map(city => ({
            cityId: city.cityIdId,
            cityName: city.cityName,
            stateId: city.stateId,
        }));
        return res.status(200).json({ cities: formattedCities });
    } catch (error) {
        console.error('Error fetching cities:', error);
        return res.status(500).json({ error: 'An error occurred while fetching cities.' });
    }
}

module.exports = {
    addBook,
    updateBook,
    deleteBook,
    getBooks,
    getAllBooks,
    getBookById,
    addPurchase,
    getPurchases,
    updateBookQuantity,
    getStates,
    getCitiesByStateId,
    upload,
};
