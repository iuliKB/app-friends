import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface QRScanViewProps {
  onScanned: (uuid: string) => void;
}

export function QRScanView({ onScanned }: QRScanViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  function handleScanAgain() {
    setScanned(false);
    setScanError(null);
  }

  if (!permission) {
    return <View style={styles.permissionContainer} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={COLORS.border} />
        <Text style={styles.permissionHeading}>Camera access needed</Text>
        <Text style={styles.permissionBody}>Allow camera access to scan QR codes.</Text>
        <View style={styles.permissionButton}>
          <PrimaryButton title="Grant Access" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  if (scanError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{scanError}</Text>
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={handleScanAgain}
          activeOpacity={0.8}
        >
          <Text style={styles.scanAgainText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            scanned
              ? undefined
              : (result) => {
                  setScanned(true);
                  const data = result.data;
                  if (!UUID_REGEX.test(data)) {
                    setScanError('QR code not recognized. Try again.');
                    return;
                  }
                  onScanned(data);
                }
          }
        />
        {/* Scan frame overlay */}
        <View style={styles.overlayContainer} pointerEvents="none">
          <View style={styles.scanFrame} />
        </View>
      </View>
      <Text style={styles.hint}>
        Ask your friend to show their QR code (found on their Profile tab)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  cameraContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderRadius: RADII.lg,
    overflow: 'hidden',
  },
  camera: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: COLORS.interactive.accent,
    borderRadius: RADII.md,
  },
  hint: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  permissionHeading: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  permissionBody: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  permissionButton: {
    alignSelf: 'stretch',
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.xl,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.destructive,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  scanAgainButton: {
    marginTop: SPACING.lg,
    height: 44,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
});
