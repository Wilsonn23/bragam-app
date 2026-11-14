import React from 'react';
import { Text, View } from 'react-native';
import { positions } from './fixtures';
import { ActionButton } from '../components/ActionButton';
export function SimulationPanel({ onSample }) {
  return <View>
    <Text>SIMULASI — data sintetis, bukan posisi GPS. Untuk keluar terkonfirmasi, tekan “Di luar” dua kali dengan jeda minimal 2 detik. Cooldown fixture 60 detik sejak trigger terakhir; untuk memicu ulang, masuk lagi sesudah cooldown.</Text>
    {positions.map(position => <ActionButton key={position.label} label={position.label} secondary
      onPress={() => onSample({ latitude: position.latitude, longitude: position.longitude, accuracy: 3, timestamp: Date.now() })} />)}
  </View>;
}
