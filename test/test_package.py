import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build', ROOT / 'scripts/build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class Package(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.stage = self.root / 'stage'
        self.stage.mkdir()
        for source, dest in build.ASSETS.items():
            shutil.copyfile(ROOT / source, self.stage / dest)
        for name in build.BUNDLES:
            (self.stage / name).write_text('fixture')
        self.archive = self.root / 'extension.zip'

    def test_old_archive_members_cannot_survive_replacement(self):
        with zipfile.ZipFile(self.archive, 'w') as archive:
            archive.writestr('removed-asset.png', b'old')
        build.package(self.stage, self.archive)
        with zipfile.ZipFile(self.archive) as archive:
            self.assertNotIn('removed-asset.png', archive.namelist())
        before = self.archive.read_bytes()
        build.package(self.stage, self.archive)
        self.assertEqual(self.archive.read_bytes(), before)

    def test_invalid_staging_or_failed_write_preserves_existing_archive(self):
        self.archive.write_bytes(b'previous')
        for name in ('missing.js', '../escape'):
            manifest = json.loads((self.stage / 'manifest.json').read_text())
            manifest['background']['service_worker'] = name
            (self.stage / 'manifest.json').write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):
                build.package(self.stage, self.archive)
            self.assertEqual(self.archive.read_bytes(), b'previous')
        shutil.copyfile(ROOT / 'src/manifest-chrome.json', self.stage / 'manifest.json')
        with patch.object(build.os, 'replace', side_effect=OSError('interrupted')):
            with self.assertRaises(OSError):
                build.package(self.stage, self.archive)
        self.assertEqual(self.archive.read_bytes(), b'previous')
        self.assertFalse(list(self.root.glob('.extension-*')))
