const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BookSchema = new Schema(
    {
        name: { type: String, required: true },
        isbn: { type: String, required: true, unique: true },
        price: { type: Number, required: true },
        written_by: { type: String, required: true },
        quantity: { type: Number, required: true },
        icon: { type: String, default: null },
        added_by: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
    },
    { timestamps: true }
);

module.exports = mongoose.model('Book', BookSchema);
