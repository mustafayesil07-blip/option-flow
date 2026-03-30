import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT } from '../constants/theme';
import DashboardScreen    from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import BudgetScreen       from '../screens/BudgetScreen';
import AnalysisScreen     from '../screens/AnalysisScreen';
import GoalsScreen        from '../screens/GoalsScreen';

const Tab = createBottomTabNavigator();

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const TABS: {
  name: string;
  label: string;
  icon: FeatherIconName;
  component: React.ComponentType<any>;
}[] = [
  { name: 'Dashboard',    label: 'Home',     icon: 'home',        component: DashboardScreen    },
  { name: 'Transactions', label: 'Wallet',   icon: 'credit-card', component: TransactionsScreen },
  { name: 'Budget',       label: 'Budget',   icon: 'target',      component: BudgetScreen       },
  { name: 'Analysis',     label: 'Analysis', icon: 'bar-chart-2', component: AnalysisScreen     },
  { name: 'Goals',        label: 'Goals',    icon: 'flag',        component: GoalsScreen        },
];

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={S.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const focused     = state.index === index;
        const tab         = TABS[index];

        return (
          <TouchableOpacity
            key={route.key}
            style={S.tabItem}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
          >
            <View style={[S.tabIconWrap, focused && S.tabIconWrapActive]}>
              <Feather
                name={tab.icon}
                size={20}
                color={focused ? COLORS.primary : COLORS.textMuted}
              />
            </View>
            <Text style={[S.tabLabel, focused && S.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const S = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabIconWrap: {
    width: 40, height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: COLORS.primaryDim,
  },
  tabLabel: {
    color: COLORS.textMuted,
    fontSize: FONT.xs,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
