'use strict';
window.DarayaPrivacyConsent=function(kind){
 const lang=window.ShahinI18n?.language||'ar';
 const messages={
 near:{ar:'نستخدم موقعك لترتيب الأماكن القريبة أثناء التصفح. يمكنك الرفض واختيار المنطقة يدويًا. هل تريد المتابعة إلى إذن الموقع؟',en:'Use your location to sort nearby places while browsing? You can cancel and choose an area by hand.',de:'Standort zum Sortieren naher Orte verwenden? Du kannst abbrechen und ein Viertel manuell auswählen.'},
 delivery:{ar:'يمكنك إضافة موقعك إلى عنوان هذا الطلب. ستصل النقطة للمتجر وإدارة المنصة ومندوب التوصيل المعيّن. يمكنك الرفض وكتابة العنوان أو تحديد نقطة يدويًا. هل تريد المتابعة؟',en:'Add your location to this order? The shop, platform staff and assigned driver can see the point. You can cancel and enter an address or choose a map point.',de:'Standort für diesen Auftrag verwenden? Geschäft, Plattformverwaltung und zugewiesener Fahrer können den Punkt sehen. Alternativ Adresse oder Kartenpunkt manuell eingeben.'},
 business:{ar:'سيُستخدم موقعك لتحديد عنوان النشاط. عند الموافقة ونشر الصفحة يصبح موقع النشاط متاحًا للزوار. يمكنك تحديده يدويًا بدل GPS. هل تريد المتابعة؟',en:'Use your location for your business address? The business point becomes public when the page is approved and published. You can choose it on the map instead.',de:'Standort als Geschäftsadresse verwenden? Der Punkt wird nach Freigabe und Veröffentlichung öffentlich. Du kannst ihn stattdessen manuell auf der Karte wählen.'},
 driver:{ar:'ستُرسل تحديثات موقعك أثناء التوصيلة ليشاهدها الزبون المعني ويتابع وصولك. المشاركة اختيارية أثناء فتح صفحة المندوب؛ يمكنك إيقافها بزر إيقاف مشاركة موقعي. هل تريد بدء المشاركة؟',en:'Send your location updates during this delivery so this customer can track you? Sharing is optional while the driver page is open. You can stop it with Stop sharing.',de:'Standortaktualisierungen während dieser Lieferung an den jeweiligen Kunden senden? Die Freigabe ist bei geöffneter Fahrerseite freiwillig und kann mit Freigabe beenden gestoppt werden.'}
 };
 return window.confirm(messages[kind]?.[lang]||messages[kind]?.ar||'');
};
