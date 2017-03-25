import React, { Component } from 'react';
import { Alert, View, Switch, AsyncStorage, Image, Dimensions, TouchableWithoutFeedback, DeviceEventEmitter, AppRegistry } from 'react-native';
import Router from '../navigation/Router';
import { Container, Header, Title, Content, Footer, FooterTab, Button, Left, Right, Body, Icon, Text, ListItem, Card, CardItem } from 'native-base';
import Expo from 'expo';
import axios from 'axios';
import helpers from '../config/util';
import registerForPushNotificationsAsync from '../config/getToken';
import CheckBox from 'react-native-checkbox';                     

export default class SelectMode extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: [] 
    };
    this._toggleSelect = this._toggleSelect.bind(this);
    this._checkIfSelected = this._checkIfSelected.bind(this);
    this._deleteSelected = this._deleteSelected.bind(this);
    this._flagSelected = this._flagSelected.bind(this);
  }
  
// This is slow. Should be refactored.
  _toggleSelect(photo) {
    let removed;
    for (let i = 0; i < this.state.selected.length; i++) {
      if (this.state.selected[i].cloudStorageUrl === photo.cloudStorageUrl) {
        let original = this.state.selected;
        this.setState({selected: [...original.slice(0, i), ...original.slice(i + 1)]});
        removed = true;
        break;
      }
    }
    if (!removed) {
      this.setState({selected: [...this.state.selected, photo]});
    }
  }

  _checkIfSelected(photo) {
    let selected = false;
    for (let i = 0; i < this.state.selected.length; i++) {
      if (this.state.selected[i].cloudStorageUrl === photo.cloudStorageUrl) {
        selected = true;
        break;
      }
    }
    console.log('photo is currently selected: ', selected);
    return selected;
  }
  
  _deleteSelected() {
    this.state.selected.forEach((photo) => {
      console.log('Delete this photo please: ', photo);
      axios.delete(helpers.HOST_URL + 'api/photos', {data: {userId: this.props.id, photo: photo}})
        .then(response => { this.props.refresh(); }); 
    });
  }

  _flagSelected() {
    console.log('flag these: ', this.state.selected);
    this.state.selected.forEach(this.props.flag);
  }
  // TODO: Alert when delete is clicked - are you sure you want to delete?
  render() {
    return (
      <Container>
        <Header style={{backgroundColor: '#BA90FF'}}>
          <Left>
            <Button transparent onPress={this.props.refresh}>
              <Icon name='refresh' style={{color: '#ffff'}}/>
            </Button>
          </Left>
          <Body>
              <Title style={{color: '#ffff'}}>Select</Title>
          </Body>
          <Right>
            <Button transparent onPress={this.props.backToHome}>
                <Text name='back' style={{color: '#ffff'}}>Done</Text>
            </Button>
          </Right>
        </Header>
        <Content>
          <View style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap'}}>
            {this.props.pictures.map((photo, index) => 
              <TouchableWithoutFeedback key={index} onPress={()=>this._toggleSelect(photo)}>
                <Image source={{uri: photo.cloudStorageUrl}} style={{height: Dimensions.get('window').width / 3.1, width: Dimensions.get('window').width / 3.1, margin: 1}}>
                  <CheckBox label='' checked={this._checkIfSelected(photo)} onChange={(checked) => console.log('I am checked', checked)}/>
                </Image>
              </TouchableWithoutFeedback> )}
          </View>
        </Content>
        <Footer>
          <FooterTab>
            <Button onPress={this._deleteSelected}>
              <Icon name="trash" />
            </Button>
            <Button onPress={this._flagSelected}>
              <Icon name="flag" />
            </Button>
          </FooterTab>
        </Footer>
    </Container>  
    );
  }
}