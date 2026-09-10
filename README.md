# Raspored — web verzija za iPhone i Android (PWA)

Ista aplikacija kao Android verzija (Danas, Tjedan, Uredi, Predmeti, Postavke; ispiti, zadaće, jednokratne promjene, praznici, "U torbu" s prognozom, izvoz/uvoz), napravljena kao web-aplikacija koja se na iPhoneu dodaje na početni zaslon i radi offline. Podaci su u istom JSON formatu, pa `raspored-4c.json` iz Android verzije radi i ovdje.

Jedna adresa služi oba telefona: na iPhoneu se prikazuje u iOS stilu, na Androidu automatski u Material 3 stilu. Ista datoteka izvoza radi u web verziji na oba telefona i u Android APK aplikaciji, pa se raspored prenosi izvozom i uvozom.

Što web verzija **ne može** (ni na iOS-u ni na Androidu): obavijesti u pozadini (podsjetnici za ispite) i widgete. Na Androidu za to postoji APK verzija.

## Objava preko GitHub Pages (besplatno, bez računala)

1. Na GitHubu napravi novi **javni** repozitorij, npr. `raspored-web`.
2. Uploadaj sve datoteke iz ove mape u korijen repozitorija: `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js` i mapu `icons`.
3. U repozitoriju otvori **Settings → Pages**. Pod *Build and deployment* odaberi **Source: Deploy from a branch**, granu `main` i mapu `/ (root)`, pa **Save**.
4. Nakon minute-dvije adresa je `https://TVOJE-IME.github.io/raspored-web/` (piše i na toj stranici).

Svaki novi commit automatski objavi novu verziju; aplikacija na telefonu je pokupi pri sljedećem otvaranju s internetom.

## Dodavanje na iPhone

1. Otvori adresu u **Safariju** (ne u Chromeu — samo Safari može dodati web-aplikaciju).
2. Gumb **Dijeli** (kvadrat sa strelicom) → **Dodaj na početni zaslon** → **Dodaj**.
3. Otvori ikonu Raspored s početnog zaslona. Radi bez adresne trake, offline, u svijetlom i tamnom načinu.
4. Postavke → Podaci → **Uvoz** i odaberi `raspored-4c.json` (prethodno spremljen u aplikaciju Datoteke / iCloud Drive).

## Dodavanje na Android

1. Otvori adresu u **Chromeu**.
2. Chrome obično sam ponudi "Instaliraj aplikaciju" (traka pri dnu). Ako ne, u aplikaciji Postavke → Instalacija → **Instaliraj**, ili u Chromeu izbornik ⋮ → **Dodaj na početni zaslon / Instaliraj aplikaciju**.
3. Aplikacija se otvara bez adresne trake, vidljiva je u ladici aplikacija i radi offline.
4. Postavke → Podaci → **Uvoz** i odaberi `raspored-4c.json` (ili izvoz iz APK aplikacije).

## Napomene

- Podaci se čuvaju u Safariju za tu web-aplikaciju. Ako je izbrišeš s početnog zaslona, podaci se brišu — zato ih povremeno **izvezi** (Postavke → Podaci → Izvoz otvara iOS izbornik za dijeljenje, spremi u Datoteke).
- Zaključavanje uređivanja, "U torbu" (uključujući logiku danas/sutra po smjeni), praznici i jednokratne promjene rade jednako kao na Androidu.
- Prognoza dolazi s Open-Meteo bez računa; radi samo uz internet, ostatak aplikacije radi offline.
- Ako promijeniš `app.js` ili `styles.css`, u `sw.js` povećaj broj verzije (`raspored-v2` → `v3`) da telefoni sigurno preuzmu novu verziju. Aplikacija instalirana s iste adrese ažurira se sama pri sljedećem otvaranju s internetom.
