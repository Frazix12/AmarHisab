import { TemplateLearner } from "@/features/templates/services/template-learner";
import { GroceryItem } from "@/types";

jest.mock("@/features/templates/services/template-storage", () => ({
  TemplateStorage: {
    getAll: jest.fn(),
  },
}));

jest.mock("@/features/templates/services/learning-storage", () => ({
  LearningStorage: {
    getTelemetry: jest.fn(),
    updateTelemetry: jest.fn(),
    recordSuggestion: jest.fn(),
    markDismissedForever: jest.fn(),
  },
}));

const buildItem = (overrides: Partial<GroceryItem>): GroceryItem => ({
  id: overrides.id || "1",
  name: overrides.name || "Milk",
  nameNormalized: overrides.nameNormalized || "milk",
  quantity: overrides.quantity || "1L",
  price: overrides.price ?? 2,
  checked: overrides.checked ?? false,
  category: overrides.category || "dairy",
  createdAt: overrides.createdAt || new Date(),
  expenseId: overrides.expenseId,
  templateId: overrides.templateId,
});

describe("template learner", () => {
  beforeEach(() => {
    const { TemplateStorage } = jest.requireMock(
      "@/features/templates/services/template-storage",
    );
    const { LearningStorage } = jest.requireMock(
      "@/features/templates/services/learning-storage",
    );

    TemplateStorage.getAll.mockResolvedValue([]);
    LearningStorage.getTelemetry.mockResolvedValue(null);
    LearningStorage.updateTelemetry.mockResolvedValue(undefined);
  });

  it("detects learning candidates", async () => {
    const items: GroceryItem[] = [
      buildItem({ id: "1" }),
      buildItem({ id: "2" }),
      buildItem({ id: "3" }),
    ];

    const candidate = await TemplateLearner.detectLearningCandidates(items);
    expect(candidate?.productNameNormalized).toBe("milk");
    expect(candidate?.occurrences).toBe(3);
  });

  it("tracks grocery item telemetry", async () => {
    const { LearningStorage } = jest.requireMock(
      "@/features/templates/services/learning-storage",
    );

    await TemplateLearner.trackGroceryItem(buildItem({ id: "4" }));
    expect(LearningStorage.updateTelemetry).toHaveBeenCalled();
  });
});
