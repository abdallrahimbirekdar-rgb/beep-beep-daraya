# مراقبة استهلاك الخدمات

افتح لوحة الإدارة > استهلاك الخدمات. تُجلب القراءات فقط عند الضغط على تحديث الاستهلاك؛ يبقى آخر قياس في هذا المتصفح. لا تظهر هذه الصفحة لصاحب المتجر أو الزائر، ويتحقق الخادم من صلاحية الإدارة أيضًا.

## ربط Supabase

انسخ `supabase/migrations/20261005_service_usage.sql` إلى SQL Editor واضغط Run. الدالة `admin_service_usage` تقرأ حجم قاعدة البيانات وأحجام الملفات المسجلة وعدد الحسابات فقط. لا تحتاج service_role أو مفتاح إدارة في الموقع. تُمنع الحسابات غير الإدارية من قراءة القياسات.

## ربط R2

في Cloudflare > Workers & Pages > daraya-images > Edit code، استبدل الكود بكامل محتوى `cloudflare/images/worker.mjs` ثم Deploy. الكود ملف واحد جاهز للصق، ويحتفظ بمساري عرض الصور ورفعها الحاليين.

ابقِ الربط IMAGES إلى daraya-images والمتغيرات SUPABASE_URL وSUPABASE_ANON_KEY وALLOWED_ORIGINS كما هي. مسار POST `/admin/usage` يحسب أحجام ملفات الحاوية وعددها بعد التحقق من `is_admin` عبر Supabase. لا يكتب أو يحذف ملفات. تُخزَّن قراءته مؤقتًا خمس دقائق لتقليل تكرار فحص الحاوية. كل صفحة فحص هي عملية ListObjects، ويكون الفحص جزئيًا بعد ٢٠ صفحة (حتى ٢٠ ألف ملف)، ويظهر ذلك بوضوح.

## إحصاءات الطلبات والعمليات — اختياري

تعمل مساحة R2 وعدد ملفاته دون مفتاح Cloudflare إضافي. لقراءة طلبات Workers وعمليات R2 على مستوى الحساب:

1. من إعدادات API Tokens في Cloudflare، أنشئ Custom Token بصلاحية Account > Account Analytics > Read، مقيّدًا بحساب الموقع. لا تمنحه صلاحيات الكتابة أو حسابات أخرى.
2. في Worker > Settings > Variables and Secrets، أضف متغير Text باسم CF_ACCOUNT_ID بقيمة Account ID.
3. أضف متغير Secret باسم CF_ANALYTICS_TOKEN بقيمة المفتاح. احفظه وانشر التحديث. لا ترسل المفتاح في الدردشة، ولا تضعه في config.js أو GitHub.
4. افتح لوحة الموقع واضغط تحديث الاستهلاك. إذا لم تتوفر إحدى مجموعات الإحصاءات لخطة الحساب أو المفتاح، يبقى المؤشر غير متصل مع شرح؛ لا يتحول إلى صفر.

## حدود المقارنة ودقة القياسات

اختيار Free / Pro وFree / Paid يدوي، محفوظ في المتصفح، لا يغيّر الاشتراك ولا يكتشفه تلقائيًا. المصادر الرسمية راجعت بتاريخ ٥ أكتوبر ٢٠٢٦.

- Supabase Free: قاعدة بيانات ٥٠٠ ميغابايت، ملفات ١ غيغابايت. Pro: ٨ غيغابايت قرص مشمول و١٠٠ غيغابايت ملفات. حجم قاعدة البيانات لا يساوي كل استخدام القرص أو الاستهلاك المفوتر. أحجام الملفات من metadata تقدير للمخزون الحالي، لا متوسط التخزين خلال دورة الفوترة.
- R2 Standard: مجاني ١٠ GB-month، مليون عملية A وعشرة ملايين B شهريًا على مستوى الحساب. مساحة daraya-images الحالية تشمل الصور والمصغرات ولا تقيس باقي الحاويات أو المتوسط الشهري. العمليات من GraphQL على مستوى الحساب كله، منذ بداية الشهر UTC، وقد تتأخر أو تكون تقديرية أو تتضمن تصنيفات غير معروفة. ليست فاتورة نهائية.
- Workers Free: ١٠٠ ألف طلب يوميًا للحساب. Paid / Standard: عشرة ملايين طلب مشمولة شهريًا. نقيس طلبات الحساب كله؛ CPU وLogs والخدمات الأخرى لها استخدام مستقل غير مقاس هنا.
- نقل بيانات Supabase وMAU والفواتير الدقيقة ليست موصولة بهذا الإصدار؛ الرابط الرسمي موجود في اللوحة. عدد الحسابات لا يساوي MAU، وعدد الزوار لا يساوي طلبات Workers أو قراءة الصور.

المصادر:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/database-size
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/platform/metrics-analytics/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/
- https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/
