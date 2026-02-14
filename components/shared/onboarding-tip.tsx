import { useApp } from "@/contexts/app-context";
import { showHint } from "@/services/notifications";
import {
  loadOnboardingTipDismissed,
  saveOnboardingTipDismissed,
} from "@/services/storage";
import React, { useEffect } from "react";

interface OnboardingTipProps {
  screenKey: "expenses" | "grocery";
}

export const OnboardingTip: React.FC<OnboardingTipProps> = ({ screenKey }) => {
  const { t } = useApp();
  const tipMessage =
    t.tips?.longPressTip || "Long-press an item to edit or delete it quickly.";

  useEffect(() => {
    let isActive = true;

    const showTipIfNeeded = async () => {
      try {
        const dismissed = await loadOnboardingTipDismissed(screenKey);
        if (!isActive || dismissed) {
          return;
        }

        showHint(tipMessage);
        await saveOnboardingTipDismissed(screenKey);
      } catch (error) {
        console.error("Failed to handle onboarding tip:", error);
      }
    };

    void showTipIfNeeded();

    return () => {
      isActive = false;
    };
  }, [screenKey, tipMessage]);

  return null;
};
