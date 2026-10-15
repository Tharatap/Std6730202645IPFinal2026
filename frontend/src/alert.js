import { Alert, Platform } from 'react-native';

export function showAlert(title, msg) {
  if (Platform.OS === 'web') {
    window.alert(msg ? `${title}\n\n${msg}` : title);
  } else {
    Alert.alert(title, msg);
  }
}

export function confirmAsync(title, msg) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(msg ? `${title}\n\n${msg}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      msg,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
