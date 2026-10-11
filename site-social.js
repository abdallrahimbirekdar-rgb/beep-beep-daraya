'use strict';
(()=>{const update=()=>{const lang=document.querySelector('#language')?.value||'ar';const labels={ar:'تابعنا على فيسبوك',en:'Follow us on Facebook',de:'Folge uns auf Facebook'};document.querySelectorAll('.site-facebook-link span').forEach(node=>node.textContent=labels[lang]||labels.ar);};document.querySelector('#language')?.addEventListener('change',update);update();})();
