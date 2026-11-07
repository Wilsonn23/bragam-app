import React from 'react';
import { Stack } from 'expo-router';
import { AudioProvider } from '../audio/AudioProvider';

export default function Layout() {
  return <AudioProvider><Stack id="root" screenOptions={{ headerShown: false }} /></AudioProvider>;
}
