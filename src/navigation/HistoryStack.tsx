import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { useThemeColors } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';
import type { HistoryStackParamList } from './types';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.cabinet },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.displayBold },
        headerShadowVisible: false,
        animation: 'fade',
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="HistoryList" component={HistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
