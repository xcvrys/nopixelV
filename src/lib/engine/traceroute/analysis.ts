import { BOARD_COLUMNS, BOARD_ROWS } from "./types";

const W = BOARD_COLUMNS;
const H = BOARD_ROWS;
const N = W * H;

const X = (c: number) => c % W;
const Y = (c: number) => (c / W) | 0;
const manh = (a: number, b: number) => Math.abs(X(a) - X(b)) + Math.abs(Y(a) - Y(b));

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

class Graph {
  adj: Set<number>[] = Array.from({ length: N }, () => new Set<number>());
  add(a: number, b: number) {
    this.adj[a].add(b);
    this.adj[b].add(a);
  }
}

interface Bfs {
  dist: Int16Array;
  parent: Int16Array;
  order: number[];
  src: number;
}

function bfs(g: Graph, src: number, blocked: Uint8Array): Bfs {
  const dist = new Int16Array(N).fill(-1);
  const parent = new Int16Array(N).fill(-1);
  const order = [src];
  dist[src] = 0;
  for (let i = 0; i < order.length; i++) {
    const u = order[i];
    for (const v of g.adj[u]) {
      if (dist[v] !== -1 || blocked[v]) continue;
      dist[v] = dist[u] + 1;
      parent[v] = u;
      order.push(v);
    }
  }
  return { dist, parent, order, src };
}

function pathTo(r: Bfs, dst: number): number[] {
  const p: number[] = [];
  for (let c = dst; c !== -1; c = r.parent[c]) p.push(c);
  return p.reverse();
}

function countShortest(g: Graph, r: Bfs, blocked: Uint8Array, dst: number): number {
  const cnt = new Float64Array(N);
  cnt[r.src] = 1;
  for (const u of r.order) {
    for (const v of g.adj[u]) {
      if (!blocked[v] && r.dist[v] === r.dist[u] + 1) {
        cnt[v] += cnt[u];
      }
    }
  }
  return cnt[dst];
}

export interface Metrics {
  L: number;
  M: number;
  detour: number;
  shortestPaths: number;
  turns: number;
  maxRun: number;
  leftMoves: number;
  verticalMoves: number;
  edges: number;
  loops: number;
  deadEnds: number;
  junctions: number;
  decoyDecisions: number;
  rejoiningDecoys: number;
  reachableSafe: number;
  criticalHazards: number;
  greedyWaste: number;
  memorylessWinRate: number;
}

function shape(path: number[]) {
  let turns = 0,
    maxRun = 0,
    run = 0,
    left = 0,
    vert = 0,
    last = -1;
  for (let i = 1; i < path.length; i++) {
    const dx = X(path[i]) - X(path[i - 1]);
    const dy = Y(path[i]) - Y(path[i - 1]);
    const d = dx === 1 ? 0 : dy === 1 ? 1 : dy === -1 ? 2 : 3;
    if (d === 3) left++;
    if (d === 1 || d === 2) vert++;
    if (d === last) run++;
    else {
      if (last !== -1) turns++;
      run = 1;
    }
    last = d;
    if (run > maxRun) maxRun = run;
  }
  return { turns, maxRun, left, vert };
}

function greedyDfsMoves(g: Graph, src: number, dst: number, flags: Uint8Array, rng: Rng): number {
  const seen = new Uint8Array(N);
  const stack = [src];
  seen[src] = 1;
  let moves = 0;
  while (stack.length) {
    const u = stack[stack.length - 1];
    if (u === dst) return moves;
    const opts = [...g.adj[u]].filter((v) => !seen[v] && !flags[v]);
    if (!opts.length) {
      stack.pop();
      moves++;
      continue;
    }
    shuffle(opts, rng);
    opts.sort((a, b) => manh(a, dst) - manh(b, dst));
    seen[opts[0]] = 1;
    stack.push(opts[0]);
    moves++;
  }
  return Infinity;
}

function memorylessWins(
  g: Graph,
  src: number,
  dst: number,
  flags: Uint8Array,
  rng: Rng,
  runs = 60,
  cap = 200,
): number {
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    let cur = src;
    for (let s = 0; s < cap && cur !== dst; s++) {
      const opts = [...g.adj[cur]].filter((v) => !flags[v]);
      if (!opts.length) break;
      shuffle(opts, rng);
      opts.sort((a, b) => manh(a, dst) - manh(b, dst));
      cur = opts[0];
    }
    if (cur === dst) wins++;
  }
  return wins / runs;
}

function countRejoiningDecoys(g: Graph, blocked: Uint8Array, solution: number[]): number {
  const routeIndex = new Int16Array(N).fill(-1);
  solution.forEach((cell, index) => {
    routeIndex[cell] = index;
  });
  const visited = new Uint8Array(N);
  const countedPairs = new Uint8Array(solution.length * solution.length);
  const boundaryNodes = Array.from({ length: solution.length }, () => [] as number[]);
  let count = 0;

  for (let start = 0; start < N; start += 1) {
    if (routeIndex[start] !== -1 || blocked[start] || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const cell = queue[cursor];
      for (const neighbor of g.adj[cell]) {
        if (routeIndex[neighbor] !== -1) {
          boundaryNodes[routeIndex[neighbor]].push(cell);
        } else if (!blocked[neighbor] && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }

    for (let from = 0; from < solution.length; from += 1) {
      for (const source of boundaryNodes[from]) {
        const distance = new Int16Array(N).fill(-1);
        const search = [source];
        distance[source] = 0;
        for (let cursor = 0; cursor < search.length; cursor += 1) {
          const cell = search[cursor];
          for (const neighbor of g.adj[cell]) {
            if (routeIndex[neighbor] !== -1 || blocked[neighbor] || distance[neighbor] !== -1) {
              continue;
            }
            distance[neighbor] = distance[cell] + 1;
            search.push(neighbor);
          }
        }
        for (let to = from + 1; to < solution.length; to += 1) {
          const pair = from * solution.length + to;
          if (countedPairs[pair]) continue;
          for (const destination of boundaryNodes[to]) {
            if (distance[destination] >= 0 && distance[destination] + 2 - (to - from) >= 4) {
              countedPairs[pair] = 1;
              count += 1;
              break;
            }
          }
        }
      }
    }
    for (const nodes of boundaryNodes) nodes.length = 0;
  }
  return count;
}

export function analyze(
  edges: [number, number][],
  hazards: number[],
  src: number,
  dst: number,
  rng: Rng,
  solution?: number[],
): Metrics {
  const g = new Graph();
  for (const [a, b] of edges) g.add(a, b);
  const flags = new Uint8Array(N);
  for (const h of hazards) flags[h] = 1;
  const r = bfs(g, src, flags);
  const L = r.dist[dst];
  if (L < 0) throw new Error("board is unsolvable");
  const sol = solution ?? pathTo(r, dst);
  const sh = shape(sol);

  const comp = new Int16Array(N).fill(-1);
  let C = 0;
  for (let s = 0; s < N; s++) {
    if (comp[s] >= 0) continue;
    C++;
    const st = [s];
    comp[s] = C;
    while (st.length) {
      const p = st.pop();
      if (p === undefined) continue;
      for (const v of g.adj[p]) {
        if (comp[v] < 0) {
          comp[v] = C;
          st.push(v);
        }
      }
    }
  }
  const E = edges.length;

  let deadEnds = 0,
    junctions = 0;
  for (const u of r.order) {
    let sd = 0;
    for (const v of g.adj[u]) if (!flags[v]) sd++;
    if (u !== src && u !== dst && sd === 1) deadEnds++;
    if (sd >= 3) junctions++;
  }

  let decoyDecisions = 0;
  for (let index = 0; index < sol.length - 1; index += 1) {
    const current = sol[index];
    const previous = index === 0 ? -1 : sol[index - 1];
    const next = sol[index + 1];
    let hasDecoyChoice = false;
    for (const neighbor of g.adj[current]) {
      if (!flags[neighbor] && neighbor !== previous && neighbor !== next) {
        hasDecoyChoice = true;
        break;
      }
    }
    if (hasDecoyChoice) decoyDecisions++;
  }
  const rejoiningDecoys = countRejoiningDecoys(g, flags, sol);

  let critical = 0;
  for (const h of hazards) {
    const f2 = flags.slice();
    f2[h] = 0;
    const d = bfs(g, src, f2).dist[dst];
    if (d >= 0 && d < L) critical++;
  }

  let waste = 0;
  const RUNS = 30;
  for (let i = 0; i < RUNS; i++) waste += greedyDfsMoves(g, src, dst, flags, rng);

  const M = manh(src, dst);
  return {
    L,
    M,
    detour: L - M,
    shortestPaths: countShortest(g, r, flags, dst),
    turns: sh.turns,
    maxRun: sh.maxRun,
    leftMoves: sh.left,
    verticalMoves: sh.vert,
    edges: E,
    loops: E - N + C,
    deadEnds,
    junctions,
    decoyDecisions,
    rejoiningDecoys,
    reachableSafe: r.order.length / (N - hazards.length),
    criticalHazards: critical,
    greedyWaste: waste / RUNS / L,
    memorylessWinRate: memorylessWins(g, src, dst, flags, rng),
  };
}
