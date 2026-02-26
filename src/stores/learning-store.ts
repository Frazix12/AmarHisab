import { create } from "zustand";
import {
  trackEvent,
  setSuperProperties,
  AnalyticsEvents,
} from "@/services/analytics";
import { GroceryTemplate, LearningCandidate } from "@/types/template";
import { useGroceryStore } from "@/stores/grocery-store";
import { useTemplateStore } from "@/stores/template-store";

type TemplateLearnerModule = typeof import("@/features/templates/services/template-learner");
let templateLearnerModulePromise: Promise<TemplateLearnerModule> | null = null;

async function getTemplateLearner(): Promise<TemplateLearnerModule["TemplateLearner"]> {
  if (!templateLearnerModulePromise) {
    templateLearnerModulePromise = import("@/features/templates/services/template-learner");
  }
  const module = await templateLearnerModulePromise;
  return module.TemplateLearner;
}

interface LearningState {
  smartSuggestionsEnabled: boolean;
  checkForSuggestions: () => Promise<LearningCandidate | null>;
  acceptSuggestion: (candidate: LearningCandidate) => Promise<GroceryTemplate>;
  dismissSuggestion: (normalizedName: string, forever: boolean) => Promise<void>;
  toggleSmartSuggestions: () => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  smartSuggestionsEnabled: true,

  checkForSuggestions: async () => {
    if (!get().smartSuggestionsEnabled) return null;
    const TemplateLearner = await getTemplateLearner();
    return await TemplateLearner.detectLearningCandidates(
      useGroceryStore.getState().groceryItems,
    );
  },

  acceptSuggestion: async (candidate) => {
    const newTemplate = await useTemplateStore.getState().addTemplate({
      userId: "default",
      productNameDisplay: candidate.productName,
      productNameNormalized: candidate.productNameNormalized,
      defaultQuantity: candidate.defaultQuantity,
      defaultPrice: candidate.defaultPrice,
      category: candidate.category,
      source: "learned",
    });

    const TemplateLearner = await getTemplateLearner();
    await TemplateLearner.recordSuggestion(candidate.productNameNormalized);

    return newTemplate;
  },

  dismissSuggestion: async (normalizedName, forever) => {
    const TemplateLearner = await getTemplateLearner();
    if (forever) {
      await TemplateLearner.dismissForever(normalizedName);
    } else {
      await TemplateLearner.recordSuggestion(normalizedName);
    }
  },

  toggleSmartSuggestions: () => {
    set((state) => {
      const next = !state.smartSuggestionsEnabled;
      trackEvent(AnalyticsEvents.SETTING_CHANGED, {
        setting_name: "smart_suggestions",
        new_value: next,
      });
      setSuperProperties({
        smart_suggestions_enabled: next,
      });
      return { smartSuggestionsEnabled: next };
    });
  },
}));
