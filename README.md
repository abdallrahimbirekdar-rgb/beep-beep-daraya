# بيب بيب — مطاعم ومحلات داريا

تطبيق عربي للمطاعم والمحلات، منفصل تماماً عن snack-point وماركت بلدنا.

## الحالة

الكود جاهز للربط بقاعدة البيانات، لكن التشغيل الفعلي غير مفعّل قبل إعداد Supabase. لا يحتوي على محلات وهمية أو حسابات تدريب أو طلبات محاكاة. عند غياب الاتصال يظهر للزبون أن المحلات غير متاحة، ولا يتم الادعاء بنجاح طلب غير محفوظ.

## نشر الواجهة

ملفات index.html وapp.js وconfig.js وstyle.css وfavicon.svg موجودة بجذر المستودع.
من Settings → Pages اختر Deploy from a branch ثم main والمجلد / (root) ثم Save.

## إعداد قاعدة البيانات

استخدم مشروع Supabase جديداً خاصاً ببيب بيب، لا قاعدة بيانات بلدنا.
1. أنشئ مشروعاً ثم شغّل supabase/setup.sql مرة واحدة في SQL Editor.
2. أنشئ حساب الإدارة في Authentication → Users.
3. نفذ SQL التالي مع بريد الإدارة الصحيح:

```sql
insert into public.platform_admins(user_id)
select id from auth.users where email='YOUR_ADMIN_EMAIL';
```

4. عدّل config.js بقيم Project URL والمفتاح العام anon/publishable فقط:

```js
window.BEEP_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_KEY'
};
```

لا تضع service_role أو secret key أو كلمة مرور قاعدة البيانات في الموقع أو المستودع.
5. ادخل بحساب الإدارة وأضف المحلات. حدد بريد صاحب المحل في بيانات محله، ثم افتح «حسابات أصحاب المحلات» لإنشاء حسابه بكلمة مرور من 12 حرفاً على الأقل. الحساب الموجود لا تتغير كلمة مروره.

## الوظائف

- إدارة المنصة تضيف المحلات وتحدد صاحب كل محل وتوقف المحلات.
- أصحاب المحلات يعدلون منتجاتهم وأسعارهم وصورهم ورسوم ومناطق التوصيل والحد الأدنى ووقت التوصيل وفتح المحل.
- سلة من محل واحد، طلب نقدي عند الاستلام، واختيار منطقة وعنوان.
- الأسعار ورسوم التوصيل تحسب في قاعدة البيانات من الأسعار الحالية.
- تحديث حالة الطلب حتى التسليم؛ يعرض آخر 200 طلب مع زر التحديث.
- صلاحيات RLS تفصل بيانات المحلات؛ الطلبات لا يمكن قراءتها للعامة.
- الصور تُرفع إلى Supabase Storage، حتى 5 ميغابايت.

## التحقق المطلوب قبل استقبال الزبائن

تم فحص صحة JavaScript ومنطق السلة محلياً. لم يتم إعداد حساب Supabase فعلي أو اختبار حسابات وصلاحيات RLS في خدمة حية، كما لم يتم فحص الواجهة في متصفح فعلي في هذه البيئة.
اختبر بحساب إدارة وحسابي محلين مختلفين، ثم اختبر إنشاء الطلبات والحد الأدنى والسعر ومنطقة الخدمة ورفع الصور.

لا إشعارات واتساب تلقائية أو تطبيق مندوب أو دفع إلكتروني. اختيار منطقة الخدمة يدوي ولا يتحقق من GPS. توجد حماية بسيطة من تكرار الهاتف في 30 ثانية، وتحتاج الحماية من الإساءة إلى مراجعة قبل التشغيل العام.

## الاستضافة

شروط GitHub Pages تقيد تشغيل مواقع التجارة والمعاملات التجارية. حفظ الكود في GitHub منفصل عن اختيار الاستضافة. راجع: https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features

## صورة الواجهة

صورة خارجية: https://shawarmaistanbul.ca/wp-content/uploads/2023/04/chicken-sandwich-1024x684.webp
استبدل صورة الواجهة بصورة تملك حق استخدامها قبل التشغيل التجاري.


## إنشاء حسابات أصحاب المحلات من لوحة الإدارة
- خدمة `create-merchant` تعمل في Supabase Edge Functions؛ المفتاح الإداري يبقى في أسرار الخادم فقط.
- تتحقق الخدمة من المستخدم عبر Auth ومن عضويته في `platform_admins` قبل أي إنشاء.
- البريد يؤخذ من المحل في قاعدة البيانات وليس من بيانات يرسلها المتصفح.
- لا يتم إرسال بريد تلقائي، ولا تغيير حساب موجود، ولا إضافة صلاحيات إدارة المنصة.
- يجب نشر `supabase/functions/create-merchant/index.ts` قبل نشر الواجهة الجديدة. تتحقق الخدمة بنفسها من JWT عبر `getUser`، مما يدعم مفاتيح التوقيع الحديثة عند استخدام إعداد `verify_jwt = false` في بوابة الوظيفة.
- فحص الحماية: `node --test tests/create-merchant.test.cjs`.


## لوحة تجهيز صفحة المحل
- صاحب المحل يدخل إلى خطوات تجهيز صفحته، معلومات المحل، الصورة، المنتجات، التوصيل والاستلام، الدوام، والطلبات.
- مدير المنصة يستطيع فتح نفس المساحة عبر «تجهيز الصفحة» بجانب المحل.
- العنوان ورقم التواصل والدوام يظهرون في صفحة الزبون. جدول الدوام للعرض؛ استقبال الطلبات يتم التحكم به يدوياً.
- خيارات التوصيل والاستلام تطبق في قاعدة البيانات أيضاً. الاستلام من المحل لا يضيف رسوم توصيل.
- الصور تُعاين محلياً قبل حفظها، وتُرفع إلى التخزين عند الضغط على الحفظ.
- التحديث يتطلب `supabase/migrations/20261001_merchant_setup.sql`. اختبار التحديث مع rollback في `validate_merchant_setup.sql`؛ شغّله قبل تطبيق التحديث، وليس بعده.
- API القديمة `place_order` محفوظة كواجهة توصيل متوافقة، والواجهة الجديدة تستخدم `place_order_v2`.

### Merchant help, stock and safe retries

The `#merchant-help/<store-id>` guide is available from each merchant dashboard, with Arabic, Turkish and German instructions and direct links to its sections. Apply `supabase/migrations/20261001_market_reliability.sql` before deploying this client version. `validate_market_reliability.sql` creates isolated fixtures and rolls them back; it checks duplicate request identity, stock reservation, rejected overselling, cancellation restoration, stale edits and privacy request isolation.

Existing products retain availability behavior until the owner enables **stock tracking**, creates the size/color combinations, and enters their actual quantities. Stock groups must be required single selections; products with no options have one general stock quantity. Up to 150 combinations are supported. Orders reserve stock in the transaction; cancellation restores it once. Product/stock revisions reject edits based on obsolete values. Order price snapshots remain immutable.

The checkout uses `place_order_v4` with one identity retained across uncertain retries in the browser session. The server stores only a payload hash and receipt for idempotency, scoped to the authenticated customer. Reopening the checkout restores an uncertain attempt; checking purchase history confirms its receipt. Profile addresses are optional; delivery orders require an address. Customer correction/deletion requests are reviewed by platform administrators; submitting a request never deletes an account automatically. WhatsApp authentication is not enabled.
