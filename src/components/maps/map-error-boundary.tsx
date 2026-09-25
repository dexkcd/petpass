"use client";

import { Component, type ReactNode } from "react";
import { reportClientError } from "@/lib/report-client-error";

/** Keeps a map failure from taking the rest of the page down with it. */
export class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportClientError({ kind: "map-boundary", message: error.message, stack: error.stack });
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
