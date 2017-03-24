const User = require('./models/users');
const Flag = require('./models/flags');
// const mongoose = require('mongoose');
const Promise = require('bluebird');

const deletePhotos = (user, photosToDelete) => {
  let { photos } = user;
  let removed = [];
  for (let i = 0; i < photosToDelete.length; i++) {
    for (let j = 0; j < photos.length; j++) {
      if (photos[j].cloudStorageUrl === photosToDelete[i].cloudStorageUrl) {
        removed.push(photos.splice(j, 1));
        break;
      }
    }
  }
  return [user, removed];  
};

module.exports.deletePhotosFromDb = (userId, photosToDelete, httpResponse) => {
  User.find({ userId }, function(err, result) {
    if (err) { console.log('trying to delete photo, but got err ', err); }
    if (result.length > 0) {
      let [user, removed] = deletePhotos(result[0], photosToDelete);    
      console.log('we removed photo(s): ', removed);
      user.save()
        .then(function(result) {
          httpResponse.send('deleted ', removed.length, ' of ', photosToDelete.length, ' photos.');
        })
        .catch(function(err) {
          console.log('did NOT delete photo(s)');
          httpResponse.send('photo(s) did not save, err!');
        });
    } else {
      httpResponse.send('did not find user');
    }
  });
};