# Add signature i18n keys to all locale files

$base = "c:\Users\tubbeTEC\Downloads\Anamnese-kimi\anamnese-app\public\locales"

$translations = @{
  de = @(
    @{ key = "signature.hint"; val = "Bitte unterschreiben Sie mit Ihrem Finger oder der Maus im Feld unten." },
    @{ key = "signature.canvas_label"; val = "Unterschriften-Feld" },
    @{ key = "signature.placeholder"; val = "Hier unterschreiben..." },
    @{ key = "signature.confirmed"; val = "Unterschrift bestaetigt" },
    @{ key = "signature.clear"; val = "Loeschen" },
    @{ key = "signature.confirm"; val = "Unterschrift bestaetigen" },
    @{ key = "signature.redo"; val = "Unterschrift neu zeichnen" },
    @{ key = "signature.dsgvo_title"; val = "Einwilligung unterschreiben" },
    @{ key = "signature.dsgvo_desc"; val = "Bitte unterschreiben Sie zur Bestaetigung Ihrer Einwilligung." },
    @{ key = "signature.decline"; val = "Abbrechen" }
  )
  en = @(
    @{ key = "signature.hint"; val = "Please sign with your finger or mouse in the field below." },
    @{ key = "signature.canvas_label"; val = "Signature field" },
    @{ key = "signature.placeholder"; val = "Sign here..." },
    @{ key = "signature.confirmed"; val = "Confirmed" },
    @{ key = "signature.clear"; val = "Clear" },
    @{ key = "signature.confirm"; val = "Confirm signature" },
    @{ key = "signature.redo"; val = "Draw signature again" },
    @{ key = "signature.dsgvo_title"; val = "Sign consent" },
    @{ key = "signature.dsgvo_desc"; val = "Please sign to confirm your consent." },
    @{ key = "signature.decline"; val = "Cancel" }
  )
  ar = @(
    @{ key = "signature.hint"; val = "يرجى التوقيع بإصبعك أو الماوس في الحقل أدناه." },
    @{ key = "signature.canvas_label"; val = "حقل التوقيع" },
    @{ key = "signature.placeholder"; val = "وقّع هنا..." },
    @{ key = "signature.confirmed"; val = "تم التأكيد" },
    @{ key = "signature.clear"; val = "مسح" },
    @{ key = "signature.confirm"; val = "تأكيد التوقيع" },
    @{ key = "signature.redo"; val = "أعد رسم التوقيع" },
    @{ key = "signature.dsgvo_title"; val = "توقيع الموافقة" },
    @{ key = "signature.dsgvo_desc"; val = "يرجى التوقيع لتأكيد موافقتك." },
    @{ key = "signature.decline"; val = "إلغاء" }
  )
  tr = @(
    @{ key = "signature.hint"; val = "Lutfen asagidaki alana parmaGiniz veya farenizle imzalayin." },
    @{ key = "signature.canvas_label"; val = "Imza alani" },
    @{ key = "signature.placeholder"; val = "Buraya imzalayin..." },
    @{ key = "signature.confirmed"; val = "Onaylandi" },
    @{ key = "signature.clear"; val = "Temizle" },
    @{ key = "signature.confirm"; val = "Imzayi onayla" },
    @{ key = "signature.redo"; val = "Imzayi yeniden ciz" },
    @{ key = "signature.dsgvo_title"; val = "Onayi imzala" },
    @{ key = "signature.dsgvo_desc"; val = "Onayinizi dogrulamak icin lutfen imzalayin." },
    @{ key = "signature.decline"; val = "Iptal" }
  )
  uk = @(
    @{ key = "signature.hint"; val = "Bud laska, pidpishit sya paltsem abo mysheyu u poli nyzhche." },
    @{ key = "signature.canvas_label"; val = "Pole dlya pidpysu" },
    @{ key = "signature.placeholder"; val = "Pidpishit sya tut..." },
    @{ key = "signature.confirmed"; val = "Pidtverd zheno" },
    @{ key = "signature.clear"; val = "Ochystyty" },
    @{ key = "signature.confirm"; val = "Pidtverdyty pidpys" },
    @{ key = "signature.redo"; val = "Namalyuvaty pidpys znovu" },
    @{ key = "signature.dsgvo_title"; val = "Pidpysaty zghodu" },
    @{ key = "signature.dsgvo_desc"; val = "Bud laska, pidpishit sya dlya pidtverdzhennya vashoyi zghody." },
    @{ key = "signature.decline"; val = "Skasuvaty" }
  )
  es = @(
    @{ key = "signature.hint"; val = "Por favor, firme con su dedo o raton en el campo de abajo." },
    @{ key = "signature.canvas_label"; val = "Campo de firma" },
    @{ key = "signature.placeholder"; val = "Firme aqui..." },
    @{ key = "signature.confirmed"; val = "Confirmado" },
    @{ key = "signature.clear"; val = "Borrar" },
    @{ key = "signature.confirm"; val = "Confirmar firma" },
    @{ key = "signature.redo"; val = "Volver a dibujar la firma" },
    @{ key = "signature.dsgvo_title"; val = "Firmar consentimiento" },
    @{ key = "signature.dsgvo_desc"; val = "Por favor, firme para confirmar su consentimiento." },
    @{ key = "signature.decline"; val = "Cancelar" }
  )
  fa = @(
    @{ key = "signature.hint"; val = "Lotfan ba angosht ya mus dar field zir amza konid." },
    @{ key = "signature.canvas_label"; val = "Field amza" },
    @{ key = "signature.placeholder"; val = "Inja amza konid..." },
    @{ key = "signature.confirmed"; val = "Tayid shod" },
    @{ key = "signature.clear"; val = "Pak kardan" },
    @{ key = "signature.confirm"; val = "Tayid amza" },
    @{ key = "signature.redo"; val = "Amza ra dobare bekeshid" },
    @{ key = "signature.dsgvo_title"; val = "Amzay razaynameh" },
    @{ key = "signature.dsgvo_desc"; val = "Lotfan baraye tayid razayat khod amza konid." },
    @{ key = "signature.decline"; val = "Logho" }
  )
  it = @(
    @{ key = "signature.hint"; val = "Si prega di firmare con il dito o il mouse nel campo sottostante." },
    @{ key = "signature.canvas_label"; val = "Campo firma" },
    @{ key = "signature.placeholder"; val = "Firma qui..." },
    @{ key = "signature.confirmed"; val = "Confermato" },
    @{ key = "signature.clear"; val = "Cancella" },
    @{ key = "signature.confirm"; val = "Conferma firma" },
    @{ key = "signature.redo"; val = "Ridisegna la firma" },
    @{ key = "signature.dsgvo_title"; val = "Firmare il consenso" },
    @{ key = "signature.dsgvo_desc"; val = "Si prega di firmare per confermare il consenso." },
    @{ key = "signature.decline"; val = "Annulla" }
  )
  fr = @(
    @{ key = "signature.hint"; val = "Veuillez signer avec votre doigt ou la souris dans le champ ci-dessous." },
    @{ key = "signature.canvas_label"; val = "Champ de signature" },
    @{ key = "signature.placeholder"; val = "Signez ici..." },
    @{ key = "signature.confirmed"; val = "Confirme" },
    @{ key = "signature.clear"; val = "Effacer" },
    @{ key = "signature.confirm"; val = "Confirmer la signature" },
    @{ key = "signature.redo"; val = "Redessiner la signature" },
    @{ key = "signature.dsgvo_title"; val = "Signer le consentement" },
    @{ key = "signature.dsgvo_desc"; val = "Veuillez signer pour confirmer votre consentement." },
    @{ key = "signature.decline"; val = "Annuler" }
  )
  pl = @(
    @{ key = "signature.hint"; val = "Prosze podpisac sie palcem lub mysza w polu ponizej." },
    @{ key = "signature.canvas_label"; val = "Pole podpisu" },
    @{ key = "signature.placeholder"; val = "Podpisz tutaj..." },
    @{ key = "signature.confirmed"; val = "Potwierdzone" },
    @{ key = "signature.clear"; val = "Wyczysc" },
    @{ key = "signature.confirm"; val = "Potwierdz podpis" },
    @{ key = "signature.redo"; val = "Narysuj podpis ponownie" },
    @{ key = "signature.dsgvo_title"; val = "Podpisz zgode" },
    @{ key = "signature.dsgvo_desc"; val = "Prosze podpisac sie w celu potwierdzenia zgody." },
    @{ key = "signature.decline"; val = "Anuluj" }
  )
  ru = @(
    @{ key = "signature.hint"; val = "Pozhaluysta, podpishites paltsem ili myshyu v pole nizhe." },
    @{ key = "signature.canvas_label"; val = "Pole dlya podpisi" },
    @{ key = "signature.placeholder"; val = "Podpishites zdes..." },
    @{ key = "signature.confirmed"; val = "Podtverzhdeno" },
    @{ key = "signature.clear"; val = "Ochistit" },
    @{ key = "signature.confirm"; val = "Podtverdit podpis" },
    @{ key = "signature.redo"; val = "Narisovat podpis snova" },
    @{ key = "signature.dsgvo_title"; val = "Podpisat soglasiye" },
    @{ key = "signature.dsgvo_desc"; val = "Pozhaluysta, podpishites dlya podtverzhdeniya vashego soglasiya." },
    @{ key = "signature.decline"; val = "Otmena" }
  )
}

foreach ($locale in $translations.Keys) {
  $filePath = "$base\$locale\translation.json"
  if (-not (Test-Path $filePath)) {
    Write-Host "SKIP: $locale (file not found)"
    continue
  }
  
  $json = Get-Content $filePath -Raw -Encoding UTF8
  
  $newEntries = ""
  foreach ($entry in $translations[$locale]) {
    $k = $entry.key
    $v = $entry.val
    if ($json -notmatch [regex]::Escape("""$k""")) {
      $newEntries += ",`r`n  ""$k"": ""$v"""
    }
  }
  
  if ($newEntries -ne "") {
    $trimmed = $json.TrimEnd().TrimEnd("`r", "`n").TrimEnd()
    $updated = $trimmed.TrimEnd("}") + $newEntries + "`r`n}"
    Set-Content $filePath -Value $updated -Encoding UTF8 -NoNewline
    Write-Host "Updated $locale"
  } else {
    Write-Host "Already up-to-date: $locale"
  }
}

Write-Host "All done."
