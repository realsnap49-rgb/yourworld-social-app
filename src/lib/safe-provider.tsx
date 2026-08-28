import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches render errors from a single provider subtree so one broken
 * provider (Realtime, calls, moments, etc.) does NOT take down the whole
 * app with a generic "This page didn't load" screen.
 *
 * On error it renders `null` (the provider's data is just unavailable) and
 * logs the failure so we can diagnose it later.
 */
export class SafeProvider extends Component<
  { name: string; children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SafeProvider:${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
