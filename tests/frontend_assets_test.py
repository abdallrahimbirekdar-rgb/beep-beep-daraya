import importlib.util
import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('frontend_assets', Path(__file__).parents[1]/'scripts/frontend_assets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class FrontendAssetsTests(unittest.TestCase):
    def test_classic_scripts_keep_order_global_bindings_and_non_strict_behavior(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            files = {'a.js': "'use strict';let value=2;var events=['a'];", 'b.js': "'use strict';value+=3;events.push('b');", 'loose.js': "events.push((function(){return this===globalThis})()?'loose':'wrong');", 'c.js': "'use strict';events.push(String(value));", 'd.js': "'use strict';value*=2;"}
            for name, code in files.items(): (root/name).write_text(code)
            html = '<head></head><body>'+''.join(f'<script defer src="{name}"></script>' for name in files)+'</body>'
            result = module.bundle_html(root, html)
            urls = re.findall(r'<script defer src="([^"]+)"', result)
            self.assertEqual(len(urls), 3)
            self.assertEqual(urls[1], 'loose.js')
            code = "const vm=require('node:vm'),c=vm.createContext({});"+''.join('vm.runInContext('+json.dumps((root/u).read_text())+',c);' for u in urls)+"process.stdout.write(vm.runInContext('JSON.stringify([value,events])',c));"
            self.assertEqual(json.loads(subprocess.check_output(['node','-e',code])), [10,['a','b','loose','5']])

    def test_inline_css_and_files_keep_cascade_order_and_media(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'a.css').write_text('.x{color:red}')
            (root/'b.css').write_text('.x{color:green}')
            html = '<head><link rel="icon" href="icon.png"><link rel="stylesheet" href="a.css"><style>.x{color:blue}</style><link rel="stylesheet" href="b.css" media="print"></head>'
            result = module.bundle_html(root, html)
            urls = re.findall(r'rel="stylesheet" href="([^"]+)"', result)
            self.assertEqual(len(urls), 1)
            css = (root/urls[0]).read_text()
            self.assertLess(css.index('red'),css.index('blue'))
            self.assertLess(css.index('blue'),css.index('green'))
            self.assertIn('@media print', css)
            self.assertIn('rel="icon"', result)

    def test_bundle_url_changes_with_content_and_inline_scripts_remain_boundaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ['a.js','b.js']: (root/name).write_text("'use strict';void 1;")
            html = '<head></head><script defer src="a.js?v=1"></script><script defer src="b.js?v=1"></script>'
            first = module.bundle_html(root,html)
            (root/'b.js').write_text("'use strict';void 2;")
            self.assertNotEqual(first, module.bundle_html(root,html))
            inline = '<head></head><script defer src="a.js"></script><script>window.route=1</script><script defer src="b.js"></script>'
            self.assertEqual(inline,module.bundle_html(root,inline))

if __name__=='__main__': unittest.main()
