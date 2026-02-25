import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from "react-native";
import { Colors } from "@/constants/theme";
import { captureError } from "@/services/analytics";

const sanitizeStack = (value: string | null | undefined): string => {
  if (!value) return "";
  return value.replace(/\s+$/g, "").slice(0, 2000);
};

const getErrorBoundaryTheme = (scheme: "light" | "dark") => {
  const fallback = Colors.light;
  const theme = Colors[scheme] ?? fallback;

  const colorOrFallback = (
    color: string | undefined,
    fallbackColor: string,
  ): string => color ?? fallbackColor;

  return {
    surface: colorOrFallback(theme.surface, fallback.surface),
    textSecondary: colorOrFallback(theme.textSecondary, fallback.textSecondary),
    text: colorOrFallback(theme.text, fallback.text),
    primary: colorOrFallback(theme.primary, fallback.primary),
    onPrimary: colorOrFallback(theme.onPrimary, fallback.onPrimary),
    surfaceVariant: colorOrFallback(theme.surfaceVariant, fallback.surfaceVariant),
    error: colorOrFallback(theme.error, fallback.error),
  };
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to analytics/error tracking service
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    const sanitized = new Error(error.name || "Error");
    const stackWithoutMessageLine = (error.stack ?? "")
      .split("\n")
      .slice(1)
      .join("\n");
    sanitized.stack = sanitizeStack(stackWithoutMessageLine);

    captureError(sanitized, {
      context: "error_boundary",
      component_stack: sanitizeStack(errorInfo.componentStack),
    });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default fallback UI for error boundary
 */
function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = getErrorBoundaryTheme(colorScheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.error }]}> 
          Something went wrong
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}> 
          We are sorry, but something unexpected happened. Please try again.
        </Text>
        {__DEV__ && error && (
          <View style={[styles.errorBox, { backgroundColor: colors.surfaceVariant }]}> 
            <Text
              style={[styles.errorText, { color: colors.text }]}
              selectable
              numberOfLines={5}
            >
              {error.message}
            </Text>
          </View>
        )}
        <Pressable
          onPress={onRetry}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}> 
            Try Again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Hook-friendly wrapper for using error boundary with functional components
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    maxWidth: 320,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: "100%",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
