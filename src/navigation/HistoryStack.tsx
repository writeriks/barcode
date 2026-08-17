import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { useThemeColors } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';
import type { HistoryStackParamList } from './types';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  const { t } = useTranslation();
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
      {/* The back label has to be set here: the list's own header is
          hidden, so it has no title for react-navigation to borrow, and it
          was falling back to the route name — users saw "HistoryList". */}
      <Stack.Screen
        name="HistoryDetail"
        component={HistoryDetailScreen}
        options={{ title: '', headerBackTitle: t('history.title') }}
      />
    </Stack.Navigator>
  );
}
