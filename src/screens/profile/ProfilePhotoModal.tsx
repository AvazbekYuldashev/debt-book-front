import React, { useMemo } from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';

interface ProfilePhotoModalProps {
  visible: boolean;
  photoUri: string;
  error: string;
  onClose: () => void;
  onImageError: () => void;
}

/** Profil rasmini to'liq ekranda ko'rish oynasi. */
const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  visible,
  photoUri,
  error,
  onClose,
  onImageError,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const window = Dimensions.get('window');
  const imageSize = { width: window.width, height: window.height * 0.4 };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {photoUri ? (
          <View style={styles.center} pointerEvents="box-none">
            <View style={[styles.imageWrap, imageSize]}>
              <Image source={{ uri: photoUri }} style={styles.image} onError={onImageError} />
            </View>
          </View>
        ) : (
          <Text style={styles.text}>{t('profile.imageNotFound')}</Text>
        )}
        {error ? <Text style={styles.text}>{error}</Text> : null}
      </View>
    </Modal>
  );
};

const createStyles = (_theme: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      position: 'relative',
      backgroundColor: 'rgba(0,0,0,0.9)',
    },
    center: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    imageWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    text: {
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: 10,
    },
  });

export default ProfilePhotoModal;
