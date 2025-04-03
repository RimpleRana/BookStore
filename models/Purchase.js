const mongoose = require('mongoose')

const Schema = mongoose.Schema

const PurchaseSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
        quantity: { type: Number, required: true },
        purchaseDate: { type: Date, default: Date.now },
        pickupDetails: { 
            name: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            selectedState: { type: String, required: true },
            selectedCity: { type: String, required: true },
            postalCode: { type: String, required: true }
        },
        totalAmount: { type: Number, required: true }
    },
    {
        virtuals: {
            id: {
                get() {
                    return this._id
                }
            }
        }
    }
)

module.exports = mongoose.model('Purchase', PurchaseSchema)
