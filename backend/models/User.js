const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    type: { type: String, enum: ['customer', 'driver'], required: true },
    available: { type: Boolean, default: false },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    }
});

module.exports = mongoose.model('User', userSchema);
