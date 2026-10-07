import FlashMessage, { showMessage } from 'react-native-flash-message';

export const AppBanner = () => <FlashMessage position="bottom" floating />;

export const showAppBanner = (title: string, message: string, type: 'success' | 'danger' | 'info' = 'info') => showMessage({ message: title, description: message, type, duration: 3500, icon: type });
