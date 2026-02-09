import React from "react";
import { StyleSheet, Text } from "react-native";

let currentLanguage = "en";
let isPatched = false;

const getAdjustedLineHeight = (
  fontSize: number,
  baseLineHeight?: number,
) => {
  if (currentLanguage !== "bn") return baseLineHeight;

  const minLineHeight = Math.ceil(fontSize * 1.6);
  if (typeof baseLineHeight === "number") {
    return Math.max(baseLineHeight, minLineHeight);
  }

  return minLineHeight;
};

export const setTextMetricsLanguage = (language: string) => {
  currentLanguage = language;
};

export const ensureTextMetricsPatched = () => {
  if (isPatched) return;

  const TextAny = Text as unknown as {
    render: (props: unknown, ref: unknown) => React.ReactElement;
  };
  const defaultRender = TextAny.render;

  TextAny.render = function render(props: unknown, ref: unknown) {
    const origin = defaultRender.call(this, props, ref) as React.ReactElement;
    const originProps = origin.props as { style?: unknown };
    const flattened = (StyleSheet.flatten(originProps.style) || {}) as {
      fontSize?: number;
      lineHeight?: number;
    };
    const fontSize = flattened.fontSize ?? 14;
    const baseLineHeight = flattened.lineHeight;
    const adjustedLineHeight = getAdjustedLineHeight(fontSize, baseLineHeight);

    if (
      currentLanguage !== "bn" ||
      adjustedLineHeight === baseLineHeight ||
      typeof adjustedLineHeight !== "number"
    ) {
      return origin;
    }

    return React.cloneElement(origin as React.ReactElement<any>, {
      style: [originProps.style, { lineHeight: adjustedLineHeight }],
    });
  };

  isPatched = true;
};
