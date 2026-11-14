import React from 'react';
import { router } from 'expo-router';
import { PoiRoute, goBackToApp } from '../../components/PoiRoute';
import PoiDetailScreen from '../../screens/PoiDetailScreen';
import { useGuideAudio } from '../../audio/AudioProvider';

export default function PoiDetail() {
  const audio = useGuideAudio();
  return <PoiRoute>{poi => <PoiDetailScreen key={poi.id} poi={poi} audio={audio}
    onBack={goBackToApp}
    onOpenDirections={destination => router.push({ pathname: '/navigation/[id]', params: { id: destination.id } })} />}</PoiRoute>;
}
