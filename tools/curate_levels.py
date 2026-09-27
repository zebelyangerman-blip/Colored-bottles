#!/usr/bin/env python3
"""Deterministically extend the original 180 certified Atlas puzzles.

All modifiers are chosen only if their entire original witness stays legal.
The verifier below replays the resulting witness with the same rule order as
the shipped JavaScript engine. It deliberately never substitutes a guessed
solution for proof of reachability.
"""

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT.parent / 'Atlas-sveta-180' / 'assets' / 'levels.js'
OUTPUT = ROOT / 'assets' / 'levels.js'
if not ORIGINAL.exists():
    # The distributed archive is self-contained. Rebuilding from its certified
    # level list is deterministic because every replacement below is stable.
    ORIGINAL = OUTPUT


def data_from(path):
    raw = path.read_text(encoding='utf-8')
    return json.loads(raw.split('window.STAR_LEVEL_DATA=', 1)[1].strip().removesuffix(';'))


def complete(bottle, color):
    return color >= 0 and len(bottle) == 4 and all(v == color for v in bottle)


def legal(level, state, a, z):
    if a == z or not 0 <= a < len(state) or not 0 <= z < len(state):
        return False
    if a in level['s'] or not state[a] or len(state[z]) == 4:
        return False
    if state[z] and state[a][-1] != state[z][-1]:
        return False
    seal = level.get('k')
    if seal and not complete(state[seal['key']], level['g'][seal['key']]) and seal['slot'] in (a, z):
        return False
    if z in level.get('q', []) and state[a][-1] != level['g'][z]:
        return False
    return True


def pour(level, state, a, z):
    assert legal(level, state, a, z), (a, z)
    color = state[a][-1]
    top = 0
    while top < len(state[a]) and state[a][-1-top] == color:
        top += 1
    count = min(top, 4-len(state[z]), 1 if a in level.get('d', []) else 4)
    for _ in range(count):
        state[z].append(state[a].pop())


def analyse_witness(level):
    state = [list(b) for b in level['b']]
    touches, departures, arrivals, beacon_times = defaultdict(list), defaultdict(list), defaultdict(list), {}
    for step, (a, z) in enumerate(level['w'], 1):
        touches[a].append(step)
        touches[z].append(step)
        color = state[a][-1]
        count = 0
        while count < len(state[a]) and state[a][-1-count] == color:
            count += 1
        count = min(count, 4-len(state[z]))
        departures[a].append(count)
        arrivals[z].append(color)
        pour(level, state, a, z)
        for i, target in enumerate(level['g']):
            if i not in beacon_times and complete(state[i], target):
                beacon_times[i] = step
    assert all(complete(b, level['g'][i]) if level['g'][i] >= 0 else not b for i, b in enumerate(state))
    return touches, departures, arrivals, beacon_times


def choose_modifiers(level, index):
    touches, departures, arrivals, lit = analyse_witness(level)
    number = index + 1
    level['q'] = []
    level['d'] = []
    level['k'] = None

    # Goal filters permit only the color printed on their beacon.
    if number >= 31:
        choices = [i for i, incoming in arrivals.items()
                   if level['g'][i] >= 0 and len(incoming) >= 2
                   and all(color == level['g'][i] for color in incoming)]
        if choices:
            level['q'] = [max(choices, key=lambda i: (len(arrivals[i]), -i))]

    # A measured bottle releases a single layer per pour. Preserve the proof.
    if number >= 41:
        choices = [i for i, amounts in departures.items()
                   if i not in level['s'] and len(amounts) >= 2 and max(amounts) == 1]
        if choices:
            level['d'] = [max(choices, key=lambda i: (len(departures[i]), -i))]

    # Sealed bottles can be touched only after a specific beacon is lit.
    if number >= 46:
        choices = [(i, key, when, len(times))
                   for key, when in lit.items()
                   for i, times in touches.items()
                   if i != key and i not in level['s'] and when >= 3
                   and when <= len(level['w']) - 2 and min(times) > when
                   and len(times) >= 2]
        if choices:
            slot, key, _, _ = max(choices, key=lambda t: (t[3], -t[2], -t[0]))
            level['k'] = {'slot': slot, 'key': key}

    # Retain normal puzzles between variations; a new rule is taught in
    # isolation before a later chapter combines it with the other rules.
    if number < 61:
        level['k'] = None
    if number < 81 and level['k']:
        level['q'] = []
    if number <= 40:
        level['d'] = []
    if number in (31, 41, 61, 81, 105):
        # The first appearance of a mechanic is clearly signposted in the UI.
        if number == 31: level['d'], level['k'] = [], None
        if number == 41: level['q'], level['k'] = [], None
        if number == 61: level['q'], level['d'] = [], []

    # Remove empty metadata only after the verification pass.
    verify(level, number)
    for name in ('q', 'd', 'k'):
        if not level[name]:
            del level[name]


def verify(level, number):
    state = [list(b) for b in level['b']]
    initial = defaultdict(int)
    for bottle in state:
        assert len(bottle) <= 4, number
        for color in bottle:
            initial[color] += 1
    assert sorted(initial.values()) == [4] * len(initial), number
    assert sorted(g for g in level['g'] if g >= 0) == sorted(initial), number
    for move_number, (a, z) in enumerate(level['w'], 1):
        if not legal(level, state, a, z):
            raise ValueError(f'Level {number}, invalid proof step {move_number}: {a}->{z}')
        pour(level, state, a, z)
    assert all(complete(b, level['g'][i]) if level['g'][i] >= 0 else not b
               for i, b in enumerate(state)), number
    assert len(level['w']) <= level['m'], number


def main():
    levels = data_from(ORIGINAL)
    assert len(levels) == 180
    # Hand-selected slots within the 180-level journey. Every
    # replacement was independently generated and given a shortest A* route.
    final_slots = sorted(set(number for number in range(105, 181)
                             if number % 5 == 0 or number % 3 == 0) | {112, 128, 143, 173})
    assert len(final_slots) == 40, final_slots
    for colors, slots in ((4, list(range(31, 41))),
                          (5, list(range(41, 79))),
                          (6, list(range(79, 105))),
                          (7, final_slots)):
        source = ROOT / 'tools' / f'generated-{colors}-color.json'
        if not source.exists():
            print(f'{source.name} is not available; keeping original layouts')
            continue
        generated = json.loads(source.read_text(encoding='utf-8'))
        assert len(generated) >= len(slots), (colors, len(generated), len(slots))
        for number, replacement in zip(slots, reversed(generated[:len(slots)])):
            levels[number-1] = {key: replacement[key] for key in ('b', 'g', 's', 'w', 'm')}
    for index, level in enumerate(levels):
        number = index + 1
        choose_modifiers(level, index)
        route = len(level['w'])
        spare = (6 if number <= 5 else 5 if number <= 15 else 4 if number <= 30
                 else 3 if number <= 100 else 2)
        if number % 5 == 0:
            spare = min(spare, 2)
        level['m'] = route + spare
        level['t'] = [route, route + max(1, (spare+1)//2), level['m']]
        level['x'] = 'finale' if number % 10 == 0 else 'trial' if number % 5 == 0 else 'route'
        verify(level, number)
    OUTPUT.write_text('/* Atlas of Light: 180 verified campaigns; b/g/s baseline; q filter, d dispenser, k seal, t star thresholds. */\n'
                      'window.STAR_LEVEL_DATA=' + json.dumps(levels, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('Verified 180/180; filters', sum(bool(l.get('q')) for l in levels),
          'dispensers', sum(bool(l.get('d')) for l in levels),
          'seals', sum(bool(l.get('k')) for l in levels))


if __name__ == '__main__':
    main()
