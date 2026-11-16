import React from 'react';
import { Stack } from 'expo-router';
import { AudioProvider } from '../audio/AudioProvider';
import { PoiProvider } from '../poi/PoiProvider';

export default function Layout() {
  return <PoiProvider><AudioProvider><Stack id="root" screenOptions={{ headerShown: false }} /></AudioProvider></PoiProvider>;
}
