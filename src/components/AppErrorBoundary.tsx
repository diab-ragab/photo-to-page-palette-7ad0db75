import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Global UI crash guard: prevents a blank screen if any component throws.
 * Keep the UI generic (no sensitive error details) for production safety.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Avoid leaking details in production; keep a minimal breadcrumb for dev.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("UI crash caught by AppErrorBoundary", error);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="w-full max-w-lg p-6 border-border/60 bg-card/95 backdrop-blur">
          <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The UI crashed while loading. Reload the page to recover.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={this.handleReload}>Reload</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}
            >
              Go Home
            </Button>
          </div>
        </Card>
      </main>
    );
  }
}
