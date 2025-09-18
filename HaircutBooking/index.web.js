import { AppRegistry } from 'react-native';
import App from './AppWeb';

AppRegistry.registerComponent('HaircutBooking', () => App);
AppRegistry.runApplication('HaircutBooking', {
  rootTag: document.getElementById('root'),
});