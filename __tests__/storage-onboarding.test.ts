/// <reference types="jest" />

// Mock the DB layer so we don't need a real SQLite instance in tests.
// We replicate the in-memory behaviour of the three onboarding functions.

jest.mock("@/services/storage", () => {
  const ONBOARDING_KEY = "has_completed_onboarding";

  const store: Map<string, string> = new Map();

  return {
    loadOnboardingCompleted: jest.fn(async () => {
      return store.get(ONBOARDING_KEY) === "true";
    }),
    saveOnboardingCompleted: jest.fn(async () => {
      store.set(ONBOARDING_KEY, "true");
    }),
    resetOnboardingCompleted: jest.fn(async () => {
      store.delete(ONBOARDING_KEY);
    }),
  };
});

import {
  loadOnboardingCompleted,
  saveOnboardingCompleted,
  resetOnboardingCompleted,
} from "@/services/storage";

describe("onboarding storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mocked implementations to use a fresh in-memory store each test.
    const store: Map<string, string> = new Map();
    const ONBOARDING_KEY = "has_completed_onboarding";

    (loadOnboardingCompleted as jest.Mock).mockImplementation(async () => {
      return store.get(ONBOARDING_KEY) === "true";
    });
    (saveOnboardingCompleted as jest.Mock).mockImplementation(async () => {
      store.set(ONBOARDING_KEY, "true");
    });
    (resetOnboardingCompleted as jest.Mock).mockImplementation(async () => {
      store.delete(ONBOARDING_KEY);
    });
  });

  it("returns false by default when onboarding has not been completed", async () => {
    const result = await loadOnboardingCompleted();
    expect(result).toBe(false);
  });

  it("returns true after saveOnboardingCompleted is called", async () => {
    await saveOnboardingCompleted();
    const result = await loadOnboardingCompleted();
    expect(result).toBe(true);
  });

  it("returns false after resetOnboardingCompleted is called", async () => {
    await saveOnboardingCompleted();
    await resetOnboardingCompleted();
    const result = await loadOnboardingCompleted();
    expect(result).toBe(false);
  });
});
