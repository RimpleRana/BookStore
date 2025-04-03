const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CitySchema = new Schema(
    {
        cityId: {
            type: String,
            required: true,
        },
        cityName: {
            type: String,
            required: true,
        },
        stateId: {
            type: String,
            required: true,
        },
    },
);

module.exports = mongoose.model('City', CitySchema, 'citiescollection');

