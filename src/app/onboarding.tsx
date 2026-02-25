import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Wallet03Icon,
  ShoppingCart01Icon,
  AiVoiceIcon,
} from "@hugeicons/core-free-icons";
import { useApp } from "@/contexts/app-context";
import { Colors, Fonts } from "@/constants/theme";
import { saveOnboardingCompleted } from "@/services/storage";
import { trackEvent, AnalyticsEvents } from "@/services/analytics";
import { WelcomeStep } from "@/features/onboarding/components/welcome-step";
import { LanguageStep } from "@/features/onboarding/components/language-step";
import { ThemeStep } from "@/features/onboarding/components/theme-step";
import { CurrencyStep } from "@/features/onboarding/components/currency-step";
import { FeatureSlide } from "@/features/onboarding/components/feature-slide";
import { DoneStep } from "@/features/onboarding/components/done-step";
import { DotIndicators } from "@/features/onboarding/components/dot-indicators";

const STEPS = [
  "welcome",
  "language",
  "theme",
  "currency",
  "feature-expenses",
  "feature-grocery",
  "feature-ai",
  "done",
] as const;
// StepName type available for future use

export default function OnboardingScreen() {
  const { colorScheme, t } = useApp();
  const colors = Colors[colorScheme];
  const [currentStep, setCurrentStep] = useState(0);
  const startTimeRef = useRef(Date.now());
  const trackedStepsRef = useRef<Set<number>>(new Set());

  // Track onboarding start on mount
  useEffect(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_STARTED);
  }, []);

  // Track step views
  useEffect(() => {
    if (trackedStepsRef.current.has(currentStep)) return;
    trackedStepsRef.current.add(currentStep);
    trackEvent(AnalyticsEvents.ONBOARDING_STEP_VIEWED, {
      step: STEPS[currentStep],
      step_index: currentStep,
    });
  }, [currentStep]);

  // Android back button handler
  useEffect(() => {
    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (currentStep === 0) {
          BackHandler.exitApp();
          return true;
        }
        setCurrentStep((prev) => prev - 1);
        return true;
      }
    );
    return () => handler.remove();
  }, [currentStep]);

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleSkip = async () => {
    trackEvent(AnalyticsEvents.ONBOARDING_SKIPPED, {
      skipped_at_step: STEPS[currentStep],
      step_index: currentStep,
    });
    await saveOnboardingCompleted();
    router.replace("/(tabs)");
  };

  const handleComplete = async () => {
    trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED, {
      total_duration_ms: Date.now() - startTimeRef.current,
    });
    await saveOnboardingCompleted();
    router.replace("/(tabs)");
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Step content */}
        <View style={styles.contentArea}>
          {currentStep === 0 && <WelcomeStep isActive={currentStep === 0} />}
          {currentStep === 1 && <LanguageStep isActive={currentStep === 1} />}
          {currentStep === 2 && <ThemeStep isActive={currentStep === 2} />}
          {currentStep === 3 && <CurrencyStep isActive={currentStep === 3} />}
          {currentStep === 4 && (
            <FeatureSlide
              icon={Wallet03Icon}
              title={t.onboarding.featureExpensesTitle}
              body={t.onboarding.featureExpensesBody}
              isActive={currentStep === 4}
            />
          )}
          {currentStep === 5 && (
            <FeatureSlide
              icon={ShoppingCart01Icon}
              title={t.onboarding.featureGroceryTitle}
              body={t.onboarding.featureGroceryBody}
              isActive={currentStep === 5}
            />
          )}
          {currentStep === 6 && (
            <FeatureSlide
              icon={AiVoiceIcon}
              title={t.onboarding.featureAiTitle}
              body={t.onboarding.featureAiBody}
              isActive={currentStep === 6}
            />
          )}
          {currentStep === 7 && (
            <DoneStep isActive={currentStep === 7} onComplete={handleComplete} />
          )}
        </View>

        {/* Navigation area — hidden on Done step (DoneStep has its own button) */}
        {!isLastStep && (
          <View style={styles.navigationArea}>
            <DotIndicators currentStep={currentStep} totalSteps={STEPS.length} />
            <Pressable
              onPress={handleNext}
              style={[
                styles.nextButton,
                { backgroundColor: colors.primary },
              ]}
              accessibilityLabel={
                currentStep === 0
                  ? t.onboarding.getStarted
                  : t.onboarding.next
              }
              accessibilityRole="button"
            >
              <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>
                {currentStep === 0
                  ? t.onboarding.getStarted
                  : t.onboarding.next}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSkip}
              accessibilityLabel={t.onboarding.skip}
              accessibilityRole="button"
            >
              <Text style={[styles.skipText, { color: colors.textTertiary }]}>
                {t.onboarding.skip}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  navigationArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: "center",
    gap: 16,
  },
  nextButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Fonts.sans,
  },
  skipText: {
    fontSize: 14,
  },
});
