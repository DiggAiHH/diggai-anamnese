/**
 * Phase 8 i18n merge script
 * Adds all new German strings from Phase 8 gap-filling to all 5 locale files.
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');

// All new keys added in Phase 8, with translations for each locale
const newKeys = {
  // ===== FIE-MESS-100: Fieber-Messmethode =====
  "Wie wurde die Temperatur gemessen?": {
    en: "How was the temperature measured?",
    ar: "كيف تم قياس الحرارة؟",
    tr: "Ateş nasıl ölçüldü?",
    uk: "Як було виміряно температуру?"
  },
  "Rektal": {
    en: "Rectal",
    ar: "شرجي",
    tr: "Rektal",
    uk: "Ректально"
  },
  "Oral (im Mund)": {
    en: "Oral (in the mouth)",
    ar: "عن طريق الفم",
    tr: "Oral (ağızda)",
    uk: "Орально (у роті)"
  },
  "Im Gehörgang (Ohrthermometer)": {
    en: "In the ear canal (ear thermometer)",
    ar: "في قناة الأذن (ميزان حرارة الأذن)",
    tr: "Kulak kanalında (kulak termometresi)",
    uk: "У вушному каналі (вушний термометр)"
  },
  "Achsel (axillär)": {
    en: "Armpit (axillary)",
    ar: "تحت الإبط",
    tr: "Koltuk altı (aksiller)",
    uk: "Пахва (аксилярно)"
  },
  "Stirn (kontaktlos)": {
    en: "Forehead (contactless)",
    ar: "الجبهة (بدون تلامس)",
    tr: "Alın (temassız)",
    uk: "Лоб (безконтактно)"
  },

  // ===== FIE-102 expansions: Meningitis red flags =====
  "Lichtempfindlichkeit (Photophobie)": {
    en: "Light sensitivity (photophobia)",
    ar: "حساسية الضوء (رهاب الضوء)",
    tr: "Işık hassasiyeti (fotofobi)",
    uk: "Світлочутливість (фотофобія)"
  },
  "Nackensteifigkeit (Meningismus)": {
    en: "Neck stiffness (meningismus)",
    ar: "تيبس الرقبة (علامات السحايا)",
    tr: "Ense sertliği (meningismus)",
    uk: "Ригідність шиї (менінгізм)"
  },
  "Nackensteifigkeit mit Fieber ist ein Hinweis auf Meningitis! Sofortige ärztliche Abklärung erforderlich.": {
    en: "Neck stiffness with fever indicates meningitis! Immediate medical evaluation required.",
    ar: "تيبس الرقبة مع الحمى يشير إلى التهاب السحايا! يلزم تقييم طبي فوري.",
    tr: "Ateşle birlikte ense sertliği menenjit belirtisidir! Acil tıbbi değerlendirme gereklidir.",
    uk: "Ригідність шиї з лихоманкою вказує на менінгіт! Потрібна негайна медична оцінка."
  },

  // ===== FIE-103 expansions: Exposure risks =====
  "Insektenstiche": {
    en: "Insect bites",
    ar: "لدغات الحشرات",
    tr: "Böcek sokmaları",
    uk: "Укуси комах"
  },
  "Rohmilch / Rohmilchprodukte": {
    en: "Raw milk / raw milk products",
    ar: "حليب خام / منتجات الحليب الخام",
    tr: "Çiğ süt / çiğ süt ürünleri",
    uk: "Сире молоко / продукти з сирого молока"
  },
  "Meeresfrüchte / roher Fisch": {
    en: "Seafood / raw fish",
    ar: "مأكولات بحرية / سمك نيء",
    tr: "Deniz ürünleri / çiğ balık",
    uk: "Морепродукти / сира риба"
  },
  "Sexuelle Kontakte": {
    en: "Sexual contacts",
    ar: "اتصالات جنسية",
    tr: "Cinsel temas",
    uk: "Статеві контакти"
  },
  "Intravenöser Drogenkonsum": {
    en: "Intravenous drug use",
    ar: "تعاطي المخدرات عن طريق الوريد",
    tr: "Damar içi uyuşturucu kullanımı",
    uk: "Внутрішньовенне вживання наркотиків"
  },

  // ===== GEW-100 expansions: Weight loss alarm signs =====
  "Frühe Sättigung": {
    en: "Early satiety",
    ar: "شبع مبكر",
    tr: "Erken tokluk",
    uk: "Раннє насичення"
  },
  "Heiserkeit > 3 Wochen": {
    en: "Hoarseness > 3 weeks",
    ar: "بحة في الصوت > 3 أسابيع",
    tr: "Ses kısıklığı > 3 hafta",
    uk: "Хрипота > 3 тижні"
  },
  "Kau-/Schluckprobleme": {
    en: "Chewing/swallowing problems",
    ar: "مشاكل في المضغ/البلع",
    tr: "Çiğneme/yutma sorunları",
    uk: "Проблеми з жуванням/ковтанням"
  },
  "Dunkle Hautverfärbung (Hyperpigmentierung)": {
    en: "Dark skin discoloration (hyperpigmentation)",
    ar: "تغير لون الجلد الداكن (فرط التصبغ)",
    tr: "Koyu cilt renk değişikliği (hiperpigmentasyon)",
    uk: "Темне забарвлення шкіри (гіперпігментація)"
  },
  "Pilzbefall im Mund (Soor)": {
    en: "Oral thrush (candidiasis)",
    ar: "فطريات الفم (القلاع)",
    tr: "Ağız mantarı (kandidiyazis)",
    uk: "Грибкове ураження рота (кандидоз)"
  },

  // ===== LUNGE-101 through LUNGE-105: Lung sub-flow =====
  "Welche Art von Husten haben Sie?": {
    en: "What type of cough do you have?",
    ar: "ما نوع السعال الذي تعاني منه؟",
    tr: "Nasıl bir öksürüğünüz var?",
    uk: "Який тип кашлю у вас?"
  },
  "Trockener Reizhusten": {
    en: "Dry irritating cough",
    ar: "سعال جاف تهيجي",
    tr: "Kuru tahriş edici öksürük",
    uk: "Сухий подразливий кашель"
  },
  "Produktiv (mit Auswurf)": {
    en: "Productive (with sputum)",
    ar: "منتج (مع بلغم)",
    tr: "Prodüktif (balgamlı)",
    uk: "Продуктивний (з мокротинням)"
  },
  "Wechselnd": {
    en: "Alternating",
    ar: "متناوب",
    tr: "Değişken",
    uk: "Змінний"
  },
  "Kein Husten": {
    en: "No cough",
    ar: "لا يوجد سعال",
    tr: "Öksürük yok",
    uk: "Немає кашлю"
  },
  "Wann treten die Beschwerden auf?": {
    en: "When do the symptoms occur?",
    ar: "متى تحدث الأعراض؟",
    tr: "Şikayetler ne zaman ortaya çıkıyor?",
    uk: "Коли виникають скарги?"
  },
  "Ganzjährig": {
    en: "Year-round",
    ar: "على مدار السنة",
    tr: "Yıl boyunca",
    uk: "Цілий рік"
  },
  "Saisonal (bestimmte Jahreszeit)": {
    en: "Seasonal (specific time of year)",
    ar: "موسمي (وقت محدد من السنة)",
    tr: "Mevsimsel (belirli mevsim)",
    uk: "Сезонно (певний час року)"
  },
  "Situativ (bestimmte Auslöser)": {
    en: "Situational (specific triggers)",
    ar: "ظرفي (محفزات محددة)",
    tr: "Durumsal (belirli tetikleyiciler)",
    uk: "Ситуативно (певні тригери)"
  },
  "Welche Auslöser verschlechtern die Beschwerden?": {
    en: "Which triggers worsen the symptoms?",
    ar: "ما المحفزات التي تزيد الأعراض سوءًا؟",
    tr: "Hangi tetikleyiciler şikayetleri kötüleştiriyor?",
    uk: "Які тригери погіршують скарги?"
  },
  "Allergene (Pollen, Tierhaare, Staub)": {
    en: "Allergens (pollen, pet hair, dust)",
    ar: "مسببات الحساسية (حبوب اللقاح، شعر الحيوانات، الغبار)",
    tr: "Alerjenler (polen, hayvan tüyü, toz)",
    uk: "Алергени (пилок, шерсть тварин, пил)"
  },
  "Kalte Luft": {
    en: "Cold air",
    ar: "هواء بارد",
    tr: "Soğuk hava",
    uk: "Холодне повітря"
  },
  "Infekte der Atemwege": {
    en: "Respiratory infections",
    ar: "التهابات الجهاز التنفسي",
    tr: "Solunum yolu enfeksiyonları",
    uk: "Інфекції дихальних шляхів"
  },
  "Rauch / Staub / Dämpfe": {
    en: "Smoke / dust / fumes",
    ar: "دخان / غبار / أبخرة",
    tr: "Duman / toz / buhar",
    uk: "Дим / пил / випари"
  },
  "Keine erkennbaren Auslöser": {
    en: "No identifiable triggers",
    ar: "لا توجد محفزات واضحة",
    tr: "Belirlenebilir tetikleyici yok",
    uk: "Немає відомих тригерів"
  },
  "Wie häufig haben Sie Beschwerden / Anfälle?": {
    en: "How often do you have symptoms / attacks?",
    ar: "كم مرة تعاني من الأعراض / النوبات؟",
    tr: "Ne sıklıkla şikayetleriniz / ataklarınız oluyor?",
    uk: "Як часто у вас бувають скарги / напади?"
  },
  "Täglich": {
    en: "Daily",
    ar: "يوميًا",
    tr: "Günlük",
    uk: "Щодня"
  },
  "Mehrmals pro Woche": {
    en: "Several times per week",
    ar: "عدة مرات في الأسبوع",
    tr: "Haftada birkaç kez",
    uk: "Кілька разів на тиждень"
  },
  "Etwa einmal pro Woche": {
    en: "About once per week",
    ar: "حوالي مرة في الأسبوع",
    tr: "Haftada yaklaşık bir kez",
    uk: "Приблизно раз на тиждень"
  },
  "Seltener als einmal pro Woche": {
    en: "Less than once per week",
    ar: "أقل من مرة في الأسبوع",
    tr: "Haftada birden az",
    uk: "Рідше ніж раз на тиждень"
  },
  "Nur bei Infekten": {
    en: "Only during infections",
    ar: "فقط أثناء العدوى",
    tr: "Sadece enfeksiyon sırasında",
    uk: "Тільки під час інфекцій"
  },
  "Wie hat sich der Verlauf in den letzten 12 Monaten entwickelt?": {
    en: "How has the condition developed over the last 12 months?",
    ar: "كيف تطورت الحالة خلال الـ 12 شهرًا الماضية؟",
    tr: "Son 12 ayda hastalık seyri nasıl gelişti?",
    uk: "Як розвивався перебіг за останні 12 місяців?"
  },
  "Deutlich besser": {
    en: "Significantly better",
    ar: "أفضل بشكل ملحوظ",
    tr: "Belirgin şekilde daha iyi",
    uk: "Значно краще"
  },
  "Stabil / gleichbleibend": {
    en: "Stable / unchanged",
    ar: "مستقر / بدون تغيير",
    tr: "Stabil / değişmedi",
    uk: "Стабільно / без змін"
  },
  "Schlechter geworden": {
    en: "Gotten worse",
    ar: "أصبح أسوأ",
    tr: "Kötüleşti",
    uk: "Погіршилося"
  },
  "Deutlich schlechter": {
    en: "Significantly worse",
    ar: "أسوأ بشكل ملحوظ",
    tr: "Belirgin şekilde daha kötü",
    uk: "Значно гірше"
  },

  // ===== 1A00 expansions: Eye emergency symptoms =====
  "Rußregen / Mouches volantes": {
    en: "Floaters / Mouches volantes",
    ar: "ذبابات عائمة",
    tr: "Uçuşan cisimler / Mouches volantes",
    uk: "Мушки перед очима / Mouches volantes"
  },
  "Plötzlicher Sehverlust": {
    en: "Sudden vision loss",
    ar: "فقدان مفاجئ للبصر",
    tr: "Ani görme kaybı",
    uk: "Раптова втрата зору"
  },
  "Gesichtsfeldausfälle": {
    en: "Visual field loss",
    ar: "فقدان المجال البصري",
    tr: "Görme alanı kaybı",
    uk: "Випадіння полів зору"
  },
  "Schleiersehen": {
    en: "Blurred vision / veil over eyes",
    ar: "رؤية ضبابية",
    tr: "Bulanık görme",
    uk: "Пелена перед очима"
  },
  "Plötzlicher Sehverlust ist ein Notfall! Sofortige augenärztliche Vorstellung erforderlich.": {
    en: "Sudden vision loss is an emergency! Immediate ophthalmological evaluation required.",
    ar: "فقدان البصر المفاجئ حالة طوارئ! يلزم تقييم طب العيون الفوري.",
    tr: "Ani görme kaybı acil bir durumdur! Acil göz muayenesi gereklidir.",
    uk: "Раптова втрата зору — це невідкладний стан! Потрібна негайна офтальмологічна оцінка."
  },

  // ===== BRUST-100 expansions =====
  "Lageabhängig (verstärkt durch bestimmte Position)": {
    en: "Position-dependent (worsened by certain positions)",
    ar: "يعتمد على الوضعية (يتفاقم بأوضاع معينة)",
    tr: "Pozisyona bağlı (belirli pozisyonlarda artar)",
    uk: "Залежний від положення (посилюється в певних позиціях)"
  },
  "Atemabhängig (verstärkt bei Ein-/Ausatmung)": {
    en: "Breathing-dependent (worsened during in-/exhalation)",
    ar: "يعتمد على التنفس (يتفاقم أثناء الشهيق/الزفير)",
    tr: "Nefese bağlı (nefes alıp vermede artar)",
    uk: "Залежний від дихання (посилюється при вдиху/видиху)"
  },

  // ===== ERBRECH-100 expansion =====
  "Schwangerschaft ausgeschlossen?": {
    en: "Pregnancy ruled out?",
    ar: "هل تم استبعاد الحمل؟",
    tr: "Gebelik dışlandı mı?",
    uk: "Вагітність виключена?"
  },

  // ===== DURCHF-100 expansions =====
  "Breiig": {
    en: "Mushy",
    ar: "طري",
    tr: "Hamurumsu",
    uk: "Кашкоподібний"
  },
  "Übelriechend (fötide)": {
    en: "Foul-smelling (fetid)",
    ar: "كريه الرائحة",
    tr: "Kötü kokulu (fetid)",
    uk: "Смердючий (фетидний)"
  },
  "Fettig / glänzend (Steatorrhoe)": {
    en: "Fatty / greasy (steatorrhea)",
    ar: "دهني / لامع (إسهال دهني)",
    tr: "Yağlı / parlak (steatore)",
    uk: "Жирний / блискучий (стеаторея)"
  },
  "Nach verdorbenen Speisen": {
    en: "After spoiled food",
    ar: "بعد طعام فاسد",
    tr: "Bozulmuş yiyeceklerden sonra",
    uk: "Після зіпсованої їжі"
  },
  "Andere Personen ebenfalls betroffen": {
    en: "Other persons also affected",
    ar: "أشخاص آخرون متأثرون أيضًا",
    tr: "Diğer kişiler de etkilendi",
    uk: "Інші особи також постраждали"
  },

  // ===== KOLIK-100 expansions =====
  "Gelbe Bindehäute (Ikterus)": {
    en: "Yellow conjunctivae (jaundice)",
    ar: "اصفرار ملتحمة العين (يرقان)",
    tr: "Sarı konjonktiva (sarılık)",
    uk: "Жовті кон'юнктиви (жовтяниця)"
  },
  "Dunkler Urin": {
    en: "Dark urine",
    ar: "بول داكن",
    tr: "Koyu renkli idrar",
    uk: "Темна сеча"
  },
  "Heller / entfärbter Stuhl": {
    en: "Pale / discolored stool",
    ar: "براز فاتح اللون / شاحب",
    tr: "Açık renkli / renksiz dışkı",
    uk: "Світлий / знебарвлений кал"
  },
  "Hautjucken": {
    en: "Itching skin",
    ar: "حكة جلدية",
    tr: "Cilt kaşıntısı",
    uk: "Свербіж шкіри"
  },
  "Verminderte Urinmenge": {
    en: "Reduced urine output",
    ar: "انخفاض كمية البول",
    tr: "Azalmış idrar miktarı",
    uk: "Зменшена кількість сечі"
  },
  "Gelbe Bindehäute bei Koliken können auf einen Gallengangsverschluss hinweisen. Bitte zeitnah ärztlich abklären lassen.": {
    en: "Yellow conjunctivae with colic may indicate bile duct obstruction. Please seek medical evaluation promptly.",
    ar: "اصفرار ملتحمة العين مع المغص قد يشير إلى انسداد القناة الصفراوية. يرجى مراجعة الطبيب في أقرب وقت.",
    tr: "Kolik ile birlikte sarı konjonktiva safra yolu tıkanıklığına işaret edebilir. Lütfen en kısa sürede tıbbi değerlendirme yaptırın.",
    uk: "Жовті кон'юнктиви при коліках можуть вказувати на обструкцію жовчних проток. Зверніться до лікаря якнайшвидше."
  },

  // ===== KOLIK-VE-100: Koliken Vorerkrankungen =====
  "Sind folgende Vorerkrankungen bekannt?": {
    en: "Are the following pre-existing conditions known?",
    ar: "هل الأمراض السابقة التالية معروفة؟",
    tr: "Aşağıdaki önceki hastalıklar biliniyor mu?",
    uk: "Чи відомі наступні супутні захворювання?"
  },
  "Bekannte Gallensteine": {
    en: "Known gallstones",
    ar: "حصوات مرارية معروفة",
    tr: "Bilinen safra taşları",
    uk: "Відомі жовчні камені"
  },
  "Bekannte Nierensteine": {
    en: "Known kidney stones",
    ar: "حصوات كلوية معروفة",
    tr: "Bilinen böbrek taşları",
    uk: "Відомі ниркові камені"
  },
  "Endometriose": {
    en: "Endometriosis",
    ar: "بطانة الرحم المهاجرة",
    tr: "Endometriozis",
    uk: "Ендометріоз"
  },

  // ===== VERSTOPF-100 expansions =====
  "Bleistiftstuhl (sehr dünner Stuhl)": {
    en: "Pencil-thin stool (very thin stool)",
    ar: "براز رفيع جداً (كالقلم)",
    tr: "Kalem şeklinde dışkı (çok ince dışkı)",
    uk: "Олівцеподібний кал (дуже тонкий)"
  },
  "Blutauflagerung auf dem Stuhl": {
    en: "Blood on the surface of stool",
    ar: "دم على سطح البراز",
    tr: "Dışkı üzerinde kan",
    uk: "Кров на поверхні калу"
  },
  "Harnverhalt": {
    en: "Urinary retention",
    ar: "احتباس البول",
    tr: "İdrar retansiyonu",
    uk: "Затримка сечі"
  },
  "Bleistiftstuhl kann ein Alarmsymptom für eine Darmerkrankung sein. Bitte lassen Sie dies zeitnah ärztlich abklären.": {
    en: "Pencil-thin stool can be an alarm symptom for bowel disease. Please have this checked by a doctor promptly.",
    ar: "البراز الرفيع يمكن أن يكون عرضًا تحذيريًا لمرض معوي. يرجى مراجعة الطبيب في أقرب وقت.",
    tr: "Kalem şeklinde dışkı bağırsak hastalığı için bir alarm belirtisi olabilir. Lütfen en kısa sürede doktora başvurun.",
    uk: "Олівцеподібний кал може бути тривожним симптомом захворювання кишечника. Зверніться до лікаря якнайшвидше."
  },

  // ===== KS-SYMPT-100: Kopfschmerz-Begleitsymptome =====
  "Haben Sie zusätzlich zu den Kopfschmerzen folgende Symptome?": {
    en: "Do you have the following symptoms in addition to the headache?",
    ar: "هل لديك الأعراض التالية بالإضافة إلى الصداع؟",
    tr: "Baş ağrısına ek olarak aşağıdaki belirtileriniz var mı?",
    uk: "Чи є у вас наступні симптоми на додаток до головного болю?"
  },
  "Donnerschlagkopfschmerz (plötzlich stärkster Schmerz)": {
    en: "Thunderclap headache (sudden worst pain)",
    ar: "صداع الرعد (ألم شديد مفاجئ)",
    tr: "Gök gürültüsü baş ağrısı (ani en şiddetli ağrı)",
    uk: "Грозовий головний біль (раптовий найсильніший біль)"
  },
  "Nackensteifigkeit": {
    en: "Neck stiffness",
    ar: "تيبس الرقبة",
    tr: "Ense sertliği",
    uk: "Ригідність шиї"
  },
  "Sehstörungen / Aura": {
    en: "Visual disturbances / aura",
    ar: "اضطرابات بصرية / هالة",
    tr: "Görme bozuklukları / aura",
    uk: "Порушення зору / аура"
  },
  "Lichtempfindlichkeit": {
    en: "Light sensitivity",
    ar: "حساسية الضوء",
    tr: "Işık hassasiyeti",
    uk: "Світлочутливість"
  },
  "Krampfanfall": {
    en: "Seizure",
    ar: "نوبة تشنجية",
    tr: "Nöbet",
    uk: "Судомний напад"
  },
  "Bewusstlosigkeit / Bewusstseinsstörung": {
    en: "Loss of consciousness / impaired consciousness",
    ar: "فقدان الوعي / اضطراب الوعي",
    tr: "Bilinç kaybı / bilinç bozukluğu",
    uk: "Втрата свідомості / порушення свідомості"
  },
  "Erstmalig aufgetreten und über 50 Jahre alt": {
    en: "First occurrence and over 50 years old",
    ar: "ظهر لأول مرة وعمري فوق 50 سنة",
    tr: "İlk kez ortaya çıktı ve 50 yaş üstü",
    uk: "Вперше виникло і вік понад 50 років"
  },
  "Donnerschlagkopfschmerz kann auf eine Subarachnoidalblutung hinweisen! Sofortiger Notfall – bitte umgehend den Notruf wählen!": {
    en: "Thunderclap headache may indicate subarachnoid hemorrhage! Immediate emergency – please call emergency services immediately!",
    ar: "صداع الرعد قد يشير إلى نزيف تحت العنكبوتية! حالة طوارئ فورية – يرجى الاتصال بالإسعاف فورًا!",
    tr: "Gök gürültüsü baş ağrısı subaraknoid kanamaya işaret edebilir! Acil durum – lütfen derhal acil servisi arayın!",
    uk: "Грозовий головний біль може вказувати на субарахноїдальний крововилив! Негайна невідкладна ситуація – будь ласка, негайно зателефонуйте до екстреної служби!"
  },

  // ===== 7009 expansions: Nerve diseases =====
  "Migräne": {
    en: "Migraine",
    ar: "صداع نصفي",
    tr: "Migren",
    uk: "Мігрень"
  },
  "Neuropathische Schmerzen": {
    en: "Neuropathic pain",
    ar: "ألم عصبي",
    tr: "Nöropatik ağrı",
    uk: "Нейропатичний біль"
  },

  // ===== 7011 expansions: Thyroid diseases =====
  "Autonomie (heißer Knoten)": {
    en: "Autonomy (hot nodule)",
    ar: "استقلالية (عقدة ساخنة)",
    tr: "Otonomi (sıcak nodül)",
    uk: "Автономія (гарячий вузол)"
  },
  "Morbus Basedow": {
    en: "Graves' disease",
    ar: "مرض غريفز",
    tr: "Graves hastalığı",
    uk: "Хвороба Грейвса"
  },
  "Schilddrüsenvergrößerung (Struma)": {
    en: "Thyroid enlargement (goiter)",
    ar: "تضخم الغدة الدرقية (تضخم درقي)",
    tr: "Tiroid büyümesi (guatr)",
    uk: "Збільшення щитоподібної залози (зоб)"
  },

  // ===== APGAR-1, APGAR-5, APGAR-10 =====
  "APGAR-Score nach 1 Minute (falls bekannt):": {
    en: "APGAR score at 1 minute (if known):",
    ar: "مقياس أبغار بعد دقيقة واحدة (إذا كان معروفاً):",
    tr: "1. dakikada APGAR skoru (biliniyorsa):",
    uk: "Оцінка за шкалою Апгар на 1 хвилині (якщо відомо):"
  },
  "APGAR-Score nach 5 Minuten (falls bekannt):": {
    en: "APGAR score at 5 minutes (if known):",
    ar: "مقياس أبغار بعد 5 دقائق (إذا كان معروفاً):",
    tr: "5. dakikada APGAR skoru (biliniyorsa):",
    uk: "Оцінка за шкалою Апгар на 5 хвилині (якщо відомо):"
  },
  "APGAR-Score nach 10 Minuten (falls bekannt):": {
    en: "APGAR score at 10 minutes (if known):",
    ar: "مقياس أبغار بعد 10 دقائق (إذا كان معروفاً):",
    tr: "10. dakikada APGAR skoru (biliniyorsa):",
    uk: "Оцінка за шкалою Апгар на 10 хвилині (якщо відомо):"
  },
  "0–3 (schwer deprimiert)": {
    en: "0–3 (severely depressed)",
    ar: "0–3 (متأثر بشدة)",
    tr: "0–3 (ağır deprese)",
    uk: "0–3 (тяжко пригнічений)"
  },
  "4–6 (mäßig deprimiert)": {
    en: "4–6 (moderately depressed)",
    ar: "4–6 (متأثر بشكل متوسط)",
    tr: "4–6 (orta derecede deprese)",
    uk: "4–6 (помірно пригнічений)"
  },
  "7–10 (lebensfrisch)": {
    en: "7–10 (vigorous / healthy)",
    ar: "7–10 (حيوي / صحي)",
    tr: "7–10 (canlı / sağlıklı)",
    uk: "7–10 (життєздатний / здоровий)"
  },

  // ===== NIUS-100 + NIUS-TAGE =====
  "War ein Aufenthalt auf der neonatalen Intensivstation (NIUS) erforderlich?": {
    en: "Was a stay in the neonatal intensive care unit (NICU) required?",
    ar: "هل كانت الإقامة في وحدة العناية المركزة لحديثي الولادة مطلوبة؟",
    tr: "Yenidoğan yoğun bakım ünitesinde (YDYBÜ) kalış gerekli miydi?",
    uk: "Чи був потрібен перебування у відділенні інтенсивної терапії новонароджених (ВІТН)?"
  },
  "Wie viele Tage dauerte der NIUS-Aufenthalt?": {
    en: "How many days did the NICU stay last?",
    ar: "كم يومًا استمرت الإقامة في وحدة العناية المركزة؟",
    tr: "YDYBÜ'de kalış kaç gün sürdü?",
    uk: "Скільки днів тривав перебування у ВІТН?"
  },

  // ===== MAMMO-100 + DARM-W-100: Women screening =====
  "Wann war Ihre letzte Mammographie?": {
    en: "When was your last mammography?",
    ar: "متى كان آخر تصوير للثدي بالأشعة؟",
    tr: "Son mamografiniz ne zaman yapıldı?",
    uk: "Коли була ваша остання мамографія?"
  },
  "Wann war Ihre letzte Darmkrebs-Vorsorge?": {
    en: "When was your last colorectal cancer screening?",
    ar: "متى كان آخر فحص لسرطان القولون والمستقيم؟",
    tr: "Son kolorektal kanser taramanız ne zaman yapıldı?",
    uk: "Коли було ваше останнє обстеження на колоректальний рак?"
  },

  // ===== A11y UI labels =====
  "Nachricht senden": {
    en: "Send message",
    ar: "إرسال رسالة",
    tr: "Mesaj gönder",
    uk: "Надіслати повідомлення"
  },
  "Verlauf anzeigen": {
    en: "Show history",
    ar: "عرض السجل",
    tr: "Geçmişi göster",
    uk: "Показати історію"
  },
  "Hinweis schließen": {
    en: "Close notice",
    ar: "إغلاق الإشعار",
    tr: "Uyarıyı kapat",
    uk: "Закрити повідомлення"
  },
  "Medikament entfernen": {
    en: "Remove medication",
    ar: "إزالة الدواء",
    tr: "İlacı kaldır",
    uk: "Видалити ліки"
  },
  "Medikament auswählen": {
    en: "Select medication",
    ar: "اختيار الدواء",
    tr: "İlaç seç",
    uk: "Вибрати ліки"
  },
  "Operation entfernen": {
    en: "Remove surgery",
    ar: "إزالة العملية",
    tr: "Ameliyatı kaldır",
    uk: "Видалити операцію"
  },
  "Scanner schließen": {
    en: "Close scanner",
    ar: "إغلاق الماسح الضوئي",
    tr: "Tarayıcıyı kapat",
    uk: "Закрити сканер"
  },
  "PZN eingeben": {
    en: "Enter PZN",
    ar: "أدخل PZN",
    tr: "PZN girin",
    uk: "Введіть PZN"
  },
  "PZN suchen": {
    en: "Search PZN",
    ar: "بحث PZN",
    tr: "PZN ara",
    uk: "Шукати PZN"
  },
  "Sitzungen suchen": {
    en: "Search sessions",
    ar: "بحث الجلسات",
    tr: "Oturumları ara",
    uk: "Шукати сеанси"
  },
  "Filter": {
    en: "Filter",
    ar: "تصفية",
    tr: "Filtre",
    uk: "Фільтр"
  },
  "Schließen": {
    en: "Close",
    ar: "إغلاق",
    tr: "Kapat",
    uk: "Закрити"
  },
  "Anliegen vorwählen": {
    en: "Pre-select concern",
    ar: "اختيار مسبق للمشكلة",
    tr: "Şikayeti önceden seç",
    uk: "Попередньо вибрати скаргу"
  },
  "Arzt zuweisen": {
    en: "Assign doctor",
    ar: "تعيين الطبيب",
    tr: "Doktor ata",
    uk: "Призначити лікаря"
  },
  "Chat öffnen": {
    en: "Open chat",
    ar: "فتح الدردشة",
    tr: "Sohbeti aç",
    uk: "Відкрити чат"
  },
  "Anamnese-Fortschritt": {
    en: "Anamnesis progress",
    ar: "تقدم السيرة المرضية",
    tr: "Anamnez ilerlemesi",
    uk: "Прогрес анамнезу"
  },
  "Anamnese-PDF Vorschau": {
    en: "Anamnesis PDF preview",
    ar: "معاينة ملف السيرة المرضية",
    tr: "Anamnez PDF önizlemesi",
    uk: "Попередній перегляд PDF анамнезу"
  },
  "OCR-Fortschritt": {
    en: "OCR progress",
    ar: "تقدم التعرف الضوئي",
    tr: "OCR ilerlemesi",
    uk: "Прогрес OCR"
  },
  "Unfalltag": {
    en: "Day of accident",
    ar: "يوم الحادث",
    tr: "Kaza günü",
    uk: "День нещасного випадку"
  },
  "Unfallzeit": {
    en: "Time of accident",
    ar: "وقت الحادث",
    tr: "Kaza saati",
    uk: "Час нещасного випадку"
  }
};

function mergeLocale(locale) {
  const filePath = path.join(LOCALES_DIR, locale, 'translation.json');
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  let added = 0;
  let skipped = 0;
  
  for (const [key, translations] of Object.entries(newKeys)) {
    if (existing[key]) {
      skipped++;
      continue;
    }
    
    if (locale === 'de') {
      existing[key] = key; // DE: key = value
    } else {
      existing[key] = translations[locale] || key; // fallback to German
    }
    added++;
  }
  
  // Sort keys alphabetically
  const sorted = {};
  for (const k of Object.keys(existing).sort((a, b) => a.localeCompare(b, 'de'))) {
    sorted[k] = existing[k];
  }
  
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  console.log(`  ${locale}: added ${added}, skipped ${skipped} (already existed)`);
}

console.log('Merging Phase 8 i18n keys...\n');

for (const locale of ['de', 'en', 'ar', 'tr', 'uk']) {
  mergeLocale(locale);
}

console.log('\nDone!');
