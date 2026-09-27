#!/usr/bin/env python3
"""Check every certified route and optionally compute exact shortest solutions.

The A* heuristic counts colored runs and unfinished goal bottles. Both are
admissible lower bounds: a pour can eliminate at most one run and can finish
at most one goal. If a resource cap is hit, the optimum is recorded as unknown.
"""
import argparse
import heapq
import json
import time
from pathlib import Path

from curate_levels import complete, data_from, verify

ROOT = Path(__file__).resolve().parents[1]


def shortest(level, max_seconds=3.0, max_states=450000):
    start = tuple(bytes(b) for b in level['b'])
    targets = level['g']
    bottles = len(start)
    seal = level.get('k')
    filters = set(level.get('q', []))
    doses = set(level.get('d', []))
    valves = set(level['s'])
    palette = sum(goal >= 0 for goal in targets)
    goal = tuple(bytes([g] * 4) if g >= 0 else b'' for g in targets)
    deadline = time.monotonic() + max_seconds

    def heuristic(state):
        runs = sum(1 + sum(a != b for a, b in zip(row, row[1:])) for row in state if row)
        unfinished = sum(row != target for row, target in zip(state, goal))
        return max(runs-palette, unfinished)

    if start == goal:
        return 0, 1, True
    seq = 0
    seen = {start: 0}
    queue = [(heuristic(start), 0, seq, start)]
    while queue and len(seen) <= max_states and time.monotonic() < deadline:
        estimate, depth, _, state = heapq.heappop(queue)
        if depth != seen[state]:
            continue
        if state == goal:
            return depth, len(seen), True
        locked = seal and not complete(state[seal['key']], targets[seal['key']])
        for a, source in enumerate(state):
            if not source or a in valves or (locked and a == seal['slot']):
                continue
            color = source[-1]
            top = 1
            if a not in doses:
                while top < len(source) and source[-1-top] == color:
                    top += 1
            for z, target in enumerate(state):
                if a == z or len(target) >= 4 or (target and target[-1] != color):
                    continue
                if locked and z == seal['slot']:
                    continue
                if z in filters and color != targets[z]:
                    continue
                amount = min(top, 4-len(target))
                nxt = list(state)
                nxt[a] = source[:-amount]
                nxt[z] = target + bytes([color])*amount
                nxt = tuple(nxt)
                if seen.get(nxt, 999999) <= depth+1:
                    continue
                seen[nxt] = depth+1
                seq += 1
                heapq.heappush(queue, (depth+1+heuristic(nxt), depth+1, seq, nxt))
    return None, len(seen), False


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--sample', action='store_true')
    args.add_argument('--seconds', type=float, default=3.0)
    args.add_argument('--states', type=int, default=450000)
    options = args.parse_args()
    levels = data_from(ROOT/'assets'/'levels.js')
    selected = [1, 5, 10, 15, 20, 27, 30, 31, 35, 40, 41, 45, 50, 55, 60, 62, 65, 70,
                75, 80, 81, 85, 90, 100, 105, 120, 140, 160, 180] if options.sample else list(range(1, 181))
    results = []
    for n in selected:
        level = levels[n-1]
        verify(level, n)
        optimum, states, certain = shortest(level, options.seconds, options.states)
        results.append({'level': n, 'optimal': optimum, 'proved': certain, 'states': states,
                        'witness': len(level['w']), 'limit': level['m']})
        print(n, 'optimal', optimum, 'certificate', len(level['w']),
              'states', states, 'exact', certain, flush=True)
    report = ROOT/'tools'/('audit-sample.json' if options.sample else 'audit-all.json')
    report.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print('EXACT', sum(item['proved'] for item in results), '/', len(results), 'report', report)


if __name__ == '__main__':
    main()
