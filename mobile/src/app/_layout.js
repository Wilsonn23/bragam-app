import React from 'react';
import { Stack } from 'expo-router';
import { PoiProvider } from '../poi/PoiProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AudioProvider } from '../audio/AudioProvider';

export default function Layout() {
  return <SafeAreaProvider><PoiProvider><AudioProvider><Stack id="root" screenOptions={{ headerShown: false }} /></AudioProvider></PoiProvider></SafeAreaProvider>;
}
