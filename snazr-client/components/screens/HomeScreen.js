import React, { Component } from 'react';
import { Alert, View, Switch, AsyncStorage, Image, Dimensions, TouchableWithoutFeedback, DeviceEventEmitter, AppRegistry } from 'react-native';
import Router from '../navigation/Router';
import SelectMode from './SelectMode';
import { Container, Header, Title, Content, Footer, FooterTab, Button, Left, Right, Body, Icon , Text, ListItem, Card, CardItem } from 'native-base';
import Expo from 'expo';
import axios from 'axios';
import helpers from '../config/util';
import registerForPushNotificationsAsync from '../config/getToken';
import CheckBox from 'react-native-checkbox';

// import RNFetchBlob from 'react-native-fetch-blob';

export default class HomeScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      toggled: false,
      pictures: [],
      notification: {}, 
      showCard: false,
      photo: undefined, // { userId, requestId, and cloudStorageUrl}
      selecting: false
    }

    this._getInitialToggle();
    this._getPictures();
    this._toggleSelectMode = this._toggleSelectMode.bind(this);
    this._refresh = this._refresh.bind(this);
    this._goToMap = this._goToMap.bind(this);
    this._done = this._done.bind(this);
    this._deletePhoto = this._deletePhoto.bind(this);
    this._flagPhoto = this._flagPhoto.bind(this);
    this._downloadPhoto = this._downloadPhoto.bind(this);
    // this._handleNotification = this._handleNotification.bind(this);
    this._goToSettings = this._goToSettings.bind(this);
    this._toggleLocation = this._toggleLocation.bind(this);
    this._getAndSendLocationData = this._getAndSendLocationData.bind(this);
    this._searchAndRemoveLocationData = this._searchAndRemoveLocationData.bind(this);
  }

  // componentWillMount() {
  //   this._notificationSubscription = DeviceEventEmitter.addListener(
  //     'Exponent.notification', this._handleNotification
  //   );
  // }

  // _handleNotification(notification) {
  //   this.setState({notification: notification, showCard: !this.state.showCard});
  // }

  async _getInitialToggle() {
    const toggle = await AsyncStorage.getItem('com.snazr.toggled');
    if(!toggle) {
      this.setState({toggled: false});
    } else {
      this.setState({toggled: true});
    }
  }

  async _toggleLocation() {
    if (this.state.toggled) {
      const toggled = await AsyncStorage.removeItem('com.snazr.toggled');
      this.setState({toggled: false});
      this._searchAndRemoveLocationData();
      registerForPushNotificationsAsync(this.state.id, 'DELETE')
    } else {
      const toggled = await AsyncStorage.setItem('com.snazr.toggled', 'toggled');
      this.setState({toggled: true});
      this._getAndSendLocationData();
      registerForPushNotificationsAsync(this.state.id, 'POST')
    }
  }

  async _getPictures() {
    const id = await AsyncStorage.getItem('com.snazr.id');
    const name = await AsyncStorage.getItem('com.snazr.name');
    this.setState({ id: id, name: name });
    const obj = {
      params: {
        userId: id
      }
    }
    axios.get(helpers.HOST_URL + 'api/photos', obj )
         .then((resp) => {
           console.log('------------------ photo:', resp.data[0].photos[0]);
           this.setState({pictures: resp.data[0].photos}, (err) => {
             if (err) {
               console.log('error getting pictures:', err)
             } else {
               console.log('pictures state set:', this.state.pictures);
             }
            });
         })
         .catch((err) => {
           console.log(err);
         });
  }

  _toggleSelectMode() {
    console.log('toggling select mode.');
    console.log('BEFORE: ', this.state.selecting);
    this.setState({selecting: false}, (err) => {
      if (err) console.log(err);
      else console.log('AFTER: ', this.state.selecting)
    }
    );
  }
// TODO: Implement blocking cability and uncomment out those options.
  _flagPhoto(photo) {
    console.log('Flag this photo please!!!!!!!!!!!!!!!!:', photo);
    axios.post(helpers.HOST_URL + 'api/flagged_users', photo)
      .then(response => {
        console.log('inside axios post .then')
        Alert.alert(
          'flagged',
          'This user and photo have been flagged for review',
          [
            // {text: 'Block user', onPress: () => console.log('User wants to block this photographer')},
            // {text: 'Info on blocking', onPress: () => console.log('User wants to know more about blocking')},
            {text: 'OK', onPress: () => console.log('OK Pressed')},
          ],
          { cancelable: false }
        )
      })
      .catch(err => console.log(err));
  }

  async _getAndSendLocationData() {
    navigator.geolocation.getCurrentPosition(position => {
        let { latitude , longitude } = position.coords;
        let locationObj = { userId: this.state.id, name: this.state.name, lng: longitude.toFixed(2), lat: latitude.toFixed(2), latPrecise: latitude, lngPrecise: longitude }
        console.log('sending location', this.state.id, this.state.name);
        axios.post(helpers.HOST_URL + 'api/toggled_users' , locationObj).then(response => {
          console.log('successfully posted');
          this.setState({location: locationObj});
          return response;
        }).then( response => {
          AsyncStorage.setItem('com.snazr.location', JSON.stringify(locationObj));
          this.watchID = navigator.geolocation.watchPosition(position => {
            let { latitude , longitude } = position.coords;
            if ( helpers._distance( longitude - this.state.longitude, latitude - this.state.latitude ) > 0.002 ) {
              this._updateLocation(longitude, latitude);
            }
          })
        }).catch( err => console.log('ERROR: location not posted' , err));
      }), error => alert(JSON.stringify(error)), {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000} 
  }

  async _updateLocation(longitude, latitude) {
    console.log('UPDATING location', this.state.id, this.state.name);
    let oldLocation = await AsyncStorage.getItem('com.snazr.location');
    oldLocation = JSON.parse(oldLocation);
    let newLocation = { userId: this.state.id, name: this.state.name, lng: longitude.toFixed(2), lat: latitude.toFixed(2), latPrecise: latitude, lngPrecise: longitude };
    axios.put(helpers.HOST_URL + 'api/toggled_users' , {oldLoc: oldLocation, newLoc: newLocation} ).then(response => {
      console.log('successfully updated!');
      this.setState({location: newLocation});
      AsyncStorage.setItem('com.snazr.location', JSON.stringify(newLocation));
    });
  }

  async _searchAndRemoveLocationData() {
    console.log('removing');
    if (this.state.location) {
      axios.delete(helpers.HOST_URL + 'api/toggled_users', {data: this.state.location}).then(response => {
        console.log('successfully removed');
      });
    } else {
      const location = await AsyncStorage.getItem('com.snazr.location');
      axios.delete(helpers.HOST_URL + 'api/toggled_users', {data: JSON.parse(location)}).then(response => {
        console.log('successfully removed');
      });
    }
  }

  _goToMap() {
    this.props.navigator.push(Router.getRoute('map'));
  }

  _goToSettings() {
    this.props.navigator.push(Router.getRoute('settings'));
  }

  _goToImg(photo) {
      this.setState({photo: photo});
  }

  _refresh() {
    this._getPictures();
  }

  _done() {
    this.setState({photo: undefined});
  }

  _deletePhoto() {
    axios.delete(helpers.HOST_URL + 'api/photos', {data: {userId: this.state.id, photo: this.state.photo}}).then(response => {
      console.log('photo deleted');
      this.setState({photo: undefined});
      this._refresh();
    });
  }

  _downloadPhoto() {
    console.log('Downloading, feature not implemented completely yet');
    // RNFetchBlob.config({
    //   fileCache : true,
    //   appendExt : 'jpg'
    //   })
    //   .fetch('GET', this.state.photo, {
    //   //some headers ..
    //   })
    //   .then((res) => {
    //   console.log('The file saved to ', res.path())
    // })
  }

// TODO: Move first return into its own ImageDetail component
  render() {
    if(this.state.photo) {
      return (
          <Container>
              <Header style={{backgroundColor: '#BA90FF'}}>
                  <Left>
                    <Button transparent onPress={this._done}>
                        <Text name='refresh' style={{color: '#ffff'}}>Done</Text>
                    </Button>
                  </Left>
                  <Body>
                      <Title style={{color:'#ffff'}}>Selection</Title>
                  </Body>
                  <Right>
                    <Switch onValueChange={this._toggleLocation} value={this.state.toggled} />
                  </Right>
              </Header>
              <Content>
                <Image source={{uri: this.state.photo.cloudStorageUrl}} style={{width: Dimensions.get('window').width, height: Dimensions.get('window').height}}/>
              </Content>
              <Footer>
                  <FooterTab>
                      <Button onPress={this._downloadPhoto}>
                        <Icon name="download" />
                      </Button>
                      <Button onPress={() => this._deletePhoto()}>
                        <Icon name="trash" />
                      </Button>
                      <Button onPress={() => this._flagPhoto(this.state.photo)}>
                        <Icon name="flag" />
                      </Button>
                  </FooterTab>
              </Footer>
          </Container>
      );
    } else {
      return (this.state.selecting) ? 
          <SelectMode pictures={this.state.pictures} id={this.state.id} refresh={this._refresh} flag={this._flagPhoto} refresh={this._refresh} backToHome={this._toggleSelectMode} /> :
          <Container>
            <Header style={{backgroundColor: '#BA90FF'}}>
              <Left>
                <Button transparent onPress={this._refresh}>
                    <Icon name='refresh' style={{color: '#ffff'}}/>
                </Button>
              </Left>
              <Body>
                  <Title style={{color:'#ffff'}}>Gallery</Title>
              </Body>
              <Right>
                <Switch onValueChange={this._toggleLocation} value={this.state.toggled} />
              </Right>
            </Header>
            <Content>
              {/*{this.state.showCard ? <Card><CardItem><Body><Text>{this.state.notification.data}</Text></Body></CardItem></Card> : <Text></Text> }*/}
              <View style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap'}}>
                {this.state.pictures.map((photo, index) => 
                  <TouchableWithoutFeedback key={index} onPress={this._goToImg.bind(this, photo)} onLongPress= {() => this.setState({selecting: true})}>
                    <Image source={{uri: photo.cloudStorageUrl}} style={{height: Dimensions.get('window').width/3.1, width: Dimensions.get('window').width/3.1, margin: 1}}/>
                  </TouchableWithoutFeedback> )}
              </View>
            </Content>
            <Footer>
              <FooterTab>
                <Button active style={{backgroundColor: '#DDC5FF'}}>
                  <Icon name="home" style={{color: '#ffff'}}/>
                </Button>
                <Button onPress={this._goToMap}>
                  <Icon name="map" />
                </Button>
                <Button onPress={this._goToSettings}>
                  <Icon name="settings" />
                </Button>
              </FooterTab>
            </Footer>
        </Container>  
    }
  }
}

