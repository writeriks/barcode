import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { fitContainer, ResumableZoom, useImageResolution } from 'react-native-zoom-toolkit';

interface Props {
  uri: string;
}

/** Fullscreen scanned-page zoom via react-native-zoom-toolkit's ResumableZoom. */
export function ZoomableImage({ uri }: Props) {
  const { width, height } = useWindowDimensions();
  const { isFetching, resolution } = useImageResolution({ uri });

  if (isFetching || resolution === undefined) {
    return <View style={styles.fill} />;
  }

  const size = fitContainer(resolution.width / resolution.height, { width, height });

  return (
    <ResumableZoom maxScale={resolution} extendGestures>
      <Image source={{ uri }} style={size} resizeMethod="scale" />
    </ResumableZoom>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#000',
  },
});
