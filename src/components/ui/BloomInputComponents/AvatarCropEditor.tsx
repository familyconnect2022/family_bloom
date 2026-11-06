import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import React, { useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { COLORS } from "../../../constants/theme";
import { AVATAR_BOX, AVATAR_OUTPUT, avatarCover, avatarCropRect, clamp, constrainAvatarOffset, type AvatarOffset } from "./avatarCropMath";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export type AvatarSourcePhoto = { uri: string; width: number; height: number };
type Props = { photo: AvatarSourcePhoto | null; onConfirm: (uri: string) => void; onCancel: () => void; onError: (message: string) => void };

/** Uses the original pixels for export. The crop window is exactly the same
 * as the on-screen 1:1 square, regardless of screen density or image aspect.
 */
export const AvatarCropEditor = ({ photo, onConfirm, onCancel, onError }: Props) => {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<AvatarOffset>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const live = useRef({ width: photo?.width || 1, height: photo?.height || 1, zoom, offset });
  live.current = { width: photo?.width || 1, height: photo?.height || 1, zoom, offset };
  const gestureStart = useRef({ zoom: 1, offset: { x: 0, y: 0 }, pinchDistance: 0, dx: 0, dy: 0 });
  const distance = (touches: any[]) => touches.length > 1
    ? Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY) : 0;
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const current = live.current;
      gestureStart.current = { zoom: current.zoom, offset: { ...current.offset }, pinchDistance: distance(event.nativeEvent.touches), dx: 0, dy: 0 };
    },
    onPanResponderMove: (event, gesture) => {
      const current = live.current;
      const began = gestureStart.current;
      const pinch = distance(event.nativeEvent.touches);
      if (pinch > 0 && began.pinchDistance === 0) {
        began.pinchDistance = pinch; began.zoom = current.zoom;
        began.offset = { ...current.offset }; began.dx = gesture.dx; began.dy = gesture.dy;
      }
      const nextZoom = pinch > 0 && began.pinchDistance > 0
        ? clamp(began.zoom * pinch / began.pinchDistance, 1, 4) : current.zoom;
      const nextOffset = constrainAvatarOffset(current.width, current.height, nextZoom,
        { x: began.offset.x + gesture.dx - began.dx, y: began.offset.y + gesture.dy - began.dy });
      live.current = { ...current, zoom: nextZoom, offset: nextOffset };
      setZoom(nextZoom);
      setOffset(nextOffset);
    },
    onPanResponderRelease: () => { gestureStart.current.pinchDistance = 0; },
  }), []);
  const adjustZoom = (change: number) => {
    const next = clamp(live.current.zoom + change, 1, 4);
    const nextOffset = constrainAvatarOffset(live.current.width, live.current.height, next, live.current.offset);
    live.current.zoom = next; live.current.offset = nextOffset;
    setZoom(next); setOffset(nextOffset);
  };
  const save = async () => {
    if (!photo || busy) return;
    setBusy(true);
    try {
      const rect = avatarCropRect(photo.width, photo.height, live.current.zoom, live.current.offset);
      const result = await ImageManipulator.manipulateAsync(photo.uri, [
        { crop: rect }, { resize: { width: AVATAR_OUTPUT, height: AVATAR_OUTPUT } },
      ], { format: ImageManipulator.SaveFormat.JPEG, compress: 0.87 });
      onConfirm(result.uri);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không thể cắt ảnh. Vui lòng thử lại.");
    } finally { setBusy(false); }
  };
  if (!photo) return null;
  const imageSize = avatarCover(photo.width, photo.height, zoom);
  return (
    <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={() => { if (!busy) onCancel(); }}>
      <View style={__a3_styles.overlay}>
        <View style={__a3_styles.sheet}>
          <View style={__a3_styles.heading}><Text style={__a3_styles.title}>Căn chỉnh avatar</Text>
            <Pressable accessibilityLabel="Hủy căn chỉnh" disabled={busy} onPress={onCancel}><Ionicons name="close" color={__a3Colors.primaryText} size={26}/></Pressable>
          </View>
          <Text style={__a3_styles.help}>Kéo ảnh, dùng hai ngón tay hoặc nút +/− để phóng to. Bloom sẽ lưu đúng vùng ảnh trong khung.</Text>
          <View style={__a3_styles.cropBox} {...panResponder.panHandlers}>
            <Image source={{ uri: photo.uri }} resizeMode="stretch" style={{
              position: "absolute", width: imageSize.width, height: imageSize.height,
              left: (AVATAR_BOX - imageSize.width) / 2 + offset.x,
              top: (AVATAR_BOX - imageSize.height) / 2 + offset.y,
            }}/>
            <View pointerEvents="none" style={__a3_styles.cropBorder}/>
          </View>
          <View style={__a3_styles.zoomControls}>
            <Pressable onPress={() => adjustZoom(-0.2)} accessibilityLabel="Thu nhỏ" style={__a3_styles.zoomButton}><Ionicons name="remove" size={23} color={__a3Colors.primaryText}/></Pressable>
            <Text style={__a3_styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            <Pressable onPress={() => adjustZoom(0.2)} accessibilityLabel="Phóng to" style={__a3_styles.zoomButton}><Ionicons name="add" size={23} color={__a3Colors.primaryText}/></Pressable>
          </View>
          <View style={__a3_styles.actions}>
            <Pressable disabled={busy} onPress={onCancel} style={[__a3_styles.action, __a3_styles.cancel]}><Text style={__a3_styles.cancelLabel}>Hủy</Text></Pressable>
            <Pressable disabled={busy} onPress={() => void save()} style={[__a3_styles.action, __a3_styles.confirm]}>
              {busy ? <ActivityIndicator color="white"/> : <Ionicons name="checkmark" size={18} color="white"/>}
              <Text style={__a3_styles.confirmLabel}>{busy ? "Đang lưu ảnh…" : "Dùng ảnh này"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const styles = createBloomStyles(() => StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(24,21,32,.54)" },
  sheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 38, alignItems: "center" },
  heading: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 20, color: COLORS.primaryText, fontWeight: "900" },
  help: { color: COLORS.secondaryText, lineHeight: 19, fontSize: 12, marginBottom: 18, alignSelf: "stretch" },
  cropBox: { width: AVATAR_BOX, height: AVATAR_BOX, overflow: "hidden", backgroundColor: COLORS.softSurface, borderRadius: 24 },
  cropBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: COLORS.border, borderRadius: 24 },
  zoomControls: { marginTop: 17, flexDirection: "row", alignItems: "center", gap: 30 },
  zoomButton: { width: 46, height: 40, borderRadius: 15, backgroundColor: COLORS.softSurface, justifyContent: "center", alignItems: "center" },
  zoomText: { fontSize: 15, color: COLORS.primaryText, fontWeight: "800" },
  actions: { flexDirection: "row", marginTop: 20, gap: 10, alignSelf: "stretch" },
  action: { flex: 1, minHeight: 48, borderRadius: 17, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 7 },
  cancel: { backgroundColor: COLORS.softSurface }, confirm: { backgroundColor: COLORS.primary, flex: 1.5 },
  cancelLabel: { color: COLORS.primaryText, fontWeight: "800" }, confirmLabel: { color: COLORS.onPrimary, fontWeight: "800" },
}));
