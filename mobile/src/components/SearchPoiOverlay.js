import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';

const SAMPLE_POIS = [
  {
    id: '1',
    name: 'Braga Citywalk',
    address: 'Jl. Braga No.99–101, Braga, Kec. Sumur...',
    distance: '12km',
    rating: '5.0',
  },
  {
    id: '2',
    name: 'Sweet Cantina',
    address: 'Jl. Braga No.99–101, Braga, Kec. Sumur...',
    distance: '12km',
    rating: '5.0',
  },
  {
    id: '3',
    name: 'Kopi Toko Djawa',
    address: 'Jl. Braga No.99–101, Braga, Kec. Sumur...',
    distance: '12km',
    rating: '5.0',
  },
  {
    id: '4',
    name: 'Toko Roti Canary',
    address: 'Jl. Braga No.99–101, Braga, Kec. Sumur...',
    distance: '12km',
    rating: '5.0',
  },
  {
    id: '5',
    name: 'Bacang Panas Braga',
    address: 'Jl. Braga No.99–101, Braga, Kec. Sumur...',
    distance: '12km',
    rating: '5.0',
  },
];

export default function SearchPoiOverlay({ visible, onClose, onSelectPoi }) {
  const [query, setQuery] = useState('');

  if (!visible) return null;

  const filteredPois = SAMPLE_POIS.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.overlayRoot}>
      {/* Tap area gelap di bawah kartu untuk menutup search */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <SafeAreaView style={styles.safeWrapper}>
        <View style={styles.searchCard}>
          {/* Search Input Header */}
          <View style={styles.inputPill}>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Type Something..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.inputField}
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textMuted}
                  style={{ marginRight: 6 }}
                />
              </TouchableOpacity>
            ) : null}
            <Ionicons name="search" size={20} color={COLORS.darkPurple} />
          </View>

          {/* Filter Pills Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity style={styles.filterIconBtn}>
              <Ionicons name="options" size={20} color={COLORS.primaryPurple} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>Destination</Text>
              <View style={styles.filterChevronCircle}>
                <Ionicons name="chevron-down" size={12} color={COLORS.white} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>Open at Night</Text>
              <View style={styles.filterChevronCircle}>
                <Ionicons name="chevron-down" size={12} color={COLORS.white} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>Top Rated</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Search Result List */}
          <ScrollView
            style={styles.resultList}
            showsVerticalScrollIndicator={false}
          >
            {filteredPois.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => {
                  onSelectPoi?.(item);
                  onClose();
                }}
                style={[
                  styles.resultItem,
                  idx !== filteredPois.length - 1 && styles.resultDivider,
                ]}
              >
                <View style={styles.distanceCol}>
                  <View style={styles.pinCircle}>
                    <Ionicons
                      name="location"
                      size={17}
                      color={COLORS.darkPurple}
                    />
                  </View>
                  <Text style={styles.distText}>{item.distance}</Text>
                </View>

                <View style={styles.textCol}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>

                <Feather
                  name="arrow-up-left"
                  size={20}
                  color={COLORS.darkPurple}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 14, 62, 0.45)',
  },
  safeWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    paddingBottom: 10,
    maxHeight: 450,
    elevation: 6,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.8,
    borderBottomColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: 46,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterIconBtn: {
    padding: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.mediumPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 6,
  },
  filterPillText: {
    fontSize: 12,
    color: COLORS.primaryPurple,
    fontWeight: '500',
  },
  filterChevronCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultList: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  resultDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  distanceCol: {
    alignItems: 'center',
    marginRight: 12,
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  textCol: {
    flex: 1,
    paddingRight: 8,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 11,
    color: COLORS.mediumPurple,
  },
});