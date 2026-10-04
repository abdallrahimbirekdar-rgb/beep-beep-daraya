 'use strict';
function normalizeAccountPhone(value){
 let s=String(value||'').trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[\s().-]/g,'');
 if(s.startsWith('00'))s='+'+s.slice(2);
 if(/^09\d{8}$/.test(s))s='+963'+s.slice(1);
 if(/^9639\d{8}$/.test(s))s='+'+s;
 if(!/^\+[1-9]\d{7,14}$/.test(s))throw Error('أدخل رقم واتساب مع رمز الدولة، مثل +9639XXXXXXXX');
 return s;
}
function accountLoginIdentity(value){const s=String(value||'').trim();return s.includes('@')?s:normalizeAccountPhone(s).slice(1)+'@phone.damascus-shop.invalid';}
function numericAccountPassword(){let s='';while(s.length<12){const a=new Uint8Array(24);crypto.getRandomValues(a);for(const x of a){if(x<250)s+=String(x%10);if(s.length===12)break;}}return s;}
function accountIdentityLabel(value){const s=String(value||'');return /^(\d+)@phone\.damascus-shop\.invalid$/.test(s)?'+'+s.split('@')[0]:s;}
