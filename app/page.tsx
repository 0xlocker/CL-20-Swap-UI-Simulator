"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  Layers,
  Lock,
  LockOpen,
  Repeat2,
  SlidersHorizontal,
  Timer,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const publicAsset = (path: string) => `${publicBasePath}${path}`;
const ETH_LOGO = publicAsset("/eth-logo.svg");
const STORAGE_KEY = "cl20-simulated-lockers-v1";

type NetworkId = "sepolia" | "mainnet";
type TabId = "swap" | "lockers";
type LockerSubTab = "lockers" | "history";
type UnlockBasis = "weth" | "usd";
type LockerStatus = "locked" | "unlocked" | "withdrawn";

type PoolConfig = {
  id: NetworkId;
  label: string;
  tokenAddress: string;
  pairAddress: string;
  explorerTxBase: string;
  explorerAddressBase: string;
  tokenReserve: number;
  wethReserve: number;
  usdPrice: number | null;
};

type SimLocker = {
  id: string;
  networkId: NetworkId;
  createdAt: string;
  txHash: string;
  lockerAddress: string;
  ethIn: number;
  boughtAmount: number;
  lockedAmount: number;
  returnedAmount: number;
  lockPercent: number;
  baselineWethPrice: number;
  simulatedWethPrice: number;
  targetMultiple: number;
  unlockUnixTime: number;
  unlockBasis: UnlockBasis;
  status: LockerStatus;
  lastVerifiedAt?: string;
  lastVerifyMet?: boolean;
  withdrawTxHash?: string;
  withdrawnAt?: string;
};

type SimHistoryItem = {
  id: string;
  type: "lock" | "price_verify" | "withdraw";
  amountText: string;
  timestamp: string;
  txHash: string;
  note: string;
};

const POOLS: Record<NetworkId, PoolConfig> = {
  sepolia: {
    id: "sepolia",
    label: "Sepolia Testnet",
    tokenAddress: "0x368a8b834464D1B28bdeB4d2437D016de4F5EA67",
    pairAddress: "0xD7850331ad7090C7c9bD2883e9b42945C13Dfa4f",
    explorerTxBase: "https://sepolia.etherscan.io/tx/",
    explorerAddressBase: "https://sepolia.etherscan.io/address/",
    tokenReserve: 38030.422540311823,
    wethReserve: 0.10613794363941763,
    usdPrice: null,
  },
  mainnet: {
    id: "mainnet",
    label: "Ethereum Mainnet",
    tokenAddress: "0x3483FE3baC9Ca981f53E92f05603E1B32cd1b3cC",
    pairAddress: "0x7C3ef649FbfDb54c9bB31Dbc1229DC772C000EC8",
    explorerTxBase: "https://etherscan.io/tx/",
    explorerAddressBase: "https://etherscan.io/address/",
    tokenReserve: 75783529.02149768,
    wethReserve: 47.507921171226606,
    usdPrice: 0.00145,
  },
};

function defaultUnlockDate() {
  return {
    hour: "0",
    day: "13",
    month: "5",
    year: "2027",
  };
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  const [networkId, setNetworkId] = useState<NetworkId>("sepolia");
  const [activeTab, setActiveTab] = useState<TabId>("swap");
  const [fromAmount, setFromAmount] = useState("");
  const [lockPercentage, setLockPercentage] = useState(100);
  const [priceMultiple, setPriceMultiple] = useState("2");
  const [customMultiple, setCustomMultiple] = useState("");
  const [unlockBasis, setUnlockBasis] = useState<UnlockBasis>("weth");
  const [unlockDate, setUnlockDate] = useState(defaultUnlockDate);
  const [buySlippagePercent, setBuySlippagePercent] = useState("5");
  const [probeSlippagePercent, setProbeSlippagePercent] = useState("5");
  const [verifySlippagePercent, setVerifySlippagePercent] = useState("5");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [verifyConfirmLocker, setVerifyConfirmLocker] = useState<SimLocker | null>(null);
  const [lockers, setLockers] = useState<SimLocker[]>([]);
  const [lockerSubTab, setLockerSubTab] = useState<LockerSubTab>("lockers");

  const pool = POOLS[networkId];
  const currentWethPrice = pool.wethReserve / pool.tokenReserve;
  const toAmount = useMemo(() => quoteBuy(Number(fromAmount || "0"), pool), [fromAmount, pool]);
  const lockAllocation = toAmount * lockPercentage / 100;
  const lockedAmount = Math.max(0, lockAllocation - 1);
  const returnedAmount = Math.max(0, toAmount - lockAllocation);
  const targetMultipleValue = Number(priceMultiple);
  const unlockDateObject = useMemo(() => datePartsToDate(unlockDate), [unlockDate]);
  const unlockDateLabel = unlockDateObject ? formatUnlockDateLabel(unlockDate) : "Invalid date";
  const daysInSelectedMonth = useMemo(
    () => daysInMonth(Number(unlockDate.year), Number(unlockDate.month)),
    [unlockDate.month, unlockDate.year]
  );
  const visibleLockers = useMemo(
    () => lockers.filter((locker) => locker.networkId === networkId),
    [lockers, networkId]
  );
  const historyItems = useMemo(() => makeHistory(visibleLockers), [visibleLockers]);
  const canCreateLocker =
    Boolean(fromAmount) &&
    toAmount > 1 &&
    lockedAmount > 0 &&
    Number.isFinite(targetMultipleValue) &&
    targetMultipleValue > 1 &&
    Boolean(unlockDateObject);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setLockers(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lockers));
  }, [lockers, mounted]);

  useEffect(() => {
    if (networkId === "sepolia") setUnlockBasis("weth");
  }, [networkId]);

  const setClampedUnlockDate = (patch: Partial<typeof unlockDate>) => {
    setUnlockDate((current) => {
      const next = { ...current, ...patch };
      const maxDay = daysInMonth(Number(next.year), Number(next.month));
      if (Number(next.day) > maxDay) next.day = maxDay.toString();
      return next;
    });
  };

  const createLocker = () => {
    const ethIn = Number(fromAmount);
    if (!Number.isFinite(ethIn) || ethIn <= 0 || !canCreateLocker || !unlockDateObject) return;

    const lock: SimLocker = {
      id: `${Date.now()}`,
      networkId,
      createdAt: new Date().toISOString(),
      txHash: fakeHash(Date.now()),
      lockerAddress: fakeAddress(Date.now()),
      ethIn,
      boughtAmount: toAmount,
      lockedAmount,
      returnedAmount,
      lockPercent: lockPercentage,
      baselineWethPrice: currentWethPrice,
      simulatedWethPrice: currentWethPrice,
      targetMultiple: targetMultipleValue,
      unlockUnixTime: Math.floor(unlockDateObject.getTime() / 1000),
      unlockBasis,
      status: "locked",
    };

    setLockers((current) => [lock, ...current]);
    setFromAmount("");
    setConfirmOpen(false);
    setActiveTab("lockers");
    toast("Simulated locker created", {
      description: `${formatToken(lockedAmount)} 2027 locked at ${targetMultipleValue}x`,
      icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
    });
  };

  const updateSimulatedMultiple = (id: string, value: string) => {
    const nextMultiple = Number(value);
    if (!Number.isFinite(nextMultiple) || nextMultiple <= 0) return;
    setLockers((current) =>
      current.map((locker) =>
        locker.id === id
          ? { ...locker, simulatedWethPrice: locker.baselineWethPrice * nextMultiple }
          : locker
      )
    );
  };

  const verifySimulated = (locker: SimLocker) => {
    setVerifyConfirmLocker(null);
    const multiple = locker.simulatedWethPrice / locker.baselineWethPrice;
    const verifiedAt = new Date().toISOString();
    if (multiple >= locker.targetMultiple || Date.now() / 1000 >= locker.unlockUnixTime) {
      const txSeed = Date.now() + 17;
      setLockers((current) =>
        current.map((item) =>
          item.id === locker.id
            ? {
                ...item,
                status: "withdrawn",
                lastVerifiedAt: verifiedAt,
                lastVerifyMet: true,
                withdrawTxHash: fakeHash(txSeed),
                withdrawnAt: verifiedAt,
              }
            : item
        )
      );
      toast("Simulated unlock", {
        description: `${formatToken(locker.lockedAmount)} 2027 would withdraw to the owner.`,
        icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
      });
    } else {
      setLockers((current) =>
        current.map((item) =>
          item.id === locker.id
            ? { ...item, lastVerifiedAt: verifiedAt, lastVerifyMet: false }
            : item
        )
      );
      toast("Price not met", {
        description: `Current ${formatMultiple(multiple)}x, target ${formatMultiple(locker.targetMultiple)}x.`,
      });
    }
  };

  const clearSimulation = () => {
    setLockers([]);
    window.localStorage.removeItem(STORAGE_KEY);
    toast("Simulation cleared");
  };

  const tabs: { id: TabId; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: "swap", label: "Swap & Lock", shortLabel: "Swap", icon: <Repeat2 className="h-3.5 w-3.5" /> },
    { id: "lockers", label: "Your Lockers", shortLabel: "Lockers", icon: <Layers className="h-3.5 w-3.5" /> },
  ];

  return (
    <main className="min-h-dvh bg-background flex items-center justify-center p-0 sm:p-4">
      <Card className="w-full max-w-md bg-card border-0 sm:border sm:border-border relative mx-auto min-h-dvh sm:min-h-0 rounded-none sm:rounded-2xl flex flex-col pt-3">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">CL-20 Swap UI</p>
            <p className="text-sm font-semibold text-foreground">Simulator</p>
          </div>
          <Link
            href="/docs"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Setup & Docs
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex p-1 mx-3 sm:mx-4 mt-3 bg-secondary rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        <div className="mx-3 sm:mx-4 mt-2 bg-secondary/60 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Simulation</p>
            <p className="text-sm font-medium text-foreground">{pool.label}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={networkId === "sepolia" ? "text-foreground font-medium" : ""}>Testnet</span>
            <Switch
              checked={networkId === "mainnet"}
              onCheckedChange={(checked) => setNetworkId(checked ? "mainnet" : "sepolia")}
              aria-label="Toggle mainnet simulation"
            />
            <span className={networkId === "mainnet" ? "text-foreground font-medium" : ""}>Mainnet</span>
          </div>
        </div>

        <div className="px-3 pt-3 pb-3 sm:px-4 sm:pb-4 flex-1">
          {activeTab === "swap" && (
            <div>
              <div className="bg-secondary rounded-xl p-3 sm:p-4">
                <span className="text-xs font-medium text-muted-foreground">Sell</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={(event) => setFromAmount(event.target.value)}
                    step="any"
                    min="0"
                    className="flex-1 min-w-0 text-2xl sm:text-3xl font-medium bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <TokenPill symbol="ETH" />
                </div>
                <div className="flex justify-end text-xs text-muted-foreground mt-1">
                  <span>Balance: simulation</span>
                </div>
              </div>

              <div className="flex justify-center -my-4 relative z-10">
                <button className="p-2 bg-card border-4 border-card rounded-xl">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="bg-secondary rounded-xl p-3 sm:p-4">
                <span className="text-xs font-medium text-muted-foreground">Buy</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={toAmount > 0 ? formatRawInput(toAmount) : ""}
                    readOnly
                    className="flex-1 min-w-0 text-2xl sm:text-3xl font-medium bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <TokenPill symbol="2027" />
                </div>
                <div className="flex justify-end text-xs text-muted-foreground mt-1">
                  <span>Balance: simulation</span>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-3 sm:p-4 space-y-3 border border-border mt-5">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Lock Settings</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Amount to lock</span>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={lockPercentage}
                        onChange={(event) => setLockPercentage(clampInteger(event.target.value, 1, 100, lockPercentage))}
                        min="1"
                        max="100"
                        className="w-10 text-right font-medium bg-transparent border-none outline-none text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-foreground font-medium">%</span>
                    </div>
                  </div>
                  <Slider
                    value={[lockPercentage]}
                    onValueChange={([value]) => setLockPercentage(Math.round(value))}
                    min={1}
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-primary"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Metric label="Est. locked" value={`${formatToken(lockedAmount)} 2027`} />
                    <Metric label="Est. returned" value={`${formatToken(returnedAmount)} 2027`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Lock until price reaches</span>
                  <div className="flex gap-1.5">
                    {["2", "5", "10"].map((value) => (
                      <Button
                        key={value}
                        variant={priceMultiple === value && !customMultiple ? "default" : "secondary"}
                        size="sm"
                        onClick={() => {
                          setPriceMultiple(value);
                          setCustomMultiple("");
                        }}
                        className="flex-1 h-8 text-xs sm:text-sm"
                      >
                        {value}x
                      </Button>
                    ))}
                    <div className="relative w-14 shrink-0">
                      <input
                        type="number"
                        placeholder="..."
                        value={customMultiple}
                        onChange={(event) => {
                          setCustomMultiple(event.target.value);
                          if (event.target.value) setPriceMultiple(event.target.value);
                        }}
                        step="any"
                        min="0"
                        className="w-full h-8 px-1.5 pr-4 text-xs bg-secondary hover:bg-secondary/80 border border-border rounded-md outline-none text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-1 focus:ring-primary"
                      />
                      {customMultiple && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">x</span>}
                    </div>
                  </div>

                  <div className="bg-secondary rounded-lg px-2.5 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Price basis</p>
                      <p className="text-xs text-foreground truncate">
                        {unlockBasis === "usd" && pool.usdPrice ? `${formatUsd(pool.usdPrice)} USDT / 2027` : `${formatTiny(currentWethPrice)} WETH / 2027`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      <span className={unlockBasis === "weth" ? "text-foreground font-medium" : ""}>WETH</span>
                      <Switch
                        checked={unlockBasis === "usd"}
                        disabled={!pool.usdPrice}
                        onCheckedChange={(checked) => setUnlockBasis(checked ? "usd" : "weth")}
                        aria-label="Toggle USD price basis"
                      />
                      <span className={unlockBasis === "usd" ? "text-foreground font-medium" : ""}>USD</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 mt-5"
                disabled={!canCreateLocker}
                onClick={() => setConfirmOpen(true)}
              >
                {!fromAmount
                  ? "Enter an amount"
                  : toAmount <= 1 || lockedAmount <= 0
                    ? "Amount too small"
                    : !Number.isFinite(targetMultipleValue) || targetMultipleValue <= 1
                      ? "Invalid target"
                      : !unlockDateObject
                        ? "Invalid date"
                        : "Simulate Swap & Lock"}
              </Button>

              <div className="flex justify-between text-xs text-muted-foreground px-1 mt-2">
                <span>Rate</span>
                <span className="truncate ml-2">1 ETH = {formatToken(quoteBuy(1, pool))} 2027</span>
              </div>

              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)] sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Confirm Simulation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Simulate swapping <span className="text-foreground font-medium">{fromAmount || "0"} ETH</span> for{" "}
                      <span className="text-foreground font-medium">{formatToken(toAmount)} 2027</span>.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{lockPercentage}%</span> will be locked until{" "}
                      <span className="text-accent font-medium">{priceMultiple}x</span>{" "}
                      <span className="text-foreground font-medium">{unlockBasis.toUpperCase()}</span> price target, with fallback unlock on{" "}
                      <span className="text-foreground font-medium">{unlockDateLabel}</span>.
                    </p>
                    <DateFields
                      value={unlockDate}
                      daysInMonth={daysInSelectedMonth}
                      onChange={setClampedUnlockDate}
                    />
                    <div className="bg-secondary rounded-lg px-2.5 py-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Execution slippage</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <PercentInput label="Buy" value={buySlippagePercent} onChange={setBuySlippagePercent} />
                        <PercentInput label="Probe" value={probeSlippagePercent} onChange={setProbeSlippagePercent} />
                        <PercentInput label="Verify" value={verifySlippagePercent} onChange={setVerifySlippagePercent} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                      <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={createLocker}>Confirm</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === "lockers" && (
            <div className="space-y-3">
              {visibleLockers.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
                    <button
                      onClick={() => setLockerSubTab("lockers")}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        lockerSubTab === "lockers" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Lockers
                    </button>
                    <button
                      onClick={() => setLockerSubTab("history")}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        lockerSubTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      History
                    </button>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full h-8 text-xs" onClick={clearSimulation}>
                    Clear simulation
                  </Button>
                </>
              )}

              {lockerSubTab === "lockers" && visibleLockers.map((locker) => {
                const multiple = locker.simulatedWethPrice / locker.baselineWethPrice;
                const targetProgress = Math.min(100, multiple / locker.targetMultiple * 100);
                const withinFive = multiple >= locker.targetMultiple * 0.95;
                const canUnlock = locker.status !== "withdrawn" && (withinFive || Date.now() / 1000 >= locker.unlockUnixTime);
                const sparklineData = makeSparkline(multiple);

                return (
                  <div key={locker.id} className="bg-secondary rounded-xl p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-sm font-medium text-foreground truncate">Simulated 2027 locker</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(locker.createdAt)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          Fake locker {shortHash(locker.lockerAddress, 8)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md border shrink-0 ${
                        locker.status === "withdrawn"
                          ? "text-primary border-primary/40 bg-primary/10"
                          : withinFive
                          ? "text-foreground border-border bg-card/60"
                          : "text-muted-foreground border-border bg-card/60"
                      }`}>
                        {locker.status === "withdrawn" ? "Unlocked" : `${formatPercent(targetProgress)} there`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Metric label="Locked" value={`${formatToken(locker.lockedAmount)} 2027`} />
                      <Metric label="Current value" value={`${formatSmall(locker.lockedAmount * locker.simulatedWethPrice)} WETH`} />
                      <Metric label="Baseline" value={`${formatTiny(locker.baselineWethPrice)} WETH`} />
                      <Metric label="Target" value={`${formatMultiple(locker.targetMultiple)}x`} />
                    </div>

                    <div className="h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                          <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="bg-card/60 rounded-lg px-2.5 py-2">
                        <span className="block text-muted-foreground mb-0.5">Simulate multiple</span>
                        <div className="flex items-center gap-1">
                          <input
                            value={formatMultiple(multiple)}
                            onChange={(event) => updateSimulatedMultiple(locker.id, event.target.value)}
                            inputMode="decimal"
                            className="w-full bg-transparent border-none outline-none text-sm font-medium text-foreground"
                          />
                          <span className="text-muted-foreground">x</span>
                        </div>
                      </label>
                      <Metric label="Sim price" value={`${formatTiny(locker.simulatedWethPrice)} WETH`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Distance to target</span>
                        <span className="text-foreground">{formatMultiple(multiple)}x / {formatMultiple(locker.targetMultiple)}x</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${targetProgress}%` }} />
                      </div>
                    </div>

                    <Button
                      className={`w-full h-9 text-sm ${canUnlock ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-primary/20 text-primary/60 hover:bg-primary/20"}`}
                      disabled={locker.status === "withdrawn"}
                      onClick={() => setVerifyConfirmLocker(locker)}
                    >
                      <LockOpen className="h-3.5 w-3.5 mr-1.5" />
                      {locker.status === "withdrawn" ? "Unlocked" : canUnlock ? "Verify & Unlock" : "Test Price"}
                    </Button>
                  </div>
                );
              })}

              <Dialog open={!!verifyConfirmLocker} onOpenChange={(open) => !open && setVerifyConfirmLocker(null)}>
                <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)] sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Confirm Verify</DialogTitle>
                  </DialogHeader>
                  {verifyConfirmLocker && (
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">
                        Simulate a verify check for{" "}
                        <span className="text-foreground font-medium">{formatToken(verifyConfirmLocker.lockedAmount)} 2027</span>.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Metric
                          label="Current"
                          value={`${formatMultiple(verifyConfirmLocker.simulatedWethPrice / verifyConfirmLocker.baselineWethPrice)}x`}
                        />
                        <Metric label="Target" value={`${formatMultiple(verifyConfirmLocker.targetMultiple)}x`} />
                      </div>
                      <div className="bg-secondary rounded-lg px-2.5 py-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Verify slippage</span>
                        </div>
                        <PercentInput label="Probe sell" value={verifySlippagePercent} onChange={setVerifySlippagePercent} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" className="flex-1" onClick={() => setVerifyConfirmLocker(null)}>
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => verifySimulated(verifyConfirmLocker)}
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {lockerSubTab === "history" && visibleLockers.length > 0 && (
                <div className="space-y-2">
                  {historyItems.map((item) => (
                    <div key={item.id} className="bg-secondary rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{historyTitle(item.type)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(item.timestamp)}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-muted-foreground">
                          {item.amountText}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
                      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                        Fake tx {shortHash(item.txHash, 10)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {lockerSubTab === "lockers" && visibleLockers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No simulated lockers</p>
                  <p className="text-sm mt-1">Create one from Swap & Lock</p>
                </div>
              )}
            </div>
          )}

        </div>
      </Card>
    </main>
  );
}

function quoteBuy(ethIn: number, pool: PoolConfig) {
  if (!Number.isFinite(ethIn) || ethIn <= 0) return 0;
  const amountInWithFee = ethIn * 997;
  return (amountInWithFee * pool.tokenReserve) / (pool.wethReserve * 1000 + amountInWithFee);
}

function daysInMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 31;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function datePartsToDate(parts: { hour: string; day: string; month: string; year: string }) {
  const hour = Number(parts.hour);
  const day = Number(parts.day);
  const month = Number(parts.month);
  const year = Number(parts.year);
  if (!Number.isInteger(hour) || !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour) return null;
  return date;
}

function formatUnlockDateLabel(parts: { hour: string; day: string; month: string; year: string }) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[Number(parts.month) - 1] || "May";
  return `${Number(parts.day)} ${month} ${parts.year}, ${parts.hour.padStart(2, "0")}:00`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Simulated";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function formatToken(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: value >= 100 ? 2 : 4 });
}

function formatRawInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function formatTiny(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const [whole, fraction = ""] = value.toFixed(18).replace(/0+$/, "").split(".");
  if (!fraction) return whole;
  if (whole !== "0") {
    const trimmed = fraction.slice(0, 3).replace(/0+$/, "");
    return trimmed ? `${whole}.${trimmed}` : whole;
  }
  const firstDigit = fraction.search(/[1-9]/);
  if (firstDigit === -1) return "0";
  return `0.${fraction.slice(0, firstDigit + 3)}`;
}

function formatSmall(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value < 0.0001 ? value.toPrecision(3) : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatUsd(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatMultiple(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 2 : 1 });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function clampInteger(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function fakeHash(seed: number) {
  const body = BigInt(seed).toString(16).padStart(64, "0").slice(-64);
  return `0x${body}`;
}

function fakeAddress(seed: number) {
  return `0x${seed.toString(16).padStart(40, "0").slice(0, 40)}`;
}

function makeSparkline(multiple: number) {
  const points = [0.84, 0.92, 0.88, 1.04, 1.12, 1.02, Math.max(0.2, multiple)];
  return points.map((v) => ({ v }));
}

function makeHistory(lockers: SimLocker[]): SimHistoryItem[] {
  return lockers
    .flatMap((locker) => {
      const items: SimHistoryItem[] = [
        {
          id: `${locker.id}:lock`,
          type: "lock",
          amountText: `${formatToken(locker.lockedAmount)} 2027`,
          timestamp: locker.createdAt,
          txHash: locker.txHash,
          note: `${formatMultiple(locker.targetMultiple)}x target recorded from a simulated baseline probe.`,
        },
      ];

      if (locker.lastVerifiedAt) {
        items.push({
          id: `${locker.id}:verify:${locker.lastVerifiedAt}`,
          type: "price_verify",
          amountText: `${formatToken(locker.lockedAmount)} 2027`,
          timestamp: locker.lastVerifiedAt,
          txHash: locker.withdrawTxHash || fakeHash(Date.parse(locker.lastVerifiedAt)),
          note: locker.lastVerifyMet ? "Simulated price target reached." : "Simulated price target not reached.",
        });
      }

      if (locker.withdrawnAt && locker.withdrawTxHash) {
        items.push({
          id: `${locker.id}:withdraw`,
          type: "withdraw",
          amountText: `${formatToken(locker.lockedAmount)} 2027`,
          timestamp: locker.withdrawnAt,
          txHash: locker.withdrawTxHash,
          note: "Simulated locked tokens withdrawn to the owner.",
        });
      }

      return items;
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

function historyTitle(type: SimHistoryItem["type"]) {
  if (type === "lock") return "Locker created";
  if (type === "withdraw") return "Unlocked";
  return "Price verified";
}

function shortHash(value: string, tail = 6) {
  if (value.length <= tail + 6) return value;
  return `${value.slice(0, 6)}...${value.slice(-tail)}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card/60 rounded-lg px-2.5 py-2 min-w-0">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="text-foreground font-medium truncate">{value}</p>
    </div>
  );
}

function PercentInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      {label && <span className="block text-[11px] text-muted-foreground mb-0.5">{label}</span>}
      <div className="flex items-center rounded-md bg-card/70 px-2 py-1.5">
        <input
          value={value}
          onChange={(event) => onChange(cleanPercentInput(event.target.value))}
          onBlur={() => {
            if (value === "") onChange("5");
          }}
          inputMode="decimal"
          className="w-full bg-transparent border-none outline-none text-xs font-medium text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </label>
  );
}

function cleanPercentInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

function DateFields({
  value,
  daysInMonth,
  onChange,
}: {
  value: ReturnType<typeof defaultUnlockDate>;
  daysInMonth: number;
  onChange: (patch: Partial<ReturnType<typeof defaultUnlockDate>>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-sm">Unlock date</Label>
      <div className="grid grid-cols-4 gap-1.5">
        <Select value={value.hour} onValueChange={(v) => onChange({ hour: v })}>
          <SelectTrigger className="bg-input border-border text-foreground text-xs px-2">
            <SelectValue placeholder="Hr" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {Array.from({ length: 24 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, "0")}:00</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={value.day} onValueChange={(v) => onChange({ day: v })}>
          <SelectTrigger className="bg-input border-border text-foreground text-xs px-2">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {Array.from({ length: daysInMonth }, (_, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={value.month} onValueChange={(v) => onChange({ month: v })}>
          <SelectTrigger className="bg-input border-border text-foreground text-xs px-2">
            <SelectValue placeholder="Mo" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={value.year} onValueChange={(v) => onChange({ year: v })}>
          <SelectTrigger className="bg-input border-border text-foreground text-xs px-2">
            <SelectValue placeholder="Yr" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {Array.from({ length: 10 }, (_, i) => 2026 + i).map((year) => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TokenPill({ symbol }: { symbol: "ETH" | "2027" }) {
  return (
    <div className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-card border border-border shrink-0">
      {symbol === "ETH" ? (
        <Image src={ETH_LOGO} alt="ETH" width={24} height={24} className="rounded-full shrink-0" />
      ) : (
        <Image src={publicAsset("/logo-2027.png")} alt="2027" width={24} height={24} className="rounded-full shrink-0 object-cover" />
      )}
      <span className="font-semibold text-foreground text-sm">{symbol}</span>
    </div>
  );
}
