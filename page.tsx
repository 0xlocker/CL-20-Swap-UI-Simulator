import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  "Sepolia and mainnet simulation modes.",
  "Hard-coded 2027/WETH pool reserves for deterministic quotes.",
  "ETH -> 2027 quote, lock percentage, target multiple, and fallback date.",
  "WETH price basis, with USD basis enabled where the simulator has a static USD value.",
  "Slippage fields in the same confirmation places as the real UI.",
  "Browser-local lockers, simulated price movement, verify checks, unlocks, and history.",
];

const notReal = [
  "No wallet connects.",
  "No private key or env file is read.",
  "No RPC is called.",
  "No contract is deployed.",
  "No token is bought, approved, probed, verified, or withdrawn.",
  "Fake locker addresses and fake transaction hashes never leave the browser.",
];

const pagesSteps = [
  "Upload the source files to a GitHub repo.",
  "Open Settings -> Pages.",
  "Set Build and deployment to GitHub Actions.",
  "Run the included Deploy GitHub Pages workflow if it does not start automatically.",
];

export default function DocsPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 sm:py-8">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Simulator
            </Link>
          </Button>
          <a
            href="https://github.com/0xlocker/CL-20-Swap-UI-Simulator"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            CL-20 Swap UI Simulator
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <Card className="gap-0 rounded-2xl border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Static demo
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
            Setup & Docs
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            CL-20 Swap UI Simulator mirrors the real Swap UI without touching a wallet,
            RPC, private key, or contract. It&apos;s a demo to showcase the buy, lock,
            verify, and unlock loop for a CL-20 Conviction Locker.
          </p>
        </Card>

        <Card className="gap-3 rounded-2xl border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Run Locally</h2>
          <pre className="overflow-x-auto rounded-xl bg-secondary p-3 text-xs leading-5 text-foreground">
            <code>{"npm install\nnpm run dev\n\n# Open the localhost URL Next prints."}</code>
          </pre>
        </Card>

        <Card className="gap-3 rounded-2xl border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Build</h2>
          <pre className="overflow-x-auto rounded-xl bg-secondary p-3 text-xs leading-5 text-foreground">
            <code>{"npm run typecheck\nnpm run build"}</code>
          </pre>
          <p className="text-sm leading-5 text-muted-foreground">
            The build is a static export. The generated site is written to{" "}
            <span className="font-mono text-foreground">out/</span>, which is ignored in git.
          </p>
        </Card>

        <Card className="gap-3 rounded-2xl border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">What It Simulates</h2>
          <ul className="grid gap-2 text-sm leading-5 text-muted-foreground">
            {features.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="gap-3 rounded-2xl border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">What Is Not Real</h2>
          <ul className="grid gap-2 text-sm leading-5 text-muted-foreground">
            {notReal.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="gap-3 rounded-2xl border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">GitHub Pages</h2>
          <ol className="grid list-decimal gap-2 pl-5 text-sm leading-5 text-muted-foreground">
            {pagesSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="text-sm leading-5 text-muted-foreground">
            The workflow is already set up for project pages, so the site should load
            correctly from your repository&apos;s GitHub Pages URL.
          </p>
        </Card>

        <Card className="gap-3 rounded-2xl border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Upload Checklist</h2>
          <pre className="overflow-x-auto rounded-xl bg-secondary p-3 text-xs leading-5 text-foreground">
            <code>{`Do not upload:
node_modules/
.next/
out/
tsconfig.tsbuildinfo
.env
.env.local
.DS_Store
*.log`}</code>
          </pre>
        </Card>
      </div>
    </main>
  );
}
