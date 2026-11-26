import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import {
  updateUserProfile,
  changeUserPassword,
} from '../services/userDataService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 220;
const MAX_SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.4, 300);

export default function AccountScreen({
  user,
  visitedPois = [],
  onLogout,
  onOpenPreferences = undefined,
  onOpenVisitHistory = undefined,
  onOpenUserReviews = undefined,
  onUpdateUser = undefined,
}) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 28
      : 44;

  const displayName = user?.name?.trim() || 'Pengguna BRAGAm';
  const displayEmail = user?.email || 'Email belum tersedia';
  const avatarUri = user?.avatar_url || user?.avatarUrl || null;

  const visitedCount = Array.isArray(visitedPois) ? visitedPois.length : 0;
  const visitCounterMessage =
    visitedCount === 0
      ? 'Kamu belum pernah ke mana-mana di Braga? Jalan-Jalan yuk!'
      : `${visitedCount} Destinasi Braga Telah Kamu Kunjungi!`;

  // State Modal Konfirmasi Logout
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // State Modal Foto Profil
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  // State Modal Edit Nama Akun
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // State Modal Ganti Password
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Keep the animated value and gesture handlers together for this mounted screen.
  const [{ sheetHeight, panResponder }] = useState(() => {
    const sheetHeight = new Animated.Value(MAX_SHEET_HEIGHT);
    let startHeight = MAX_SHEET_HEIGHT;
    let currentHeight = MAX_SHEET_HEIGHT;
    const animateSheet = (height) => {
      currentHeight = height;
      Animated.spring(sheetHeight, {
        toValue: height,
        useNativeDriver: false,
        bounciness: 3,
      }).start();
    };
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderGrant: () => {
        startHeight = currentHeight;
      },
      onPanResponderMove: (_, gesture) => {
        const nextHeight = Math.max(
          COLLAPSED_HEIGHT,
          Math.min(MAX_SHEET_HEIGHT, startHeight - gesture.dy)
        );
        currentHeight = nextHeight;
        sheetHeight.setValue(nextHeight);
      },
      onPanResponderRelease: (_, gesture) => {
        animateSheet(
          gesture.dy > 40 ||
            currentHeight < (COLLAPSED_HEIGHT + MAX_SHEET_HEIGHT) / 2
            ? COLLAPSED_HEIGHT
            : MAX_SHEET_HEIGHT
        );
      },
    });
    return { sheetHeight, panResponder };
  });

  // --- Handler Foto Profil ---
  const saveAvatarToDatabase = async (nextAvatarDataUri) => {
    if (!user?.id) return;
    setIsSavingPhoto(true);
    try {
      const updated = await updateUserProfile(user.id, {
        avatarUrl: nextAvatarDataUri,
      });
      onUpdateUser?.(updated || { avatar_url: nextAvatarDataUri });
      setPhotoModalVisible(false);
      Alert.alert(
        'Foto Profil Diperbarui',
        nextAvatarDataUri
          ? 'Foto profil akun berhasil disimpan.'
          : 'Foto profil berhasil dihapus.'
      );
    } catch (err) {
      Alert.alert(
        'Gagal Menyimpan Foto',
        err?.message || 'Tidak dapat memperbarui foto profil.'
      );
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Izin Diperlukan',
        'Izinkan akses galeri foto untuk mengganti foto profil.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const dataUri = asset.base64
      ? `data:${mimeType};base64,${asset.base64}`
      : asset.uri;

    await saveAvatarToDatabase(dataUri);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Izin Diperlukan',
        'Izinkan akses kamera untuk mengambil foto profil.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const dataUri = asset.base64
      ? `data:${mimeType};base64,${asset.base64}`
      : asset.uri;

    await saveAvatarToDatabase(dataUri);
  };

  // --- Handler Ubah Nama Akun ---
  const openEditNameModal = () => {
    setNameDraft(user?.name?.trim() || '');
    setNameError('');
    setEditNameModalVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Nama akun tidak boleh kosong.');
      return;
    }
    if (trimmed === user?.name?.trim()) {
      setEditNameModalVisible(false);
      return;
    }

    setNameError('');
    setIsSavingName(true);
    try {
      const updated = await updateUserProfile(user.id, { name: trimmed });
      onUpdateUser?.(updated || { name: trimmed });
      setEditNameModalVisible(false);
      Alert.alert('Berhasil', 'Nama akun berhasil diperbarui.');
    } catch (err) {
      setNameError(err?.message || 'Gagal memperbarui nama akun.');
    } finally {
      setIsSavingName(false);
    }
  };

  // --- Handler Ganti Password ---
  const openPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowOldPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPasswordError('');
    setPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!oldPassword) {
      setPasswordError('Password lama wajib diisi.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Konfirmasi password baru tidak sama.');
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordError('Password baru harus berbeda dari password lama.');
      return;
    }

    setPasswordError('');
    setIsSavingPassword(true);
    try {
      await changeUserPassword(user.id, oldPassword, newPassword);
      setPasswordModalVisible(false);
      Alert.alert('Berhasil', 'Password akun berhasil diperbarui.');
    } catch (err) {
      setPasswordError(err?.message || 'Gagal mengganti password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Upper Purple Profile Section */}
      <View style={[styles.headerSection, { paddingTop: topInset }]}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>Pengaturan Akun</Text>
          <View style={styles.topActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setLogoutModalVisible(true)}
              style={styles.logoutCircleBtn}
              accessibilityLabel="Keluar akun"
            >
              <MaterialCommunityIcons
                name="exit-to-app"
                size={21}
                color={COLORS.darkPurple}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Circular Avatar (Ketuk untuk tambah/ubah foto profil) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPhotoModalVisible(true)}
          style={styles.avatarWrapper}
          accessibilityRole="button"
          accessibilityLabel="Ubah foto profil"
        >
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                <Line
                  x1="15"
                  y1="15"
                  x2="85"
                  y2="85"
                  stroke={COLORS.primaryPurple}
                  strokeWidth="2.5"
                />
                <Line
                  x1="85"
                  y1="15"
                  x2="15"
                  y2="85"
                  stroke={COLORS.primaryPurple}
                  strokeWidth="2.5"
                />
              </Svg>
            )}
          </View>
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={15} color={COLORS.darkPurple} />
          </View>
        </TouchableOpacity>

        {/* Nama Akun + Tombol Pensil di Samping Kanan */}
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openEditNameModal}
            style={styles.editNameBtn}
            accessibilityRole="button"
            accessibilityLabel="Ubah nama akun"
          >
            <MaterialCommunityIcons
              name="pencil"
              size={15}
              color={COLORS.darkPurple}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.userEmail}>{displayEmail}</Text>
        <Text style={styles.visitCounterText}>{visitCounterMessage}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpenVisitHistory}
          style={styles.historyPillBtn}
          accessibilityRole="button"
          accessibilityLabel="Lihat Histori Kunjungan"
        >
          <Text style={styles.historyPillText}>Lihat Histori Kunjungan</Text>
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={COLORS.darkPurple}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Settings Menu */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <View {...panResponder.panHandlers} style={styles.dragHandleHitArea}>
          <View style={styles.dragHandle} />
        </View>

        {/* Menu: Preferensi Rekomendasi */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.menuRow}
          onPress={onOpenPreferences}
          accessibilityRole="button"
        >
          <View style={styles.menuLeft}>
            <Ionicons name="options" size={24} color={COLORS.primaryPurple} />
            <Text style={styles.menuLabel}>Preferensi Rekomendasi</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.darkPurple} />
        </TouchableOpacity>

        {/* Menu Item 1: Ganti Password */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.menuRow}
          onPress={openPasswordModal}
          accessibilityRole="button"
        >
          <View style={styles.menuLeft}>
            <View style={styles.passwordBadge}>
              <Text style={styles.passwordDots}>•••</Text>
            </View>
            <Text style={styles.menuLabel}>Ganti Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.darkPurple} />
        </TouchableOpacity>

        {/* Menu Item 2: Lihat Ulasan */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.menuRow}
          onPress={onOpenUserReviews}
          accessibilityRole="button"
        >
          <View style={styles.menuLeft}>
            <Ionicons name="star" size={24} color={COLORS.primaryPurple} />
            <Text style={styles.menuLabel}>Lihat Ulasan</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </Animated.View>

      {/* POP-UP KONFIRMASI LOGOUT */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLogoutModalVisible(false)}
        >
          <View
            style={styles.confirmCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.logoutWarnIconCircle}>
              <MaterialCommunityIcons
                name="exit-to-app"
                size={28}
                color="#B00020"
              />
            </View>

            <Text style={styles.confirmTitle}>Konfirmasi Logout</Text>
            <Text style={styles.confirmMessage}>Apakah anda ingin Logout?</Text>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setLogoutModalVisible(false)}
                style={styles.cancelPillBtn}
              >
                <Text style={styles.cancelPillText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setLogoutModalVisible(false);
                  onLogout?.();
                }}
                style={styles.dangerModalBtn}
              >
                <Text style={styles.primaryModalBtnText}>Ya</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* POP-UP 1: PILIH / UBAH FOTO PROFIL */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingPhoto && setPhotoModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => !isSavingPhoto && setPhotoModalVisible(false)}
        >
          <View
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Foto Profil</Text>
              <TouchableOpacity
                disabled={isSavingPhoto}
                onPress={() => setPhotoModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Pilih sumber gambar untuk foto profil akunmu.
            </Text>

            {isSavingPhoto ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primaryPurple} />
                <Text style={styles.loadingText}>Menyimpan foto profil...</Text>
              </View>
            ) : (
              <View style={styles.photoOptionsCol}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handlePickFromGallery}
                  style={styles.photoOptionBtn}
                >
                  <Ionicons
                    name="images-outline"
                    size={20}
                    color={COLORS.darkPurple}
                  />
                  <Text style={styles.photoOptionText}>Pilih dari Galeri</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleTakePhoto}
                  style={styles.photoOptionBtn}
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={COLORS.darkPurple}
                  />
                  <Text style={styles.photoOptionText}>Ambil Foto Kamera</Text>
                </TouchableOpacity>

                {avatarUri && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => saveAvatarToDatabase(null)}
                    style={[styles.photoOptionBtn, styles.removePhotoBtn]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#B00020"
                    />
                    <Text style={styles.removePhotoText}>Hapus Foto Profil</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* POP-UP 2: UBAH NAMA AKUN */}
      <Modal
        visible={editNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingName && setEditNameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.backdropTouchFill}
            activeOpacity={1}
            onPress={() => !isSavingName && setEditNameModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Ubah Nama Akun</Text>
              <TouchableOpacity
                disabled={isSavingName}
                onPress={() => setEditNameModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nama Lengkap</Text>
            <TextInput
              value={nameDraft}
              onChangeText={(text) => {
                setNameDraft(text);
                if (nameError) setNameError('');
              }}
              placeholder="Masukkan nama akun baru"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              autoFocus
              style={styles.textInput}
            />

            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSavingName}
                onPress={() => setEditNameModalVisible(false)}
                style={styles.cancelPillBtn}
              >
                <Text style={styles.cancelPillText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSavingName}
                onPress={handleSaveName}
                style={styles.primaryModalBtn}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryModalBtnText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POP-UP 3: GANTI PASSWORD */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingPassword && setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.backdropTouchFill}
            activeOpacity={1}
            onPress={() => !isSavingPassword && setPasswordModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Ganti Password</Text>
              <TouchableOpacity
                disabled={isSavingPassword}
                onPress={() => setPasswordModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            {/* Input 1: Password Lama */}
            <Text style={styles.inputLabel}>Password Lama</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                value={oldPassword}
                onChangeText={(text) => {
                  setOldPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Masukkan password lama"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showOldPw}
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <TouchableOpacity
                onPress={() => setShowOldPw((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showOldPw ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Input 2: Password Baru */}
            <Text style={styles.inputLabel}>Password Baru</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Minimal 8 karakter"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showNewPw}
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <TouchableOpacity
                onPress={() => setShowNewPw((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showNewPw ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Input 3: Konfirmasi Password Baru */}
            <Text style={styles.inputLabel}>Konfirmasi Password Baru</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                value={confirmNewPassword}
                onChangeText={(text) => {
                  setConfirmNewPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Ulangi password baru"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showConfirmPw}
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPw((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {!!passwordError && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSavingPassword}
                onPress={() => setPasswordModalVisible(false)}
                style={styles.cancelPillBtn}
              >
                <Text style={styles.cancelPillText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSavingPassword}
                onPress={handleSavePassword}
                style={styles.primaryModalBtn}
              >
                {isSavingPassword ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryModalBtnText}>Simpan Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: COLORS.primaryPurple,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingTop: 14,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.lavenderTint,
    borderWidth: 2.5,
    borderColor: '#9E7CE0',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '90%',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.white,
    flexShrink: 1,
  },
  editNameBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  visitCounterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  historyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  historyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.softLilacBg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingTop: 10,
    overflow: 'hidden',
  },
  dragHandleHitArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lavenderTint,
    marginBottom: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  passwordBadge: {
    backgroundColor: COLORS.primaryPurple,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  passwordDots: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  backdropTouchFill: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 20,
    elevation: 6,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 20,
    alignItems: 'center',
    elevation: 6,
  },
  logoutWarnIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  photoOptionsCol: {
    gap: 10,
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.softLilacBg,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  photoOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  removePhotoBtn: {
    backgroundColor: '#FFF0F2',
    borderColor: '#F5B7C0',
  },
  removePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B00020',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.softLilacBg,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.softLilacBg,
    paddingLeft: 14,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    color: '#B00020',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 8,
  },
  modalFooterRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  cancelPillBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  cancelPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  primaryModalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerModalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: '#B00020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryModalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.white,
  },
});