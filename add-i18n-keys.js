const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'public', 'locales');

const translations = {
  de: {
    "signature.hint": "Bitte unterschreiben Sie mit Ihrem Finger oder der Maus im Feld unten.",
    "signature.canvas_label": "Unterschriften-Feld",
    "signature.placeholder": "Hier unterschreiben...",
    "signature.confirmed": "Bestaetigt",
    "signature.clear": "Loeschen",
    "signature.confirm": "Unterschrift bestaetigen",
    "signature.redo": "Unterschrift neu zeichnen",
    "signature.dsgvo_title": "Einwilligung unterschreiben",
    "signature.dsgvo_desc": "Bitte unterschreiben Sie zur Bestaetigung Ihrer Einwilligung.",
    "signature.decline": "Abbrechen"
  },
  en: {
    "signature.hint": "Please sign with your finger or mouse in the field below.",
    "signature.canvas_label": "Signature field",
    "signature.placeholder": "Sign here...",
    "signature.confirmed": "Confirmed",
    "signature.clear": "Clear",
    "signature.confirm": "Confirm signature",
    "signature.redo": "Draw signature again",
    "signature.dsgvo_title": "Sign consent",
    "signature.dsgvo_desc": "Please sign to confirm your consent.",
    "signature.decline": "Cancel"
  },
  ar: {
    "signature.hint": "يرجى التوقيع بإصبعك أو الماوس في الحقل أدناه.",
    "signature.canvas_label": "حقل التوقيع",
    "signature.placeholder": "وقع هنا...",
    "signature.confirmed": "تم التأكيد",
    "signature.clear": "مسح",
    "signature.confirm": "تأكيد التوقيع",
    "signature.redo": "أعد رسم التوقيع",
    "signature.dsgvo_title": "توقيع الموافقة",
    "signature.dsgvo_desc": "يرجى التوقيع لتأكيد موافقتك.",
    "signature.decline": "إلغاء"
  },
  tr: {
    "signature.hint": "Lutfen asagidaki alana parmaGiniz veya farenizle imzalayin.",
    "signature.canvas_label": "Imza alani",
    "signature.placeholder": "Buraya imzalayin...",
    "signature.confirmed": "Onaylandi",
    "signature.clear": "Temizle",
    "signature.confirm": "Imzayi onayla",
    "signature.redo": "Imzayi yeniden ciz",
    "signature.dsgvo_title": "Onayi imzala",
    "signature.dsgvo_desc": "Onayinizi dogrulamak icin lutfen imzalayin.",
    "signature.decline": "Iptal"
  },
  uk: {
    "signature.hint": "Bud laska, pidpishit sya paltsem abo mysheyu u poli nyzhche.",
    "signature.canvas_label": "Pole dlya pidpysu",
    "signature.placeholder": "Pidpishit sya tut...",
    "signature.confirmed": "Pidtverd zheno",
    "signature.clear": "Ochystyty",
    "signature.confirm": "Pidtverdyty pidpys",
    "signature.redo": "Namalyuvaty pidpys znovu",
    "signature.dsgvo_title": "Pidpysaty zghodu",
    "signature.dsgvo_desc": "Bud laska, pidpishit sya dlya pidtverdzhennya vashoyi zghody.",
    "signature.decline": "Skasuvaty"
  },
  es: {
    "signature.hint": "Por favor, firme con su dedo o raton en el campo de abajo.",
    "signature.canvas_label": "Campo de firma",
    "signature.placeholder": "Firme aqui...",
    "signature.confirmed": "Confirmado",
    "signature.clear": "Borrar",
    "signature.confirm": "Confirmar firma",
    "signature.redo": "Volver a dibujar la firma",
    "signature.dsgvo_title": "Firmar consentimiento",
    "signature.dsgvo_desc": "Por favor, firme para confirmar su consentimiento.",
    "signature.decline": "Cancelar"
  },
  fa: {
    "signature.hint": "Lotfan ba angosht ya mus dar field zir amza konid.",
    "signature.canvas_label": "Field amza",
    "signature.placeholder": "Inja amza konid...",
    "signature.confirmed": "Tayid shod",
    "signature.clear": "Pak kardan",
    "signature.confirm": "Tayid amza",
    "signature.redo": "Amza ra dobare bekeshid",
    "signature.dsgvo_title": "Amzay razaynameh",
    "signature.dsgvo_desc": "Lotfan baraye tayid razayat khod amza konid.",
    "signature.decline": "Logho"
  },
  it: {
    "signature.hint": "Si prega di firmare con il dito o il mouse nel campo sottostante.",
    "signature.canvas_label": "Campo firma",
    "signature.placeholder": "Firma qui...",
    "signature.confirmed": "Confermato",
    "signature.clear": "Cancella",
    "signature.confirm": "Conferma firma",
    "signature.redo": "Ridisegna la firma",
    "signature.dsgvo_title": "Firmare il consenso",
    "signature.dsgvo_desc": "Si prega di firmare per confermare il consenso.",
    "signature.decline": "Annulla"
  },
  fr: {
    "signature.hint": "Veuillez signer avec votre doigt ou la souris dans le champ ci-dessous.",
    "signature.canvas_label": "Champ de signature",
    "signature.placeholder": "Signez ici...",
    "signature.confirmed": "Confirme",
    "signature.clear": "Effacer",
    "signature.confirm": "Confirmer la signature",
    "signature.redo": "Redessiner la signature",
    "signature.dsgvo_title": "Signer le consentement",
    "signature.dsgvo_desc": "Veuillez signer pour confirmer votre consentement.",
    "signature.decline": "Annuler"
  },
  pl: {
    "signature.hint": "Prosze podpisac sie palcem lub mysza w polu ponizej.",
    "signature.canvas_label": "Pole podpisu",
    "signature.placeholder": "Podpisz tutaj...",
    "signature.confirmed": "Potwierdzone",
    "signature.clear": "Wyczysc",
    "signature.confirm": "Potwierdz podpis",
    "signature.redo": "Narysuj podpis ponownie",
    "signature.dsgvo_title": "Podpisz zgode",
    "signature.dsgvo_desc": "Prosze podpisac sie w celu potwierdzenia zgody.",
    "signature.decline": "Anuluj"
  },
  ru: {
    "signature.hint": "Pozhaluysta, podpishites paltsem ili myshyu v pole nizhe.",
    "signature.canvas_label": "Pole dlya podpisi",
    "signature.placeholder": "Podpishites zdes...",
    "signature.confirmed": "Podtverzhdeno",
    "signature.clear": "Ochistit",
    "signature.confirm": "Podtverdit podpis",
    "signature.redo": "Narisovat podpis snova",
    "signature.dsgvo_title": "Podpisat soglasiye",
    "signature.dsgvo_desc": "Pozhaluysta, podpishites dlya podtverzhdeniya vashego soglasiya.",
    "signature.decline": "Otmena"
  }
};

let updated = 0;
let skipped = 0;

for (const [locale, keys] of Object.entries(translations)) {
  const filePath = path.join(base, locale, 'translation.json');
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${locale} - file not found`);
    skipped++;
    continue;
  }

  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const existing = JSON.parse(raw);
  let changed = false;

  for (const [key, value] of Object.entries(keys)) {
    if (!existing[key]) {
      existing[key] = value;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`Updated: ${locale}`);
    updated++;
  } else {
    console.log(`Already up-to-date: ${locale}`);
    skipped++;
  }
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
