const mongoose = require('mongoose');

const flagSchema = mongoose.Schema({
  userId: String,
  flaggedPhotos: Array
});

// userSchema.pre('save', (next) => {

// });

module.exports = mongoose.model('FlaggedUser', flagSchema);