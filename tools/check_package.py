#!/usr/bin/env python3
"""Offline preflight of the package before running VACANT Inspector in VK."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')


class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.assets = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        for key in ('src', 'href', 'poster'):
            if attrs.get(key):
                self.assets.append(attrs[key])


tags = Tags()
tags.feed(HTML)
duplicates = [key for key, count in Counter(tags.ids).items() if count > 1]
assets = set(tags.assets) | set(re.findall(r'url\([\'\"]?([^\)\'\"]+)', HTML))
local_assets = sorted(asset for asset in assets if not asset.startswith(('http:', 'https:', 'data:', '#')))
missing = [asset for asset in local_assets if not (ROOT / asset).is_file()]
assert not duplicates, f'Duplicate HTML IDs: {duplicates}'
assert not missing, f'Missing local assets: {missing}'
assert len(tags.ids) == len(set(tags.ids))
assert 'VKWebAppInit' in HTML and 'VKWebAppShowNativeAds' in HTML and 'VKWebAppStorageSet' in HTML
assert all(value in HTML for value in ('max-width: 760px', 'max-height: 480px', 'prefers-reduced-motion'))
assert (ROOT/'assets/themes/observatory-landscape.webp').is_file()
assert (ROOT/'assets/themes/observatory-portrait.webp').is_file()
print(f'Offline package preflight: {len(tags.ids)} unique IDs, {len(local_assets)} local asset references, 0 missing.')
print('VK methods are referenced; live SDK, ads, storage, viewports and device performance still require runtime testing.')
