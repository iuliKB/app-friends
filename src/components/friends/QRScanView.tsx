import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
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
    borderRadius: 12,
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
    borderColor: COLORS.accent,
    borderRadius: 8,
  },
  hint: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  permissionBody: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionButton: {
    alignSelf: 'stretch',
    marginTop: 24,
    marginHorizontal: 24,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.destructive,
    textAlign: 'center',
    marginTop: 16,
  },
  scanAgainButton: {
    marginTop: 16,
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});
