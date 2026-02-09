import React from "react";
import { StyleSheet, Text } from "react-native";

type TextRender = (props: unknown, ref: unknown) => React.ReactElement;
interface TextElementProps {
  style?: unknown;
}

class TextMetricsManager {
  private language = "en";
  private patched = false;
  private originalRender: TextRender | null = null;

  getLanguage() {
    return this.language;
  }

  setLanguage(language: string) {
    this.language = language;
  }

  isPatched() {
    return this.patched;
  }

  markPatched(originalRender: TextRender) {
    if (!this.originalRender) {
      this.originalRender = originalRender;
    }
    this.patched = true;
  }

  getOriginalRender() {
    return this.originalRender;
  }

  reset() {
    this.language = "en";
    this.patched = false;
    this.originalRender = null;
  }
}

const textMetricsManager = new TextMetricsManager();

const getAdjustedLineHeight = (
  fontSize: number,
  baseLineHeight?: number,
) => {
  if (textMetricsManager.getLanguage() !== "bn") return baseLineHeight;

  const minLineHeight = Math.ceil(fontSize * 1.6);
  if (typeof baseLineHeight === "number") {
    return Math.max(baseLineHeight, minLineHeight);
  }

  return minLineHeight;
};

export const setTextMetricsLanguage = (language: string) => {
  textMetricsManager.setLanguage(language);
};

export const resetTextMetrics = () => {
  const TextAny = Text as unknown as {
    render: TextRender;
  };

  const originalRender = textMetricsManager.getOriginalRender();
  if (originalRender) {
    TextAny.render = originalRender;
  }

  textMetricsManager.reset();
};

export const ensureTextMetricsPatched = () => {
  if (textMetricsManager.isPatched()) return;

  const TextAny = Text as unknown as {
    render: TextRender;
  };
  const defaultRender = TextAny.render;
  textMetricsManager.markPatched(defaultRender);

  TextAny.render = function render(props: unknown, ref: unknown) {
    let origin: React.ReactElement<TextElementProps> | null = null;

    try {
      origin = defaultRender.call(this, props, ref) as React.ReactElement<TextElementProps>;
      const originProps = origin.props;
      const flattened = (StyleSheet.flatten(originProps.style) || {}) as {
        fontSize?: number;
        lineHeight?: number;
      };
      const fontSize = flattened.fontSize ?? 14;
      const baseLineHeight = flattened.lineHeight;
      const adjustedLineHeight = getAdjustedLineHeight(fontSize, baseLineHeight);

      if (
        textMetricsManager.getLanguage() !== "bn" ||
        adjustedLineHeight === baseLineHeight ||
        typeof adjustedLineHeight !== "number"
      ) {
        return origin;
      }

      return React.cloneElement(origin, {
        style: [originProps.style, { lineHeight: adjustedLineHeight }],
      });
    } catch (error) {
      console.error("Failed to adjust Text metrics", error);
      return origin ?? defaultRender.call(this, props, ref);
    }
  };
};
