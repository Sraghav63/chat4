import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';
import { getUserMessageStats } from '@/lib/db/queries';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Card } from '@/components/ui/card';
import { SignOutForm } from '@/components/sign-out-form';
import { Separator } from '@/components/ui/separator';
import { getModelIcon } from '@/components/model-icons';

export const metadata = { title: 'Settings & Activity' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/api/auth/guest');
  }

  const stats = await getUserMessageStats({ userId: session.user.id });

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="space-y-2 sm:space-y-3 mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Settings & Activity</h1>
          <p className="text-base sm:text-lg text-muted-foreground">Manage your account settings and view your activity</p>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
          <div className="space-y-6 sm:space-y-8">
            {/* User Info */}
            <Card className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl">
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Account</h2>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Email address</p>
                  <p className="font-mono text-xs sm:text-sm bg-muted px-3 py-2 rounded-md break-all">{session.user.email}</p>
                </div>
                
                <Separator className="my-2" />
                
                <div>
                  <h3 className="text-sm font-medium mb-3 sm:mb-4">Account Actions</h3>
                  <SignOutForm />
                </div>
              </div>
            </Card>

            {/* Theme */}
            <Card className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Appearance</h2>
              <ThemeSwitcher />
            </Card>
          </div>

          {/* Activity */}
          <Card className="p-6 sm:p-8 h-fit rounded-2xl sm:rounded-3xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 sm:mb-8">Usage Stats</h2>
            <div className="space-y-6 sm:space-y-8">
              <div className="bg-muted/50 rounded-lg p-4 sm:p-6 text-center">
                <div className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">{stats.total}</div>
                <div className="text-muted-foreground">Total messages</div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Messages per model</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {stats.perModel.map(({ modelId, count }) => (
                    <div 
                      key={modelId} 
                      className="flex items-center justify-between p-2.5 sm:p-3 text-xs sm:text-sm bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {getModelIcon(modelId, modelId)}
                        <span className="font-mono truncate text-xs sm:text-sm">{modelId}</span>
                      </div>
                      <span className="font-medium tabular-nums text-xs sm:text-sm shrink-0">{count}</span>
                    </div>
                  ))}
                  {stats.perModel.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <p className="text-xs sm:text-sm">No activity yet</p>
                      <p className="text-xs mt-1">Start a conversation to see your stats</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 