#!/usr/bin/env python3
"""Build in fresh staging and atomically replace a verified extension archive."""
import argparse
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ASSETS = {'src/manifest-chrome.json': 'manifest.json', 'src/options/options.html': 'options.html',
          **{'assets/' + name: name for name in ('icon16.png', 'icon32.png', 'icon48.png', 'icon64.png', 'icon128.png', 'transparent-icon-green.png')}}
BUNDLES = {'intercept.js', 'eradicate.css', 'options.js', 'options.css', 'service-worker.js'}


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'script' and values.get('src'):
            self.paths.append(values['src'])
        if tag == 'link' and values.get('href'):
            self.paths.append(values['href'])


def verify(stage, archive=None):
    files = {p.relative_to(stage).as_posix(): p for p in stage.rglob('*') if p.is_file()}
    expected = set(ASSETS.values()) | BUNDLES
    if set(files) != expected or any(p.is_symlink() for p in stage.rglob('*')):
        raise ValueError('Unexpected or missing package members')
    manifest = json.loads((stage / 'manifest.json').read_text())
    refs = [manifest['background']['service_worker'], manifest['options_ui']['page'], *manifest['icons'].values(),
            *manifest['action']['default_icon'].values()]
    for entry in manifest['web_accessible_resources']:
        refs.extend(entry['resources'])
    parser = References()
    parser.feed((stage / manifest['options_ui']['page']).read_text())
    refs.extend(parser.paths)
    if any(name not in files for name in refs):
        raise ValueError('Missing referenced package member')
    if archive:
        with zipfile.ZipFile(archive) as packed:
            if packed.testzip() or len(packed.namelist()) != len(files) or set(packed.namelist()) != set(files):
                raise ValueError('Invalid archive members')
            if any(packed.read(name) != path.read_bytes() for name, path in files.items()):
                raise ValueError('Archive bytes differ from staged build')
    return files


def package(stage, archive):
    files = verify(stage)
    archive.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.extension-', suffix='.zip', dir=archive.parent)
    os.close(fd)
    try:
        with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as packed:
            for name, path in sorted(files.items()):
                info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                packed.writestr(info, path.read_bytes())
        verify(stage, temporary)
        os.replace(temporary, archive)
    finally:
        Path(temporary).unlink(missing_ok=True)


def build(root, tag):
    if not tag or any(char not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-' for char in tag):
        raise ValueError('Invalid build tag')
    with tempfile.TemporaryDirectory(prefix='.extension-build-', dir=root) as directory:
        staging = Path(directory) / 'stage'
        staging.mkdir()
        for name, dest in ASSETS.items():
            source = root / name
            if source.is_symlink():
                raise ValueError('Symlinked asset: ' + name)
            shutil.copyfile(source, staging / dest)
        subprocess.run([str(root / 'node_modules/.bin/rollup'), '-c'], cwd=root, check=True,
                       env=dict(os.environ, NODE_ENV='production', BUILD_DIR=str(staging)))
        verify(staging)
        output = root / 'build'
        prior = Path(directory) / 'previous'
        if output.is_symlink():
            raise ValueError('Refusing to replace symlinked build directory')
        if output.exists():
            output.rename(prior)
        try:
            staging.rename(output)
        except BaseException:
            if prior.exists():
                prior.rename(output)
            raise
        package(output, root / 'dist' / ('SocialFeedBlocker_' + tag + '.zip'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag', required=True)
    args = parser.parse_args()
    build(Path(__file__).resolve().parents[1], args.tag)
