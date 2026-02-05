import AsyncStorage from "@react-native-async-storage/async-storage";
import { TemplateStorage } from "@/features/templates/services/template-storage";
import { GroceryTemplate } from "@/types/template";

const baseTemplate: Omit<
  GroceryTemplate,
  "id" | "createdAt" | "lastUsedAt" | "usageCount"
> = {
  userId: "default",
  productNameDisplay: "Milk",
  productNameNormalized: "milk",
  defaultQuantity: "1L",
  defaultPrice: 2.5,
  category: "dairy",
  source: "manual",
};

describe("template storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("creates and retrieves templates", async () => {
    const created = await TemplateStorage.create(baseTemplate);
    const all = await TemplateStorage.getAll();

    expect(created.id).toContain("template_");
    expect(created.usageCount).toBe(0);
    expect(all).toHaveLength(1);
    expect(all[0].createdAt).toBeInstanceOf(Date);
    expect(all[0].lastUsedAt).toBeInstanceOf(Date);
  });

  it("updates and increments usage", async () => {
    const created = await TemplateStorage.create(baseTemplate);
    await TemplateStorage.update(created.id, { defaultPrice: 3 });
    await TemplateStorage.incrementUsage(created.id);

    const updated = await TemplateStorage.getById(created.id);
    expect(updated?.defaultPrice).toBe(3);
    expect(updated?.usageCount).toBe(1);
  });

  it("finds matching templates and ranks them", async () => {
    await TemplateStorage.create(baseTemplate);
    await TemplateStorage.create({
      ...baseTemplate,
      productNameDisplay: "Brown Bread",
      productNameNormalized: "brown bread",
      category: "other",
    });

    const matches = await TemplateStorage.findMatching("milk");
    expect(matches[0].template.productNameNormalized).toBe("milk");
    expect(matches[0].rank).toBe(1);
  });
});
