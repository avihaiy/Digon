import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);

    // Auto-reload on chunk load failure (e.g. after a new deployment)
    if (
      error.message.includes("Failed to fetch dynamically imported module") || 
      error.message.includes("Importing a module script failed") ||
      error.name === "ChunkLoadError" ||
      error.message.includes("dynamically imported module")
    ) {
      const lastReloadStr = sessionStorage.getItem('chunk_failed_reload_time');
      const lastReload = lastReloadStr ? parseInt(lastReloadStr, 10) : 0;
      const now = Date.now();
      
      // Allow a reload at most once every 10 seconds to prevent infinite loops
      if (now - lastReload > 10000) {
        sessionStorage.setItem('chunk_failed_reload_time', now.toString());
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            for (const r of regs) r.unregister();
          });
        }
        window.location.href = window.location.origin + '/?refresh=' + Date.now();
      }
    }
  }

  private handleReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          await r.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
    } catch (e) {
      console.error(e);
    }
    window.location.href = window.location.origin + '/?refresh=' + Date.now();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-900/20" dir="rtl">
          <Card className="max-w-md w-full p-6 text-center space-y-6 shadow-2xl border-destructive/20 bg-background/95 backdrop-blur">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">אופס! משהו השתבש</h2>
              <p className="text-muted-foreground text-sm">
                נתקלנו בשגיאה לא צפויה. אנחנו ממליצים לרענן את העמוד כדי לנסות שוב.
              </p>
            </div>
            
            {this.state.error && (
              <div className="bg-muted p-3 rounded-md text-left overflow-auto max-h-32 border" dir="ltr">
                <code className="text-xs text-muted-foreground break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <Button 
              onClick={this.handleReload} 
              size="lg"
              className="w-full gap-2 shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              רענן את האפליקציה
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
