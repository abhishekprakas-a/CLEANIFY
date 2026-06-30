"use client";

import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallButton({ className }: { className?: string }) {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  if (isInstalled || !canInstall) return null;

  return (
    <Button
      variant="secondary"
      className={className}
      onClick={() => promptInstall()}
    >
      Install app
    </Button>
  );
}
