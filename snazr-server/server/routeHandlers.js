const { client } = require('./cache/redis.js');
const User = require('./models/users');
const Flag = require('./models/flags');
const mongoose = require('mongoose');
const push = require('./pushNotification.js');
const Promise = require('bluebird');

mongoose.connect('mongodb://localhost/snazr');

const token = {
  post: (req, res) => {
    let { userId } = req.body;
    let tokenObject = req.body.token;
    let token = JSON.stringify(tokenObject);
    let searchFor = { userId };
    User.find(searchFor, function(err, result) {
      if (err) { console.log('trying to find user to save push tokens,user: ', err); }
      if (result.length > 0 ) {
        let newEntry = result[0];
        console.log('new entry is: ', newEntry);
        newEntry.pushToken = token;
        console.log('entry to DB: ', newEntry);
        newEntry.save()
                    .then(function(result) {
                      console.log('1saved token succesfully');
                      res.send('1token saved');
                    })
                    .catch(function(err) {
                      console.log('ERRROR IS: ', err);
                      console.log('1: did not save photos successfully');
                      res.send('1photo did not save, err!'); 
                    });
      } else {
        let newEntry = new User({
          userId,
          pushToken: token,
          photos: []

        });
        newEntry.save()
                    .then(function(result) {
                      console.log('2saved token succesfully');
                      res.send('2token saved');
                    })
                    .catch(function(err) {
                      console.log('ERRROR IS: ', err);
                      console.log('2: did not save photos successfully');
                      res.send('2photo did not save, err!'); 
                    });

      }
    });
  },
  delete: (req, res) => {
    let { token, userId } = req.body;
    let searchFor = { userId };
    User.find(searchFor, function(err, query) {
      if (err) { console.log('trying to find user so we can delete the token bound to the user: ', err); }
      if (query.length > 0) {
        let result = query[0];
        if (result.pushToken) {
          result.pushToken = '';
          result.save()
                        .then(function(result) {
                          console.log('deleted token succesfully');
                          res.send('token deleted');
                        })
                            .catch(function(err) {
                              console.log('ERRROR IS: ', err);
                              console.log('delete token failed');
                              res.send('delete token failed, err!'); 
                            });
        }
      } else {
        res.send('user doesnt exist, no need to delete any tokens');
      }
    });
  }
};

const flag = {
  get: (req, res) => {
    Flag.find((err, users) => {
      if (err) {
        console.log(err);
        res.status(500).send('DB error. Could not get flagged users');
      } else {
        res.send(users);
      }
    });
  },
  post: (req, res) => {
    let flaggedUser = req.body.userId;
    let flaggedPhoto = {
      requestId: req.body.requestId,
      cloudStorageUrl: req.body.cloudStorageUrl
    };
    Flag.findOne({userId: flaggedUser}, function(err, result) {
      if (err) {
        console.log('error locating user');
      } else if (result) {
        console.log('user found. Adding photo to users list of flagged photos.');
        let alreadyFlagged = false;
        for (let photo of result.flaggedPhotos) {
          console.log('>>>>>>>>>>>>>>>>>>> photo: ', photo);
          console.log('>>>>>>>>>>>>>>>>>>> flaggedPhoto: ', photo);
          if (photo.cloudStorageUrl === flaggedPhoto.cloudStorageUrl) {
            alreadyFlagged = true;
            break;
          }
        }
        if (!alreadyFlagged) {
          result.flaggedPhotos = [...result.flaggedPhotos, flaggedPhoto];
          result.save();
        }
        res.send('User and photo have been flagged');
      } else {
        console.log('First time this user has been flagged.  Adding user and flagged photo to flag database');
        let flaggedUserToAdd = { userId: flaggedUser, flaggedPhotos: [flaggedPhoto] };
        console.log('flagged user to add to database:', flaggedUserToAdd);
        Flag.create({ userId: flaggedUser, flaggedPhotos: [flaggedPhoto] }, (err, result) => {
          if (err) {
            console.log(err);
          } else {
            console.log('user flag successfully added as: ', result);
            res.send('User and photo have been flagged');
          }
        });
      }        
    });
  }
};

const toggle = {
  get: (req, res) => {
        // should send a list of all the users that have their discoverability toggled on
        // with x, y amount of range in terms of longitude & latitude
        // by retrieving the information from our cache
        // the information of location is sent through their locations
        // if there are no locations just give a generic guy called joe back
    let data = req.query; 
        //specify range to do search here, 0.02 means within 2 kilometers
    client.util.get(data, client, 0.02) 
        .then(result => res.send(result));
  },
  post: (req, res) => {
    let user = req.body;
    client.util.add(user, client);
    res.send('sent /api/toggled_users and adding');
  },
  delete: (req, res) => {
    let user = req.body;
    client.util.del(user, client);
    res.send('deleting user from discovered list');
  },
  put: (req, res) => {
    let { oldLoc, newLoc } = req.body;
    console.log('the locations are : ', oldLoc, newLoc);
    client.util.del(oldLoc, client)
            .then( () => {
              client.util.add(newLoc, client);
            })
            .then( () => {
              res.send('updated user location in cache successfully');
            })
            .catch( () => {
              res.send('failed to update user location in cache');
            });
        
  }
};


const photo = {
  get: (req, res) => {
    let { userId } = req.query; 
    let model = { userId };
    User.find(model, function(err, result) {
      if (err) { console.log('could not find user from database: ', err); }
      console.log('from our database we got: ', result);
      res.send(result);
    });
  },
  post: (req, res) => {
    let { userId, requestId, cloudStorageUrl } = req.body;
    let model = {
      userId: requestId
    };
    User.find(model, function(err, result) {
      if (err) { console.log('trying to save new photos, but cant find user: ', err); }
      if (result.length > 0) {
        console.log('we have retrieved from db: ', result);
        let toSave = result[0];
        let stringToken;
        let objToken;
        if (toSave.pushToken) {
          stringToken = toSave.pushToken;
          objToken = JSON.parse(stringToken);         
        }
        let Token;
        if (objToken.value) {
          Token = objToken.value;
        } else {
          Token = '';
        }
        console.log('our token is: ', Token);
        let photos = [...toSave.photos];
        toSave.photos = [ { userId, requestId, cloudStorageUrl }, ...photos ];
        toSave.save()
                .then(function(result) {
                  console.log('1: saved photos successfully');
                  console.log('testing PUSH TOKEN: ', push.isToken(Token));
                  if (push.isToken(Token)) {
                    push.sendPush(Token);
                  }
                  // trigger notifcation
                  res.send('photo saved');
                })
              .catch(function(err) {
                console.log('ERRROR IS: ', err);
                console.log('1: did not save photos successfully');
                res.send('photo did not save, err!');
              });
      } else {
        let photos = [ { userId, requestId, cloudStorageUrl } ];
        let toSave = new User({
          userId: requestId,
          pushToken: '',
          photos: photos
        });
        toSave.save()
                .then(function(result) {
                  console.log('2: created New user!!! and saved photo');
                  res.send('createdNew User, photo saved');
                })
                .catch(function(err) {
                  console.log('2: did not save photos successfully');
                  res.send('photo did not save, err!');
                });
      }
            
    });
  },
  delete: (req, res) => {
    // photoObj: { userId, requestId, cloudStorageUrl }
    let { userId, photoObj } = req.body;
    let model = {
      userId
    };
    User.find(model, function(err, result) {
      if (err) { console.log('trying to delete photo, but got err ', err); }
      if (result.length > 0) {
        let item = result[0];
        let { photos } = item;
        let removed;
        for (let i = 0; i < photos.length; i++) {
          if (photos[i].cloudStorageUrl === photoObj.cloudStorageUrl) {
            removed = photos.splice(i, 1);
          }
        }
        console.log('we removed photo: ', removed);
        item.save()
                  .then(function(result) {
                    console.log('modified photos ');
                    res.send('deleted photo 1');
                  })
                  .catch(function(err) {
                    console.log('did NOT delete photo');
                    res.send('photo did not save, err!');
                  });
      } else {
        res.send('did not find user');
      }
    });
  }
};



const handlers = {
  token,
  toggle,
  photo,
  flag 
};




module.exports.handlers = handlers;