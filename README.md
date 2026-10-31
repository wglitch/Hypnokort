# Hypnokort

En mobilanpassad svensk kortlek och övningsbank för hypnos, NLP och språkligt flöde. Statisk webbapp utan server, konto eller AI-analys.

## Version 1.1

- 86 egna svenska kortförslag: 56 hypnos-/Miltonkort, 20 NLP-övningskort och 10 kort om tillåtelse och nyanser.
- Kort över hela skärmen, bläddring, slumpning och förklaringar på begäran. Sökning, favoritfilter, kortöversikt och navigering i biblioteket.
- Stilla geometriska bakgrunder: nästlade fyrkanter, diagonala fyrkanter och cirklar centrerade vid ”Svara på:”. Inga konstbilder.
- 11 övningar: MUS, yes-set, no-set, compliance-set, inbäddade uppmaningar, alternativfrågor, omramning, konkret–öppet–konkret, väv in ord, berättande och metamodellen.
- Timer med paus och återställning. Nya ord var tionde sekund i flödesövningen.
- Textfält för skrivna eller tangentbordsdikterade försök. Inbäddade uppmaningar har enbart egen övning och utvärdering.
- Ljudpass med valbara övningar, svensk systemuppläsning, övningstid och pauser. Ingen ljudinspelning.
- Favoriter, anteckningar och visade kort sparas i localStorage. Export/import mellan enheter.

NLP-korten använder ”Svara på:” medan hypnoskorten visar fraser och mallar. M10 är undanlagd och M43 sammanförd med M23. De tio senast föreslagna extra fraserna har inte lagts till, enligt användarens önskemål. Innehållet är en prototyp; ”Arbetsförslag” betyder att ordalydelsen fortfarande är öppen.

## Publicering

GitHub Pages med GitHub Actions som källa. Workflow finns i `.github/workflows/pages.yml`. Endast appfilerna publiceras i Pages-artefakten. Arbetsanteckningar och utvecklingsskript finns i repot men inte i webbappens publicerade katalog.

Webbadress: https://wglitch.github.io/Hypnokort/

Ingen installation eller byggkedja behövs. Alla interna länkar är relativa för att fungera under ett repositorynamn.

## Lokal körning

```sh
python -m http.server 4173
```

Öppna http://localhost:4173. Använd HTTP, inte `file://`, eftersom appen hämtar `data.json`.

## Innehåll och fortsatt arbete

- `data.json`: kort och övningar som webbappen använder.
- `docs/arbetsanteckningar.md`: bevarade redaktionella beslut och idéer så att även dator-Codex kan fortsätta arbetet.
- `scripts/build-content.py`: återskapar data från anteckningarna samt de redaktionella kompletteringarna i skriptet. Redigera båda källorna vid regenerering; direkta ändringar i `data.json` skrivs över.
- `app.js`, `style.css`, `index.html`: gränssnitt och logik.

AI-analys är uttryckligen uppskjuten till version 2.0. Inga hemligheter eller API-nycklar behövs för version 1.

## Kontroller och begränsningar

`node --check app.js` kontrollerar syntax. `scripts/check-browser.py` innehåller webbläsarkontroller för kort, lokal lagring, filter, anteckningar, timers, ordvävning och ljudpassets styrning. Kräver Python Playwright, Chromium på `/usr/bin/chromium` och en HTTP-server. Ljudflödet kan testas med simulerad uppläsning; faktisk svensk röst behöver provas på en fysisk enhet.

Svenska uppläsningsröster och funktion med låst skärm varierar mellan enheter och webbläsare. Håll sidan öppen under ljudpass. Vid övergång till annan sida stoppas passet. Inget garanterat bakgrundsljud eller offline-läge ingår i version 1. Tangentbordsdiktering är en funktion i iOS, inte en egen taligenkännare i appen.

Google Fonts används för typografi, med lokala systemtypsnitt som reserv. Appen har ingen analysmätning och skickar inga övningstexter till någon tjänst. Webbläsarens uppläsning och iOS-diktering hanteras av respektive plattform.

## Bakgrund

Egna svenska bearbetningar utifrån språkbyggstenar främst i Mike Mandels kort, med Salad och Zebu som jämförelsematerial. Ingen officiell eller fullständig återutgivning av någon kommersiell kortlek. Kommentarerna beskriver språkliga konstruktioner, inte garanterade psykologiska effekter.
