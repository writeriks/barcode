import { Button, StyleSheet, Text, View } from 'react-native';

interface Props {
  message: string;
  onRetry: () => void;
  onScanAgain: () => void;
}

export function LookupErrorScreen({ message, onRetry, onScanAgain }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lookup failed</Text>
      <Text style={styles.body}>{message}</Text>
      <View style={styles.actions}>
        <Button title="Retry" onPress={onRetry} />
        <Button title="Scan another product" onPress={onScanAgain} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    color: '#444',
  },
  actions: {
    marginTop: 16,
    gap: 12,
    alignSelf: 'stretch',
  },
});
