const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('home accepts a search while catalog is pending and retains it when data arrives', () => {
  const dom = new JSDOM('<main id="app"></main>', {
    url:'https://damascus-shop.com/', runScripts:'outside-only', pretendToBeVisual:true
  });
  const w = dom.window;
  w.api = {}; w.passwordRecovery = false; w.search = '';
  w.renderHome = () => {
    w.document.getElementById('app').innerHTML = '<section id="browse"><input id="search"><p class="empty">No results</p></section>';
    const input = w.document.getElementById('search');
    input.value = w.search; input.oninput = () => {w.search = input.value;};
  };
  w.render = () => w.renderHome();
  w.eval(fs.readFileSync('startup-ui.js','utf8'));
  w.DarayaStartup.show();
  assert.ok(w.document.querySelector('.catalog-pending-status'));
  const input = w.document.getElementById('search');
  input.value = 'restaurant'; input.dispatchEvent(new w.Event('input'));
  input.focus(); input.setSelectionRange(3,3);
  w.DarayaStartup.complete();
  assert.equal(w.document.getElementById('search').value,'restaurant');
  assert.equal(w.document.activeElement.id,'search');
  assert.equal(w.document.activeElement.selectionStart,3);
  assert.equal(w.document.querySelector('.catalog-pending-status'),null);
  dom.window.close();
});

test('management scripts stay unloaded for browsing and recover from a failed download', async () => {
  const dom = new JSDOM('<head><script data-feature="management" data-src="/feature-a.js"></script><script data-feature="management" data-src="/feature-b.js"></script></head><main id="app"></main>', {
    url:'https://damascus-shop.com/#home', runScripts:'outside-only'
  });
  const w = dom.window;
  w.api = {}; w.user = {id:'owner'}; w.DarayaStartup = {pending:false};
  let rendered = 0; w.render = () => {rendered++;};
  const scripts = []; const append = w.document.head.append.bind(w.document.head);
  w.document.head.append = script => {scripts.push(script);append(script);};
  w.eval(fs.readFileSync('feature-loading.js','utf8'));
  w.render(); assert.equal(scripts.length,0);
  w.history.replaceState(null,'','#dashboard/accounts'); w.render();
  assert.equal(scripts.length,1);
  scripts[0].onload(); await flush();
  assert.equal(scripts.length,2);
  scripts[1].onerror(); await flush();
  w.document.querySelector('[data-retry-feature]').click(); await flush();
  assert.equal(scripts.length,3);
  assert.ok(scripts[2].src.endsWith('/feature-b.js'));
  scripts[2].onload(); await flush();
  assert.equal(rendered,2);
  w.render(); assert.equal(scripts.length,3);
  dom.window.close();
});

test('late management download does not replace the homepage after navigation', async () => {
  const dom = new JSDOM('<head><script data-feature="management" data-src="/feature.js"></script></head><main id="app"></main>', {
    url:'https://damascus-shop.com/#dashboard', runScripts:'outside-only'
  });
  const w=dom.window;w.api={};w.user={id:'owner'};w.DarayaStartup={pending:false};
  let rendered=0;w.render=()=>{rendered++;};let script;
  w.document.head.append=s=>{script=s;};
  w.eval(fs.readFileSync('feature-loading.js','utf8'));
  w.render();w.history.replaceState(null,'','#home');w.render();
  script.onload();await flush();assert.equal(rendered,1);
  dom.window.close();
});
