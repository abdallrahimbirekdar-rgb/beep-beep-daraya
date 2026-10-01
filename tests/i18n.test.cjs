const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function setup(saved='ar'){
 const text={nodeValue:'طريقة استلام الطلب',parentElement:{tagName:'LABEL',closest(){return false;}}};
 const optionElement={tagName:'OPTION',closest(){return false;},hasAttribute(){return false;},value:''};
 const option={nodeValue:'استلام من المحل',parentElement:optionElement};
 const customer={nodeValue:'المحل',parentElement:{tagName:'H3',closest(){return true;}}};
 const input={value:'Unchanged customer address',attrs:{placeholder:'الشارع، البناء، الطابق أو علامة قريبة'},closest(){return false;},hasAttribute(k){return k in this.attrs;},getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;}};
 const currency={nodeValue:'١٥٬٠٠٠ ل.س',parentElement:text.parentElement};
 let stored=saved;const picker={value:'',addEventListener(){}};const document={body:{},documentElement:{},querySelector(){return picker;},querySelectorAll(){return [input];},createTreeWalker(){const nodes=[text,option,customer,currency];let n=0;return {nextNode(){return nodes[n++];}};}};
 const c=vm.createContext({window:{},document,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{disconnect(){}observe(){}},localStorage:{getItem(){return stored;},setItem(k,v){stored=v;}}});vm.runInContext(fs.readFileSync('public/i18n.js','utf8'),c);
 return {i18n:c.window.ShahinI18n,document,picker,text,option,optionElement,customer,input,currency,stored:()=>stored};
}
test('language changes translate UI and direction, preserve order values and reverse cleanly',()=>{
 const s=setup();s.i18n.setLanguage('de');assert.equal(s.document.documentElement.dir,'ltr');assert.equal(s.text.nodeValue,'Lieferung oder Abholung');assert.equal(s.option.nodeValue,'Abholung im Geschäft');assert.equal(s.optionElement.value,'استلام من المحل');assert.equal(s.customer.nodeValue,'المحل');assert.equal(s.input.value,'Unchanged customer address');assert.match(s.input.attrs.placeholder,/Straße/);assert.equal(s.currency.nodeValue,'15.000 SYP');
 s.i18n.setLanguage('tr');assert.equal(s.text.nodeValue,'Teslimat şekli');assert.equal(s.optionElement.value,'استلام من المحل');assert.equal(s.stored(),'tr');
 s.i18n.setLanguage('ar');assert.equal(s.document.documentElement.dir,'rtl');assert.equal(s.text.nodeValue,'طريقة استلام الطلب');assert.equal(s.input.attrs.placeholder,'الشارع، البناء، الطابق أو علامة قريبة');assert.equal(s.currency.nodeValue,'١٥٬٠٠٠ ل.س');
});
test('stored language is applied on startup and unknown choices are ignored',()=>{const s=setup('tr');assert.equal(s.picker.value,'tr');assert.equal(s.document.documentElement.lang,'tr');s.i18n.setLanguage('xx');assert.equal(s.i18n.language,'tr');});
test('dynamic minimum-order messages and checkout headings translate including shop names',()=>{const s=setup('de');assert.equal(s.i18n.translate('تأكيد طلبك من فلافل مجد'),'Bestellung bestätigen: Majd Falafel');assert.equal(s.i18n.translate('أضف بقيمة ١٥٬٠٠٠ ل.س للوصول إلى الحد الأدنى.'),'Füge Produkte für 15.000 SYP hinzu, um den Mindestbestellwert zu erreichen.');assert.equal(s.i18n.translate('✓ دفع عند الاستلام'),'✓ Zahlung bei Erhalt');});

test('all seeded shop and meal names and descriptions have both translations',()=>{const sql=fs.readFileSync('supabase/seed_shahin_five_stores.sql','utf8');const source=[];for(const line of sql.split('\n')){if(!line.startsWith('insert into'))continue;const values=[...line.matchAll(/'((?:[^']|'')*)'/g)].map(x=>x[1]);if(line.includes('public.stores('))source.push(values[1],values[3],values[9],values[10],values[11],values[12]);else source.push(values[2],values[3]);}for(const lang of ['tr','de']){const s=setup(lang);for(const ar of source.filter(t=>/[\u0600-\u06ff]/.test(t)))assert.doesNotMatch(s.i18n.translate(ar),/[\u0600-\u06ff]/,`${lang}: ${ar}`);assert.equal(s.i18n.translate('سندويشة فلافل'),lang==='tr'?'Falafel sandviç':'Falafel-Sandwich');assert.equal(s.i18n.translate('مناطق التوصيل: وسط داريا، السوق، الكورنيش'),lang==='tr'?'Teslimat bölgeleri: Daraya merkezi, Çarşı, Korniş':'Liefergebiete: Zentrum von Daraya, Marktviertel, Corniche');}});
