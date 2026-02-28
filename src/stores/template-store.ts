import { create } from "zustand";
import { normalizeProductName } from "@/features/templates/services/template-utils";
import { trackEvent, AnalyticsEvents } from "@/services/analytics";
import { GroceryItem } from "@/types";
import { GroceryTemplate, TemplateMatch } from "@/types/template";

type TemplateStorageModule = typeof import("@/features/templates/services/template-storage");
let templateStorageModulePromise: Promise<TemplateStorageModule> | null = null;

async function getTemplateStorage(): Promise<TemplateStorageModule["TemplateStorage"]> {
  if (!templateStorageModulePromise) {
    templateStorageModulePromise = import("@/features/templates/services/template-storage");
  }
  const module = await templateStorageModulePromise;
  return module.TemplateStorage;
}

interface TemplateState {
  templates: GroceryTemplate[];
  addTemplate: (
    template: Omit<
      GroceryTemplate,
      "id" | "createdAt" | "lastUsedAt" | "usageCount"
    >,
  ) => Promise<GroceryTemplate>;
  updateTemplate: (id: string, updates: Partial<GroceryTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  findMatchingTemplates: (input: string) => Promise<TemplateMatch[]>;
  applyTemplate: (templateId: string) => Promise<Partial<GroceryItem> | null>;
  /** Internal: called by AppProvider after DB load */
  _setTemplates: (templates: GroceryTemplate[]) => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],

  _setTemplates: (templates) => {
    set({ templates });
  },

  addTemplate: async (template) => {
    const TemplateStorage = await getTemplateStorage();
    const newTemplate = await TemplateStorage.create(template);
    set((state) => ({ templates: [...state.templates, newTemplate] }));

    trackEvent(AnalyticsEvents.TEMPLATE_CREATED, {
      template_id: newTemplate.id,
      category: newTemplate.category,
      source: newTemplate.source,
      has_default_price: Number(newTemplate.defaultPrice) > 0,
      has_default_quantity: !!newTemplate.defaultQuantity,
    });

    return newTemplate;
  },

  updateTemplate: async (id, updates) => {
    const TemplateStorage = await getTemplateStorage();
    await TemplateStorage.update(id, updates);
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    trackEvent(AnalyticsEvents.TEMPLATE_UPDATED, {
      template_id: id,
      updated_fields: Object.keys(updates),
    });
  },

  deleteTemplate: async (id) => {
    const TemplateStorage = await getTemplateStorage();
    await TemplateStorage.delete(id);
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));

    trackEvent(AnalyticsEvents.TEMPLATE_DELETED, {
      template_id: id,
    });
  },

  findMatchingTemplates: async (input) => {
    const normalized = normalizeProductName(input);
    const TemplateStorage = await getTemplateStorage();
    return await TemplateStorage.findMatching(normalized);
  },

  applyTemplate: async (templateId) => {
    const TemplateStorage = await getTemplateStorage();
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return null;

    await TemplateStorage.incrementUsage(templateId);
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === templateId
          ? { ...t, usageCount: t.usageCount + 1, lastUsedAt: new Date() }
          : t,
      ),
    }));

    trackEvent(AnalyticsEvents.TEMPLATE_APPLIED, {
      template_id: templateId,
      category: template.category,
      source: template.source,
    });

    return {
      name: template.productNameDisplay,
      nameNormalized: template.productNameNormalized,
      quantity: template.defaultQuantity,
      price: template.defaultPrice,
      category: template.category,
      templateId: template.id,
    };
  },
}));
