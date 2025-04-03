const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StateSchema = new Schema(
    {
        stateId: {
            type: String,
            required: true,
        },
        stateName: {
            type: String,
            required: true,
        },
    },
);

module.exports = mongoose.model('State', StateSchema, 'statescollection');

