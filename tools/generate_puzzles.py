#!/usr/bin/env python3
"""Generate and certify deliberately harder mid-campaign Atlas puzzles.

Reverse transitions are constructed so their reversed list is a legal route
to the solved state. A* then computes an exact shortest route and records it.
Candidates with short optimal paths, trivial placements or excessive search
are rejected. No runtime randomness is used in the shipped game.
"""
import argparse
import heapq
import json
import random
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def solve(level, seconds=0.8, state_limit=80000):
    start = tuple(bytes(row) for row in level['b'])
    goal = tuple(bytes([g] * 4) if g >= 0 else b'' for g in level['g'])
    colors = len(set(g for g in level['g'] if g >= 0))
    valves = set(level['s'])
    deadline = time.monotonic() + seconds

    def h(state):
        runs = sum(1 + sum(a != b for a, b in zip(row, row[1:])) for row in state if row)
        return max(runs - colors, sum(row != dest for row, dest in zip(state, goal)))

    parents = {start: (None, None)}
    depths = {start: 0}
    queue = [(h(start), 0, 0, start)]
    sequence = 0
    while queue and len(depths) < state_limit and time.monotonic() < deadline:
        _, depth, _, state = heapq.heappop(queue)
        if depth != depths[state]:
            continue
        if state == goal:
            route, cursor = [], goal
            while cursor != start:
                previous, move = parents[cursor]
                route.append(move)
                cursor = previous
            route.reverse()
            return route, len(depths)
        for a, src in enumerate(state):
            if a in valves or not src:
                continue
            c = src[-1]
            run = 1
            while run < len(src) and src[-1-run] == c:
                run += 1
            for z, dst in enumerate(state):
                if a == z or len(dst) == 4 or (dst and dst[-1] != c):
                    continue
                amount = min(run, 4-len(dst))
                next_state = list(state)
                next_state[a] = src[:-amount]
                next_state[z] = dst + bytes([c])*amount
                next_state = tuple(next_state)
                if depths.get(next_state, 9999) <= depth+1:
                    continue
                depths[next_state] = depth+1
                parents[next_state] = (state, [a, z])
                sequence += 1
                heapq.heappush(queue, (depth+1+h(next_state), depth+1, sequence, next_state))
    return None, len(depths)


def reverse_candidate(palette, rng, scramble=30):
    targets = list(range(palette)) + [-1, -1]
    rng.shuffle(targets)
    valves = [rng.choice([i for i,g in enumerate(targets) if g >= 0])]
    state = [[g]*4 if g >= 0 else [] for g in targets]
    certificate = []
    seen = {tuple(map(tuple, state))}
    for _ in range(scramble):
        moves = []
        for j, source in enumerate(state):
            if not source:
                continue
            color = source[-1]
            group = 1
            while group < len(source) and source[-1-group] == color:
                group += 1
            for i, destination in enumerate(state):
                if i == j or i in valves or len(destination) == 4 or (destination and destination[-1] == color):
                    continue
                for amount in range(1, min(group, 4-len(destination))+1):
                    score = (4 if destination else 0) + (2 if j in valves else 0)
                    moves.append((score + rng.random()*3, i, j, amount))
        if not moves:
            break
        # Try a small weighted subset; repeat-state avoidance prevents easy cycles.
        moves.sort(reverse=True)
        chosen = None
        for _, i, j, amount in moves[:min(28, len(moves))]:
            nxt = [row[:] for row in state]
            for _ in range(amount):
                nxt[i].append(nxt[j].pop())
            if tuple(map(tuple, nxt)) not in seen:
                chosen = i, j, amount, nxt
                break
        if chosen is None:
            break
        i, j, _, state = chosen
        seen.add(tuple(map(tuple, state)))
        certificate.append([i, j])
    return {'b': state, 'g': targets, 's': valves, 'w': certificate[::-1], 'm': len(certificate)+6}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempts', type=int, default=450)
    parser.add_argument('--colors', type=int, default=5)
    parser.add_argument('--threshold', type=int, default=15)
    parser.add_argument('--count', type=int, default=12)
    options = parser.parse_args()
    rng = random.Random(91024 + options.colors)
    picks = {}
    for trial in range(options.attempts):
        level = reverse_candidate(options.colors, rng, rng.randrange(24, 43))
        if len(level['w']) < 18:
            continue
        route, expanded = solve(level)
        if route is None or len(route) < options.threshold:
            continue
        if any(sum(x == color for bottle in level['b'] for x in bottle) != 4 for color in range(options.colors)):
            continue
        signature = json.dumps(level['b'])
        level['w'] = route
        level['m'] = len(route)+5
        level['_expanded'] = expanded
        picks[signature] = level
    ranked = sorted(picks.values(), key=lambda x: (len(x['w']), x['_expanded']), reverse=True)
    chosen = ranked[:options.count]
    outfile = ROOT/'tools'/f'generated-{options.colors}-color.json'
    outfile.write_text(json.dumps(chosen, ensure_ascii=False, indent=2), encoding='utf-8')
    print('candidates', len(ranked), 'selected', len(chosen),
          'lengths', [len(level['w']) for level in chosen],
          'expansions', [level['_expanded'] for level in chosen],
          'output', outfile, flush=True)


if __name__ == '__main__':
    main()
