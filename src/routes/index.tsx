import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Busca Binária vs Busca Simples — Comparador de Velocidade" },
      {
        name: "description",
        content:
          "Compare visualmente a velocidade da busca binária e da busca simples (linear) em uma sequência de até 200 números aleatórios.",
      },
      {
        property: "og:title",
        content: "Busca Binária vs Busca Simples — Comparador de Velocidade",
      },
      {
        property: "og:description",
        content:
          "Gere até 200 números aleatórios e veja, passo a passo, por que a busca binária é muito mais rápida que a busca simples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const MAX_NUMBERS = 200;

const LINEAR_CODE = `function buscaSimples(numeros, alvo) {
  for (let i = 0; i < numeros.length; i++) {
    if (numeros[i] === alvo) {
      return i; // Índice encontrado
    }
  }
  return -1; // Não encontrado
}`;

const BINARY_CODE = `function buscaBinaria(numeros, alvo) {
  let inicio = 0;
  let fim = numeros.length - 1;

  while (inicio <= fim) {
    const meio = Math.floor((inicio + fim) / 2);
    if (numeros[meio] === alvo) return meio;

    if (numeros[meio] < alvo) {
      inicio = meio + 1;
    } else {
      fim = meio - 1;
    }
  }
  return -1; // Não encontrado
}`;

type SearchState = "idle" | "running" | "done";

interface SearchResult {
  steps: number;
  foundIndex: number; // -1 se não encontrou
  timeMs: number;
}

function generateNumbers(count: number): number[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * (count * 10)) + 1);
  }
  return [...nums].sort((a, b) => a - b);
}

// Executa as buscas de forma instantânea para medir o tempo real
function measureLinear(arr: number[], target: number): SearchResult {
  const t0 = performance.now();
  let steps = 0;
  let foundIndex = -1;
  for (let i = 0; i < arr.length; i++) {
    steps++;
    if (arr[i]! === target) {
      foundIndex = i;
      break;
    }
  }
  return { steps, foundIndex, timeMs: performance.now() - t0 };
}

function measureBinary(arr: number[], target: number): SearchResult {
  const t0 = performance.now();
  let steps = 0;
  let lo = 0;
  let hi = arr.length - 1;
  let foundIndex = -1;
  while (lo <= hi) {
    steps++;
    const mid = Math.floor((lo + hi) / 2);
    const v = arr[mid]!;
    if (v === target) {
      foundIndex = mid;
      break;
    }
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return { steps, foundIndex, timeMs: performance.now() - t0 };
}

// Gera a sequência de índices visitados para animar
function linearPath(arr: number[], target: number): number[] {
  const path: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    path.push(i);
    if (arr[i]! === target) break;
  }
  return path;
}

function binaryPath(arr: number[], target: number): number[] {
  const path: number[] = [];
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    path.push(mid);
    const v = arr[mid]!;
    if (v === target) break;
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return path;
}

function AttemptCounter({
  value,
  max,
  running,
  accent,
}: {
  value: number;
  max: number;
  running: boolean;
  accent: "linear" | "binary";
}) {
  const color = accent === "linear" ? "text-linear" : "text-binary";
  const border = accent === "linear" ? "border-linear/40" : "border-binary/40";
  const bg = accent === "linear" ? "bg-linear/10" : "bg-binary/10";
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-2 ${border} ${bg}`}
    >
      <div className="text-center">
        <p className={`font-mono-num text-2xl font-bold leading-none ${color}`}>
          {value}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          tentativas
        </p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="text-center">
        <p className="font-mono-num text-sm font-semibold leading-none">
          {max}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          máximo
        </p>
      </div>
      {running && (
        <span className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">
          contando...
        </span>
      )}
    </div>
  );
}

function Index() {
  const [count, setCount] = useState(50);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [target, setTarget] = useState<string>("");
  const [state, setState] = useState<SearchState>("idle");
  const [linearResult, setLinearResult] = useState<SearchResult | null>(null);
  const [binaryResult, setBinaryResult] = useState<SearchResult | null>(null);
  const [linearVisited, setLinearVisited] = useState<Set<number>>(new Set());
  const [binaryVisited, setBinaryVisited] = useState<Set<number>>(new Set());
  const [linearCurrent, setLinearCurrent] = useState(-1);
  const [binaryCurrent, setBinaryCurrent] = useState(-1);
  const [linearAttempts, setLinearAttempts] = useState(0);
  const [binaryAttempts, setBinaryAttempts] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const handleGenerate = useCallback(() => {
    clearTimers();
    const nums = generateNumbers(count);
    setNumbers(nums);
    setState("idle");
    setLinearResult(null);
    setBinaryResult(null);
    setLinearVisited(new Set());
    setBinaryVisited(new Set());
    setLinearCurrent(-1);
    setBinaryCurrent(-1);
    setNotFound(false);
    setLinearAttempts(0);
    setBinaryAttempts(0);
    setTarget("");
  }, [count]);

  const handleSearch = useCallback(() => {
    const t = Number(target);
    if (target.trim() === "" || !Number.isSafeInteger(t) || numbers.length === 0 || state === "running") return;
    clearTimers();

    const lin = measureLinear(numbers, t);
    const bin = measureBinary(numbers, t);
    setLinearResult(lin);
    setBinaryResult(bin);
    setNotFound(lin.foundIndex === -1);
    setState("running");
    setLinearVisited(new Set());
    setBinaryVisited(new Set());
    setLinearAttempts(0);
    setBinaryAttempts(0);

    const linPath = linearPath(numbers, t);
    const binPath = binaryPath(numbers, t);

    // Velocidade da animação: busca linear anda mais devagar por passo
    const linDelay = Math.max(20, Math.min(120, 3000 / linPath.length));
    const binDelay = 600;

    linPath.forEach((idx, i) => {
      timers.current.push(
        setTimeout(() => {
          setLinearCurrent(idx);
          setLinearAttempts(i + 1);
          setLinearVisited((prev) => new Set(prev).add(idx));
        }, i * linDelay),
      );
    });

    binPath.forEach((idx, i) => {
      timers.current.push(
        setTimeout(() => {
          setBinaryCurrent(idx);
          setBinaryAttempts(i + 1);
          setBinaryVisited((prev) => new Set(prev).add(idx));
        }, i * binDelay),
      );
    });

    const total = Math.max(linPath.length * linDelay, binPath.length * binDelay);
    timers.current.push(setTimeout(() => setState("done"), total + 300));
  }, [numbers, target, state]);

  const cellClass = (
    idx: number,
    visited: Set<number>,
    current: number,
    foundIndex: number,
    accent: "linear" | "binary",
  ) => {
    const base =
      "font-mono-num flex items-center justify-center rounded-md text-xs sm:text-sm h-9 min-w-9 px-1 transition-all duration-150 border";
    if (state !== "idle" && idx === foundIndex && visited.has(idx)) {
      return `${base} bg-found text-found-foreground border-found font-bold cell-found`;
    }
    if (idx === current) {
      return accent === "linear"
        ? `${base} bg-linear text-linear-foreground border-linear scale-110 font-bold`
        : `${base} bg-binary text-binary-foreground border-binary scale-110 font-bold`;
    }
    if (visited.has(idx)) {
      return accent === "linear"
        ? `${base} bg-linear/25 text-linear border-linear/40`
        : `${base} bg-binary/25 text-binary border-binary/40`;
    }
    return `${base} bg-secondary text-muted-foreground border-border`;
  };

  const speedup =
    linearResult && binaryResult && binaryResult.steps > 0
      ? (linearResult.steps / binaryResult.steps).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="font-mono-num text-xs uppercase tracking-widest text-primary">
            Algoritmos de busca
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Busca Binária <span className="text-muted-foreground">vs</span> Busca
            Simples
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Gere uma sequência de até {MAX_NUMBERS} números aleatórios, escolha
            um valor alvo e veja passo a passo quantas comparações cada
            algoritmo precisa para encontrá-lo.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Painel de configuração */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <div>
              <label
                htmlFor="count"
                className="mb-2 block text-sm font-medium"
              >
                Quantidade de números:{" "}
                <span className="font-mono-num text-primary">{count}</span>
                <span className="text-muted-foreground"> / {MAX_NUMBERS}</span>
              </label>
              <input
                id="count"
                type="range"
                min={5}
                max={MAX_NUMBERS}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </div>
            <div>
              <label
                htmlFor="target"
                className="mb-2 block text-sm font-medium"
              >
                Número a buscar
              </label>
              <input
                id="target"
                type="number"
                step={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={numbers.length === 0 || state === "running"}
                placeholder={numbers.length === 0 ? "Gere primeiro" : "Digite o alvo"}
                className="font-mono-num w-full md:w-40 rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                variant="secondary"
                className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
              >
                Gerar números
              </Button>
              <Button
                onClick={handleSearch}
                disabled={numbers.length === 0 || target.trim() === "" || !Number.isSafeInteger(Number(target)) || state === "running"}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {state === "running" ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
          {numbers.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Clique em <strong className="text-foreground">Gerar números</strong>{" "}
              para começar.
            </p>
          )}
        </section>

        {/* Resultado do resumo */}
        {state === "done" && linearResult && binaryResult && (
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-linear/40 bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-linear">
                Busca Simples
              </p>
              <p className="font-mono-num mt-2 text-3xl font-bold">
                {linearResult.steps}
              </p>
              <p className="text-xs text-muted-foreground">
                tentativas · {linearResult.timeMs.toFixed(3)} ms reais
              </p>
            </div>
            <div className="rounded-xl border border-binary/40 bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-binary">
                Busca Binária
              </p>
              <p className="font-mono-num mt-2 text-3xl font-bold">
                {binaryResult.steps}
              </p>
              <p className="text-xs text-muted-foreground">
                tentativas · {binaryResult.timeMs.toFixed(3)} ms reais
              </p>
            </div>
            <div className="rounded-xl border border-found/40 bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-found">
                Resultado
              </p>
              {notFound ? (
                <p className="mt-2 text-lg font-bold">Número não encontrado</p>
              ) : (
                <p className="font-mono-num mt-2 text-3xl font-bold">
                  {speedup}×
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {notFound
                  ? "O alvo não está na sequência — a busca simples percorreu tudo."
                  : "menos comparações com a busca binária"}
              </p>
            </div>
          </section>
        )}

        {/* Visualizações */}
        {numbers.length > 0 && (
          <>
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <span className="inline-block h-3 w-3 rounded-sm bg-linear" />
                    Busca Simples (Linear)
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    verifica um por um, do início ao fim
                  </span>
                </div>
                <AttemptCounter
                  value={linearAttempts}
                  max={numbers.length}
                  running={state === "running"}
                  accent="linear"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {numbers.map((n, i) => (
                  <div
                    key={`lin-${i}`}
                    className={cellClass(
                      i,
                      linearVisited,
                      linearCurrent,
                      linearResult?.foundIndex ?? -1,
                      "linear",
                    )}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <span className="inline-block h-3 w-3 rounded-sm bg-binary" />
                    Busca Binária
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    divide a lista ordenada ao meio a cada passo
                  </span>
                </div>
                <AttemptCounter
                  value={binaryAttempts}
                  max={Math.ceil(Math.log2(Math.max(numbers.length, 2)))}
                  running={state === "running"}
                  accent="binary"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {numbers.map((n, i) => (
                  <div
                    key={`bin-${i}`}
                    className={cellClass(
                      i,
                      binaryVisited,
                      binaryCurrent,
                      binaryResult?.foundIndex ?? -1,
                      "binary",
                    )}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                Por que a diferença?
              </h2>
              <p>
                A busca simples verifica cada elemento em sequência: no pior
                caso, são <strong className="text-linear">N comparações</strong>.
                A busca binária aproveita que a lista está ordenada e descarta
                metade dos elementos a cada passo: no pior caso, apenas{" "}
                <strong className="text-binary">log₂(N) comparações</strong>.
                Com {MAX_NUMBERS} números, isso significa até 200 comparações
                contra no máximo 8.
              </p>
              <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
                <div className="min-w-0">
                  <h3 className="mb-2 font-semibold text-linear">Busca Simples · O(n)</h3>
                  <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 text-xs leading-6 text-foreground" tabIndex={0} aria-label="Código JavaScript da busca simples"><code>{LINEAR_CODE}</code></pre>
                </div>
                <div className="min-w-0">
                  <h3 className="mb-2 font-semibold text-binary">Busca Binária · O(log n)</h3>
                  <p className="mb-2 text-xs">Pré-requisito: sequência em ordem crescente.</p>
                  <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 text-xs leading-6 text-foreground" tabIndex={0} aria-label="Código JavaScript da busca binária"><code>{BINARY_CODE}</code></pre>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        <p>Comparador de algoritmos de busca · complexidade O(n) vs O(log n)</p>
        <p className="mt-2">
          App produzido na{" "}
          <a href="https://www.cps.sp.gov.br/etecs/etec-prof-jose-santana-de-castro/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 hover:text-foreground">
            Etec Prof. José Sant&apos;Ana de Castro
          </a>.
        </p>
      </footer>
    </div>
  );
}
