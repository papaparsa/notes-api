import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { absoluteUrl } from '../../../lib/api';

export default function ResponsiveImage({ src, alt, onPress, maxSize = 600, compact }) {
  const uri = absoluteUrl(src);
  const { width: sw, height: sh } = useWindowDimensions();
  const [ratio, setRatio] = useState(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => alive && h && setRatio(w / h),
      () => alive && setRatio(4 / 3),
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  const r = ratio || 4 / 3;
  const limit = compact ? 160 : maxSize;
  let width = Math.min(limit, sw - 64);
  let height = width / r;
  if (height > limit) {
    height = limit;
    width = height * r;
  }
  const fw = Math.min(sw * 0.9, sh * 0.9 * r);

  return (
    <View style={{ width: '100%', alignItems: 'center', marginVertical: 4 }}>
      <Pressable onPress={onPress || (() => setFull(true))} accessibilityLabel={alt || 'image'}>
        <Image source={{ uri }} style={{ width, height }} resizeMode="contain" accessibilityLabel={alt} />
      </Pressable>
      <Modal visible={full} transparent animationType="fade" onRequestClose={() => setFull(false)}>
        <Pressable onPress={() => setFull(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' }}>
          <Image source={{ uri }} style={{ width: fw, height: fw / r }} resizeMode="contain" />
        </Pressable>
      </Modal>
    </View>
  );
}
