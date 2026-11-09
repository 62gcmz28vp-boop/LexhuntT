import { Button, Input, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const configured = !!(process.env.LEXHUNT_PASSWORD_HASH || process.env.LEXHUNT_PASSWORD);
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0f1b2d] p-12 text-[#f6f2e8] lg:flex">
        <div>
          <div className="font-serif text-3xl tracking-[0.25em]">LEXHUNT</div>
          <div className="mt-2 text-xs uppercase tracking-[0.22em] text-[#d6b468]">My Legal Career Intelligence Platform</div>
        </div>
        <div className="max-w-md">
          <div className="mb-6 h-px w-24 bg-[#d6b468]" />
          <p className="font-serif text-3xl leading-snug">Discover the Riyadh roles others overlook. Understand how firms hire. Present your experience with precision.</p>
          <p className="mt-6 text-sm text-[#c9cfdb]">منصتك الشخصية لاكتشاف فرص العمل القانونية في الرياض</p>
        </div>
        <div className="text-xs text-[#8b94a7]">Private · single owner · verified sources only</div>
      </div>
      <div className="flex items-center justify-center bg-bg p-6">
        <form action="/api/auth/login" method="post" className="card w-full max-w-sm p-8">
          <div className="eyebrow mb-2">Secure sign-in</div>
          <h1 className="mb-6 font-serif text-2xl">Welcome back</h1>
          <input type="hidden" name="next" value={sp.next ?? "/"} />
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
          {sp.error === "invalid" && <p className="mt-2 text-sm text-bad">Incorrect password.</p>}
          {sp.error === "rate" && <p className="mt-2 text-sm text-bad">Too many attempts. Wait a minute and try again.</p>}
          {!configured && (
            <p className="mt-3 rounded-lg bg-warn-soft p-3 text-xs text-warn">
              No password configured. Set <code>LEXHUNT_PASSWORD_HASH</code> (run <code>npm run hash-password -- &quot;…&quot;</code>) or <code>LEXHUNT_PASSWORD</code> for local development.
            </p>
          )}
          <Button type="submit" className="mt-6 w-full" size="lg">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
