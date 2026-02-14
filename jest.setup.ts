import "@testing-library/jest-native/extend-expect";
import "react-native-gesture-handler/jestSetup";

jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { FlatList } = require("react-native");

  const FlashList = ({
    estimatedItemSize,
    estimatedListSize,
    overrideItemLayout,
    getItemType,
    ...props
  }: {
    estimatedItemSize?: number;
    estimatedListSize?: { height: number; width: number };
    overrideItemLayout?: unknown;
    getItemType?: unknown;
    [key: string]: unknown;
  }) =>
    React.createElement(FlatList, props);

  return {
    __esModule: true,
    FlashList,
  };
});

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(async () => {}),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => {}),
}));

jest.mock("expo-router", () => {
  const React = require("react");

  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  Stack.Screen = () => null;

  const Tabs = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  Tabs.Screen = () => null;

  const Link = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  return {
    Stack,
    Tabs,
    Link,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
  };
});

jest.mock("@hugeicons/react-native", () => ({
  HugeiconsIcon: () => null,
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
