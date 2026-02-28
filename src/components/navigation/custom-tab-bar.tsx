import { AnimatedTabButton } from "@/components/navigation/animated-tab-button";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { VoiceAssistantModal } from "@/features/ai/components/voice-assistant-modal";
import { Colors } from "@/constants/theme";
import { useI18n, useTheme } from "@/contexts/app-selectors";
import { AnalyticsEvents, trackEvent } from "@/services/analytics";
import {
  Analytics01Icon,
  AiMicIcon,
  Settings02Icon,
  ShoppingBasket01Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS: Record<string, typeof Settings02Icon> = {
  index: Wallet03Icon,
  list: ShoppingBasket01Icon,
  statistics: Analytics01Icon,
  settings: Settings02Icon,
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const colorScheme = useTheme();
  const { t } = useI18n();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const middleIndex = Math.floor(state.routes.length / 2);
  const androidBottomPadding = Math.max(insets.bottom, 8);
  const tabLabels = {
    index: t.tabs.expenses,
    list: t.tabs.grocery,
    statistics: t.tabs.statistics,
    settings: t.tabs.settings,
  };

  const openVoiceModal = () => {
    setVoiceModalVisible((prev) => {
      if (!prev) {
        trackEvent(AnalyticsEvents.MODAL_OPENED, {
          modal: "voice_assistant",
        });
      }
      return true;
    });
  };

  const closeVoiceModal = () => {
    setVoiceModalVisible((prev) => {
      if (prev) {
        trackEvent(AnalyticsEvents.MODAL_CLOSED, {
          modal: "voice_assistant",
        });
      }
      return false;
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          paddingBottom:
            Platform.OS === "ios" ? insets.bottom : androidBottomPadding,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const icon = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
        const label =
          tabLabels[route.name as keyof typeof tabLabels] || route.name;

        const color = isFocused ? colors.tint : colors.textSecondary;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            trackEvent(AnalyticsEvents.TAB_CHANGED, {
              from_tab: state.routes[state.index]?.name,
              to_tab: route.name,
            });
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <React.Fragment key={route.key}>
            {index === middleIndex && (
              <View style={styles.voiceButtonWrapper}>
                <Pressable
                  haptic="none"
                  onPress={openVoiceModal}
                  style={({ pressed }) => [
                    styles.voiceButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.outline,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t.voice.title}
                >
                  <HugeiconsIcon
                    icon={AiMicIcon}
                    size={26}
                    color={colors.onPrimary}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>
            )}
            <AnimatedTabButton
              isActive={isFocused}
              icon={icon}
              label={label}
              color={color}
              onPress={onPress}
            />
          </React.Fragment>
        );
      })}
      <VoiceAssistantModal
        visible={voiceModalVisible}
        onClose={closeVoiceModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  voiceButtonWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
