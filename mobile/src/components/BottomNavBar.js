import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './theme';

const TABS = [
  { key: 'Home', label: 'Home' },
  { key: 'Explore', label: 'Explore' },
  { key: 'Trip', label: 'Trip' },
  { key: 'Account', label: 'Account' },
];

export default function BottomNavBar({ activeTab, onSelectTab }) {
  const renderIcon = (key, isActive) => {
    const color = COLORS.white;
    const size = 24;

    switch (key) {
      case 'Home':
        return (
          <Ionicons
            name={isActive ? 'home' : 'home-outline'}
            size={size}
            color={color}
          />
        );
      case 'Explore':
        return (
          <Ionicons
            name={isActive ? 'compass' : 'compass-outline'}
            size={size}
            color={color}
          />
        );
      case 'Trip':
        return (
          <MaterialCommunityIcons
            name="map-marker-path"
            size={size}
            color={color}
          />
        );
      case 'Account':
        return (
          <Ionicons
            name={isActive ? 'person-circle' : 'person-circle-outline'}
            size={size + 2}
            color={color}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.85}
            onPress={() => onSelectTab(tab.key)}
            style={[styles.tabItem, isActive && styles.activeTabPill]}
          >
            {renderIcon(tab.key, isActive)}
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingHorizontal: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 72,
  },
  activeTabPill: {
    backgroundColor: COLORS.activeNavPill,
  },
  tabLabel: {
    color: COLORS.white,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '400',
  },
  activeTabLabel: {
    fontWeight: '700',
  },
});