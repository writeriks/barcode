import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { HistoryStackParamList } from './types';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.cabinet },
        headerTintColor: colors.cream,
        headerTitleStyle: { fontFamily: fonts.displayBold },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="HistoryList" component={HistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
