import React from 'react';
import { PoiRoute, goBackToApp } from '../../components/PoiRoute';
import NavigationScreen from '../../screens/NavigationScreen';

export default function PoiDirections() {
  return <PoiRoute>{poi => <NavigationScreen key={poi.id}
    poi={{ ...poi, coordinate: { latitude: poi.latitude, longitude: poi.longitude } }}
    onBack={goBackToApp} />}</PoiRoute>;
}
