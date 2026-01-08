import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const SessionTimeoutWarning = () => {
  const { isLoggedIn, logout } = useAuth();
  const { showWarning, remainingTime, extendSession } = useSessionTimeout({
    enabled: isLoggedIn,
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isLoggedIn) return null;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Clock className="h-5 w-5" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Your session will expire in{" "}
              <span className="font-mono font-bold text-destructive">
                {formatTime(remainingTime)}
              </span>{" "}
              due to inactivity.
            </p>
            <p className="text-sm text-muted-foreground">
              Click "Stay Logged In" to continue your session, or you will be
              automatically logged out.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => logout()}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout Now
          </Button>
          <AlertDialogAction onClick={extendSession} className="gap-2">
            <Clock className="h-4 w-4" />
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
