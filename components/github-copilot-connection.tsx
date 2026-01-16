'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Github } from 'lucide-react';
import { toast } from 'sonner';

interface GitHubCopilotConnectionProps {
  userId: string;
}

export function GitHubCopilotConnection({
  userId,
}: GitHubCopilotConnectionProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [userId]);

  const checkConnection = async () => {
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

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Initiate GitHub device flow
      const response = await fetch('/api/github-copilot/connect', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initiate connection');
      }

      const data = await response.json();

      // Open device login page
      if (data.deviceCode && data.verificationUri) {
        // Show user the code and URL
        const userCode = data.userCode;
        const verificationUri = data.verificationUri;

        // Open in new window
        window.open(verificationUri, '_blank');

        // Show instructions
        toast.info(`Enter code ${userCode} at ${verificationUri}`, {
          duration: 10000,
        });

        // Poll for completion
        pollForToken(data.deviceCode);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect GitHub Copilot');
      setIsConnecting(false);
    }
  };

  const pollForToken = async (deviceCode: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch('/api/github-copilot/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceCode }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            setIsConnected(true);
            setIsConnecting(false);
            toast.success('GitHub Copilot connected successfully!');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsConnecting(false);
          toast.error('Connection timeout. Please try again.');
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsConnecting(false);
          toast.error('Connection failed. Please try again.');
        }
      }
    };

    poll();
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/github-copilot/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setIsConnected(false);
        toast.success('GitHub Copilot disconnected');
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking connection...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Github className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">GitHub Copilot</p>
            <p className="text-xs text-muted-foreground">
              Connect your GitHub Copilot subscription
            </p>
          </div>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-500">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Not connected</span>
          </div>
        )}
      </div>

      {isConnected ? (
        <Button variant="outline" onClick={handleDisconnect} className="w-full">
          Disconnect GitHub Copilot
        </Button>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub Copilot
            </>
          )}
        </Button>
      )}

      {isConnecting && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>1. A new window will open with GitHub</p>
          <p>2. Enter the code shown in the notification</p>
          <p>3. Authorize the application</p>
          <p>4. This page will update automatically</p>
        </div>
      )}
    </div>
  );
}
