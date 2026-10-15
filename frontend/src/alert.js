import { Alert, Platform } from 'react-native';

// In-app dialogs rendered by <DialogHost /> (App.js). Falls back to native dialogs if no host is mounted.
let host = null;

export function registerDialogHost(h) {
  host = h;
  return () => {
    if (host === h) host = null;
  };
}

// type: 'error' | 'warning' | 'success' | 'info'
export function showAlert(title, msg, { type = 'error' } = {}) {
  if (host) return host.alert({ title, message: msg, type });
  if (Platform.OS === 'web') window.alert(msg ? `${title}\n\n${msg}` : title);
  else Alert.alert(title, msg);
  return Promise.resolve();
}

export function confirmAsync(title, msg, { confirmText = 'Delete', cancelText = 'Cancel', destructive = true } = {}) {
  if (host) return host.confirm({ title, message: msg, confirmText, cancelText, destructive });
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(msg ? `${title}\n\n${msg}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      msg,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

export function showToast(message, { type = 'success' } = {}) {
  if (host) host.toast({ message, type });
}

// Maps API errors to readable title + message
export function describeError(e, fallbackTitle = 'Something went wrong') {
  switch (e?.status) {
    case 0:
      return {
        title: "Can't reach the server",
        message: 'Check your internet connection or make sure the backend server is running.',
      };
    case 400:
      return { title: 'Invalid information', message: e.message };
    case 401:
      return { title: 'Session expired', message: 'Please sign in again.' };
    case 404:
      return {
        title: 'Employee not found',
        message: 'This employee may have already been deleted. The list has been refreshed.',
      };
    default:
      if (e?.status >= 500) {
        return { title: 'Something went wrong', message: 'The server had a problem. Please try again in a moment.' };
      }
      return { title: fallbackTitle, message: e?.message || 'Please try again.' };
  }
}

export function showError(e, fallbackTitle) {
  const { title, message } = describeError(e, fallbackTitle);
  return showAlert(title, message, { type: 'error' });
}
