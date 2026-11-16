import { registerRootComponent } from 'expo';
import React from 'react';

import App from './App';
import { PoiProvider } from './src/poi/PoiProvider';
import { AudioProvider } from './src/audio/AudioProvider';

function Root() {
  return <PoiProvider><AudioProvider><App /></AudioProvider></PoiProvider>;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
