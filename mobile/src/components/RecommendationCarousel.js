import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from './theme';
import { PoiDetailFooter } from './PoiCardComponents';
import { PoiFirstImage } from './PoiImageGallery';
import { MatchBadge, ReasonChips } from './RecommendationParts';

const GAP = 12;
const SIDE = 28; // space left/right of the active card; the neighbour peeks into it

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '';
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function Separator() {
  return <View style={{ width: GAP }} />;
}

function isBookmarked(bookmarkedPois, poi) {
  return bookmarkedPois.some(
    (item) =>
      (poi.id && String(item.id) === String(poi.id)) ||
      item.name?.toLowerCase() === poi.name?.toLowerCase()
  );
}

/**
 * Swipeable recommendation cards: one card per swipe, neighbours peek in from the
 * sides, and the dots follow the scroll position (tap a dot to jump).
 * `bleed` extends the carousel to the screen edges past the parent's horizontal padding.
 */
export default function RecommendationCarousel({
  items, bookmarkedPois = [], bleed = 0,
  onOpenDetail, onOpenDirections, onToggleSave, onAddToItinerary,
}) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollX] = useState(() => new Animated.Value(0));
  const listRef = useRef(null);

  const cardWidth = Math.max(0, width - SIDE * 2);
  const interval = cardWidth + GAP;
  const current = Math.min(activeIndex, Math.max(0, items.length - 1));

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        if (!interval) return;
        const index = Math.round(event.nativeEvent.contentOffset.x / interval);
        const clamped = Math.min(Math.max(index, 0), items.length - 1);
        if (clamped !== current) setActiveIndex(clamped);
      },
    }
  );

  const goTo = (index) => {
    listRef.current?.scrollToOffset({ offset: index * interval, animated: true });
    setActiveIndex(index);
  };

  const renderItem = ({ item, index }) => {
    const { poi } = item;
    const inputRange = [(index - 1) * interval, index * interval, (index + 1) * interval];
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });

    return (
      <Animated.View style={[styles.cardSlot, { width: cardWidth, opacity, transform: [{ scale }] }]}>
        <View style={styles.card}>
          <View>
            <PoiFirstImage poi={poi} style={styles.image} />
            <View style={styles.rankPill}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <MatchBadge percent={item.matchPercent} style={styles.matchBadge} />
          </View>
          <View style={styles.body}>
            <View>
              <ReasonChips reasons={item.reasons} />
              {item.reasons.length > 0 && <View style={styles.reasonSpacer} />}
            </View>
            <PoiDetailFooter
              name={poi.name}
              rating={poi.rating}
              distance={formatDistance(item.distanceMeters)}
              isSaved={isBookmarked(bookmarkedPois, poi)}
              onCheckDetail={() => onOpenDetail?.(poi)}
              onDirections={() => onOpenDirections?.(poi)}
              onSave={() => onToggleSave?.(poi)}
              onAddToItinerary={() => onAddToItinerary?.(poi)}
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View>
      <View
        style={{ marginHorizontal: -bleed }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <Animated.FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item) => String(item.poi.id)}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={interval}
            snapToAlignment="start"
            disableIntervalMomentum
            contentContainerStyle={{ paddingHorizontal: SIDE }}
            ItemSeparatorComponent={Separator}
            onScroll={onScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({ length: interval, offset: interval * index, index })}
            accessibilityLabel="Rekomendasi destinasi, geser untuk melihat lainnya"
          />
        )}
      </View>

      {items.length > 1 && (
        <View style={styles.dotsRow}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={String(item.poi.id)}
              onPress={() => goTo(index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Rekomendasi ${index + 1}: ${item.poi.name}`}
              accessibilityState={{ selected: index === current }}
              style={[styles.dot, index === current && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardSlot: { alignSelf: 'stretch' },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 150, backgroundColor: COLORS.lavenderTint },
  rankPill: {
    position: 'absolute', top: 10, left: 10, backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  rankText: { fontSize: 12, fontWeight: '800', color: COLORS.darkPurple },
  matchBadge: { position: 'absolute', top: 10, right: 10 },
  body: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  reasonSpacer: { height: 8 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.lavenderTint },
  dotActive: { width: 18, backgroundColor: COLORS.darkPurple },
});
