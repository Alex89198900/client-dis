import App from './lib/app';
import { http } from './lib/http';
import Router from './lib/router';
import socket, { bindGlobalSocketEvents } from './lib/socket';
import ChatsScreen from './components/chats-screen';
import { appStore } from './store/app-store';
import SettingsAppearanceComponent from './components/settings-appearance';
import { getTypedStorageItem } from './utils/local-storage';
Object.assign(window, { app: { Router: Router, store: appStore } });

const defaultRoute = Router.createLink('');

bindGlobalSocketEvents();

(function initialize() {
  window.history.replaceState(Router.createState(defaultRoute), '', '/');
})();

async function main() {
  // await http.test();
  SettingsAppearanceComponent.setTheme();
  appStore.setLang(getTypedStorageItem('lang') || 'en');
  await App.run();
  socket.emit('run');
  ChatsScreen.bindRouteChanged();
}

window.addEventListener('popstate', (event) => {
  if (event.state) {
    App.run();
  }
});

main();
