import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, RADIUS } from './theme';

function validImageUrls(poi) {
  const images = Array.isArray(poi?.images) ? poi.images : [];
  const urls = images
    .map((image) => image?.imageUrl)
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url));
  if (typeof poi?.imageUrl === 'string' && /^https?:\/\//i.test(poi.imageUrl)) {
    urls.unshift(poi.imageUrl);
  }
  return [...new Set(urls)];
}

export function PoiFirstImage({ poi, style }) {
  const firstUrl = useMemo(() => validImageUrls(poi)[0], [poi]);
  const [failedUrl, setFailedUrl] = useState(null);

  if (!firstUrl || failedUrl === firstUrl) {
    return <View style={[style, styles.firstPlaceholder]} />;
  }

  return (
    <Image
      source={{ uri: firstUrl }}
      style={style}
      resizeMode="cover"
      accessibilityLabel={`Foto ${poi?.name || 'POI'}`}
      onError={() => setFailedUrl(firstUrl)}
    />
  );
}

export default function PoiImageGallery({ poi, compact = false }) {
  const urls = useMemo(() => validImageUrls(poi), [poi]);
  const [failedUrls, setFailedUrls] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const availableUrls = urls.filter((url) => !failedUrls.includes(url));

  if (!availableUrls.length) {
    return compact
      ? <View style={styles.compactPlaceholder} />
      : <View style={styles.empty}><Text style={styles.emptyText}>Foto belum tersedia</Text></View>;
  }

  const markFailed = (url) => setFailedUrls((current) => [...current, url]);
  if (compact) {
    return (
      <View style={styles.compactRow}>
        {availableUrls.slice(0, 3).map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={styles.compactImage}
            resizeMode="cover"
            accessibilityLabel={`Foto ${poi?.name || 'POI'}`}
            onError={() => markFailed(url)}
          />
        ))}
      </View>
    );
  }

  if (availableUrls.length === 1) {
    return (
      <Image
        source={{ uri: availableUrls[0] }}
        style={styles.singleImage}
        resizeMode="cover"
        accessibilityLabel={`Foto ${poi?.name || 'POI'}`}
        onError={() => markFailed(availableUrls[0])}
      />
    );
  }

  const extraImageCount = Math.max(0, availableUrls.length - 3);

  return (
    <>
      <View style={styles.gallery}>
        <Image
          source={{ uri: availableUrls[0] }}
          style={styles.primaryImage}
          resizeMode="cover"
          accessibilityLabel={`Foto ${poi?.name || 'POI'}`}
          onError={() => markFailed(availableUrls[0])}
        />
        <View style={[styles.secondaryColumn, availableUrls.length === 2 && styles.singleSecondary]}>
          {[availableUrls[1], availableUrls[2]].map((url, index) =>
            url ? (
              <View key={url} style={styles.secondaryImageWrapper}>
                <Image
                  source={{ uri: url }}
                  style={styles.secondaryImage}
                  resizeMode="cover"
                  accessibilityLabel={`Foto ${poi?.name || 'POI'} ${index + 2}`}
                  onError={() => markFailed(url)}
                />
                {index === 1 && extraImageCount > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Lihat ${extraImageCount} foto lainnya`}
                    onPress={() => setIsExpanded(true)}
                    style={styles.moreOverlay}
                  >
                    <Text style={styles.moreText}>+{extraImageCount}</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          )}
        </View>
      </View>
      <Modal
        visible={isExpanded}
        animationType="slide"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{poi?.name || 'Galeri foto'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup galeri"
              onPress={() => setIsExpanded(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Tutup</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {availableUrls.map((url, index) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={styles.expandedImage}
                resizeMode="cover"
                accessibilityLabel={`Foto ${poi?.name || 'POI'} ${index + 1}`}
                onError={() => markFailed(url)}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gallery: { flexDirection: 'row', gap: 10, height: 232 },
  singleImage: {
    width: '100%',
    height: 232,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  primaryImage: {
    flex: 1.35,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  secondaryColumn: { flex: 1, gap: 10 },
  singleSecondary: { justifyContent: 'center' },
  secondaryImageWrapper: { position: 'relative', flex: 1 },
  secondaryImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  moreOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(25, 14, 64, 0.62)',
  },
  moreText: { color: COLORS.white, fontSize: 24, fontWeight: '700' },
  compactRow: { flexDirection: 'row', gap: 8 },
  compactImage: {
    width: 105,
    height: 105,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  compactPlaceholder: {
    width: 105,
    height: 105,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  firstPlaceholder: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  empty: {
    height: 232,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: COLORS.textSecondary },
  modalPage: { flex: 1, backgroundColor: COLORS.softLilacBg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.darkPurple,
  },
  closeText: { color: COLORS.white, fontWeight: '600' },
  modalContent: { padding: 20, gap: 14 },
  expandedImage: {
    width: '100%',
    height: 240,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
});
