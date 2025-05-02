const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerLocation: {
    lat: Number,
    lng: Number
  },
  status: String
});

module.exports = mongoose.model('Request', requestSchema);
