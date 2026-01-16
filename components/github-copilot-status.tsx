'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Github } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

export function GitHubCopilotStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/github-copilot/status');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Checking GitHub Copilot status...</TooltipContent>
      </Tooltip>
    );
  }

  if (isConnected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/settings">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>GitHub Copilot connected</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/settings">
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Connect GitHub Copilot in settings</TooltipContent>
    </Tooltip>
  );
}
