import Animated from 'react-native-reanimated';

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '0%': { transform: [{ rotateZ: '0deg' }] },
          '50%': { transform: [{ rotateZ: '25deg' }] },
          '100%': { transform: [{ rotateZ: '0deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}
