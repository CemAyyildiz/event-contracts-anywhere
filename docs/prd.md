# Event Contracts Anywhere — Product Requirements Document (BMAD)

> BMAD formatı. `docs/prd.md` olarak kullan. Kaynak analiz: `event-contracts-anywhere-PRD.md` (v1.1) + discovery plan.
> Bağlam: Somnia × DreamDEX Event Contracts Hackathon · Shannon Testnet (chain 50312) · deadline 11 Eylül 2026 21:00.

## Goals and Background Context

### Goals
- DreamDEX arayüzüne hiç girmemiş kullanıcılardan, üçüncü-taraf yüzeylere gömülü bir widget üzerinden Shannon testnet'te ölçülebilir Event Contract trade akışı üretmek.
- İlk-dokunuştan-settle'a: sıfır signup, sıfır cüzdan kurulumu, sıfır gas prompt.
- Her widget bahsinin order book'a likidite eklediğini on-chain göstermek (`mintSet`-garantili-fill).
- Host başına doğrulanabilir attribution + otomatik ödeme.
- 2–3 dakikalık demoda jürinin QR'dan kendi dokunuşuyla canlı fill görmesi.

### Background Context
DreamDEX Event Contract marketlerinin büyük çoğunluğu hiç işlem görmüyor ("5.000 marketin %83,5'i sıfır trade"). Sebep ürün değil dağıtım: tek giriş yolu "DreamDEX'e git → cüzdan bağla → Somnia + tUSDC/STT edin → yeni arayüz öğren". Hackathon'a giren ~70 projenin neredeyse tamamı arz tarafı (likidite kasaları, AI agent, fiyatlama, hedge, güvenlik); kimse talep/dağıtım kurmuyor. Event Contracts Anywhere, Event Contracts'ı kullanıcının zaten olduğu kripto yüzeylerine (Telegram, haber sitesi, yayın) gömülebilir bir Up/Down widget'ı olarak taşır; widget'ı gömen host yönlendirdiği hacimden pay alır (prediction bahisleri için Stripe/affiliate modeli). Kapsam DoraHacks etkinlik sayfasına karşı doğrulandı: "consumer-facing trading application" + "social prediction product" kategorilerine giriyor, format kısıtı yok.

### Change Log
| Tarih | Sürüm | Açıklama | Yazar |
|---|---|---|---|
| 2026-09-09 | 0.1 | İlk BMAD PRD; analiz dokümanından türetildi | Cem + Claude |

## Requirements

### Functional
- **FR1:** Sistem, tarayıcıda üretilen bir burner key ile `@somnia-chain/markets-sdk` üzerinden Somnia Shannon testnet'te gerçek bir DreamDEX Event Contract order'ı yerleştirir.
- **FR2:** İlk etkileşimde widget, hiçbir signup ekranı veya harici cüzdan prompt'u olmadan bir burner keypair üretip client storage'a şifreli yazar.
- **FR3:** Resting-order anında dolmuyorsa widget, complete set mint edip (1 tUSDC → 1 Up + 1 Down) istenmeyen bacağı IOC ile order book'a satarak anında yönlü fill garantiler.
- **FR4:** Sponsor servisi, yeni bir burner adresini adres başına tam bir kez minimal STT (gas) + 1 tUSDC (stake) ile fonlar; host başına/gün ve IP/Telegram-kullanıcı başına rate-limit uygular.
- **FR5:** Mevcut market son kullanmaya 60 sn'den yakınsa widget otomatik olarak bir sonraki pencerenin marketine geçer.
- **FR6:** Market settle olduğunda kazanan pozisyonlar kullanıcı aksiyonu olmadan redeem edilir (Reactivity kontratı veya backend watcher fallback).
- **FR7:** Her order gömen host'a atfedilir: on-chain `RouterAttribution` kontratı `Traded(user, hostId, size, side)` emit ederek, ya da off-chain `burnerAddress→hostId` haritası + settlement indexer ile.
- **FR8:** Host bir payout adresi register eder ve bir `hostId` ile kopyala-yapıştır embed snippet'i alır (script tag + Telegram Mini App deep link).
- **FR9:** Host paneli indexer'dan canlı kümülatif yönlendirilen hacim, tekil cüzdan sayısı ve birikmiş kazanç gösterir.
- **FR10:** Widget tek kod tabanından hem (a) herhangi bir web sayfasına `<script>` ile enjekte edilen iframe hem (b) Telegram Mini App olarak render olur.
- **FR11:** Widget yalnızca seçili market için canlı odds ve top-of-book'u SDK WebSocket'inden gösterir (REST fallback).
- **FR12:** Settle sonrası widget çözülen sonucu ve P&L'i gösterir; kullanıcının geçmiş bahislerini lokal tutar.
- **FR13:** Aynı tarayıcı/Mini App'te dönen kullanıcı aynı burner'ı ve session bakiyesini devralır.
- **FR14:** Session bakiyesi bitince widget tek seferlik top-up ister (testnet: faucet/sponsor; deposit akışı mainnet/Relay için stub).

### Non-Functional
- **NFR1:** Dokunuş→pozisyon-açık gecikmesi Shannon testnet'te p50 ≤ 5 sn.
- **NFR2:** Burner private key hiçbir backend'e iletilmez; backend yalnız sponsor tx'leri ve okuma API'leri yapar.
- **NFR3:** Sponsor riski adres başına (1×), host/gün ve IP başına cap'lerle sınırlı; ilk stake ≤ 1 tUSDC.
- **NFR4:** Widget bundle orta seviye mobil bağlantıda ≤ 2 sn render; SDK import'ları tree-shake'li.
- **NFR5:** Tüm kontratlar ve widget kaynağı public (MIT); `RouterAttribution` explorer'da verified.
- **NFR6:** Nazik degradasyon: Reactivity yoksa → watcher; kontrat-route'lu mint yoksa → off-chain attribution; WS yoksa → REST polling.
- **NFR7:** v1'de mainnet yok, gerçek para yok, KYC yok.

## User Interface Design Goals

### Overall UX Vision
Tek yüzey, tek karar. Kullanıcı içeriğin akışını bırakmadan bir dokunuşla tahminini koyar ve sonucu görür. Çekirdek döngüde modal yok, cüzdan-bağla ekranı yok.

### Key Interaction Paradigms
- İki büyük buton: **Up / Down**.
- Canlı mini grafik + strike çizgisi + güncel Up olasılığı.
- Boyut seçici (preset: 1 / 5 / 25 tUSDC).
- Durum alanı: idle → "pozisyon açık + canlı P&L" → "çözüldü: sonuç + P&L".
- İnce bakiye/geçmiş çekmecesi (drawer).

### Core Screens and Views
- Widget (embed / Mini App) — tek ekran, 3 durum.
- Demo "haber makalesi" sayfası (widget gömülü).
- Host paneli: register → embed kodu → canlı metrikler.

### Accessibility
Yok (hackathon). Kontrast ve dokunma hedef boyutuna dikkat.

### Branding
Karanlık tema varsayılan. Minimal, "gömüldüğü yere yakışan" nötr stil. Somnia/DreamDEX değil, host içeriğiyle uyum önceliği.

### Target Device and Platforms
Web Responsive; birincil hedef mobil (320px, Telegram Mini App) + ~360×480 iframe.

## Technical Assumptions

### Repository Structure: Monorepo
pnpm workspaces.

### Service Architecture
- `packages/trade-core` — SDK sarmalayıcı (client factory, market seçimi, mintSet-garantili-fill, redeem).
- `packages/widget` — React + Vite; SDK'yi **client-side** burner key ile çalıştırır; embed loader (`w.js`).
- `packages/contracts` — Foundry; `RouterAttribution` (+ opsiyonel Reactivity redeem).
- `apps/sponsor` — Node (Hono/Express); ilk-bahis fonlama + cap'ler.
- `apps/indexer` — Node + viem log subscription; per-host agregasyon; SQLite/Postgres.
- `apps/dashboard` — Next.js; host register + metrikler.
- Hosting: widget + dashboard → Vercel; sponsor + indexer → Railway.

### Testing Requirements
- `trade-core`: bir entegrasyon testi tam turu Shannon'da geçirir (`fund → mintSet → trade → redeem`).
- `contracts`: `RouterAttribution` için Foundry unit testleri.
- Başka test yok; CI yok; manuel deploy.

### Additional Technical Assumptions and Requests
- TypeScript her yerde; Solidity kontratlar.
- Testnet: `NETWORK=testnet`, chain `50312`, RPC `https://dream-rpc.somnia.network`, REST `https://stg.api.dreamdex.io/v0`, WS `wss://stg.api.dreamdex.io/v0/ws/public`. Faucet `testnet.somnia.network`.
- `@somnia-chain/markets-sdk` ^0.29.0 + `viem`.
- Gas sponsorluğu: burner adresi ufak STT ile önceden beslenir (SDK meta-tx desteklemiyorsa forwarder yok).
- `createOrder(symbol, "limit", side, amount, price, { timeInForce: "IOC" })`; fiyat = Up olasılığı (0,1).
- **Açık teyitler (Epic 1 spike):** (a) Shannon'da canlı çözülen BTC/ETH kısa-pencere EC marketi var mı; (b) bir kontrat binary-pool ABI'de funder adına mint/trade edebiliyor mu; (c) Reactivity Shannon'da erişilebilir mi.

## Epic List

1. **Epic 1 — Testnet Trade Core & Spike Doğrulama:** Shannon EC ortamını doğrula ve `fund→mintSet-fill→redeem`'i yeniden kullanılabilir bir modül olarak kur. *Deployable: gerçek bir EC trade'ini açıp settle eden CLI.*
2. **Epic 2 — Gömülebilir Up/Down Widget (web):** Canlı market görünümü + Up/Down + durum/sonuç + `<script>` embed + demo sayfası. *Deployable: ilk kez gelen birinin trade edebildiği hosted widget.*
3. **Epic 3 — Sıfır-Kurulum Onboarding:** Burner cüzdan + sponsor servisi (ilk-bahis fonlama) + Telegram Mini App. *Deployable: Telegram içinden sıfır kurulumla trade.*
4. **Epic 4 — Host Attribution & Panel:** RouterAttribution (veya off-chain fallback) + indexer + register/embed/canlı-kazanç paneli. *Deployable: host register olur, embed kodu alır, kazancını canlı görür.*
5. **Epic 5 (stretch) — Auto-Settlement, Pilot & Demo Cilası:** Reactivity auto-redeem, pilot sayaçları, 2–3 gerçek gruba deploy, demo videosu + feedback raporu.

---

## Epic 1 — Testnet Trade Core & Spike Doğrulama

**Genişletilmiş hedef:** Tüm mimari 3 doğrulamaya dallanıyor. Bu epic önce onları kesin sonuca bağlar, sonra widget'ın çekirdek trade mantığını (`trade-core`) izole, test edilebilir bir paket olarak üretir. Bitişte: komut satırından gerçek bir Shannon EC pozisyonu açılıp settle edilebiliyor.

### Story 1.1 — Spike: Shannon EC ortamını doğrula
As a builder, I want to confirm a live, resolving Event Contract market exists on Shannon, so that the whole "testnet prototype" premise is validated before I build.
**AC:**
1. `pnpm spike:markets` script'i `loadMarkets(true)` + WS ile ≥1 aktif binary market'i time-to-expiry ile yazdırır.
2. En az bir BTC veya ETH kısa-pencere marketinin açılıp ~dakikalar içinde settle olduğu gözlemlenir ve `docs/spike.md`'ye kaydedilir.
3. Canlı EC marketi bulunamazsa: dev Telegram'a soru gönderilir, `docs/spike.md`'de GO/NO-GO ve alternatif ("read-only mainnet + testnet tx") not edilir.

### Story 1.2 — trade-core: SDK client factory + market seçimi
As a developer, I want a helper that returns the nearest tradeable window, so that a tap always lands in a valid market.
**AC:**
1. `createExchange(env)` yapılandırılmış `SomniaMarkets` döner (indexerUrl, chain, wsRpc, addresses, privateKey).
2. `getTradeableMarket(asset)` >60 sn kalan aktif binary market döner; yoksa successor'ı seçer.
3. Smoke çalıştırması bir market id + Up sembolü + top-of-book yazdırır.

### Story 1.3 — trade-core: mintSet-garantili-fill alım
As a user, I want my directional bet to fill instantly even in a thin book, so that I don't bounce.
**AC:**
1. `buyGuaranteed({ market, side, sizeUsdc })` verilen tarafta net pozisyon açar.
2. Kitap yeterince derinse düz limit-IOC yolu kullanılır; değilse `mintSet` → istenmeyen bacağı IOC sat yolu kullanılır.
3. Fonksiyon net pozisyon + tüm tx hash'lerini döner; explorer'da doğrulanır.
4. Yetersiz bakiye / market kapalı durumları anlamlı hata döner.

### Story 1.4 — trade-core: settle sonrası redeem
As a user, I want winnings claimed automatically, so that I never touch a claim button.
**AC:**
1. `redeem(market)` settle olmuş kazanan pozisyonu holder'a öder, payout döner.
2. Kaybeden/settle olmamış pozisyonda no-op + net durum döner.
3. Entegrasyon testi `fund→buyGuaranteed→(settle bekle)→redeem` turunu Shannon'da geçer.

### Story 1.5 — Spike: kontrat-route'lu mint fizibilitesi
As an architect, I want to know if a contract can mint/trade on a funder's behalf, so that I choose on-chain vs off-chain attribution.
**AC:**
1. `packages/contracts/solidity` binary-pool ABI incelenir; bir kontratın funder adına set mint edip pozisyon tutabildiği bir minimal Foundry testiyle denenir.
2. Sonuç (`RouterAttribution` mümkün / off-chain fallback gerekli) `docs/spike.md`'ye yazılır.
3. Reactivity'nin Shannon'da erişilebilirliği aynı dokümanda not edilir.

---

## Epic 2 — Gömülebilir Up/Down Widget (web)

**Genişletilmiş hedef:** `trade-core`'u saran, tek ekranlı, üçüncü-taraf bir sayfaya `<script>` ile gömülebilen web widget'ı. Bu epicte cüzdan bir env key ile stub'lanır (gerçek burner Epic 3). Bitişte: bir demo "haber" sayfasında widget'tan testnet'te pozisyon açılıp sonucu görülüyor.

### Story 2.1 — Widget iskeleti + embed loader
**AC:**
1. `<script src=".../w.js" data-host data-market>` boş bir sayfaya widget iframe'i enjekte eder.
2. iframe boyutu postMessage ile içerik yüksekliğine ayarlanır.
3. `data-host` ve `data-market` widget'a geçer; eksikse anlamlı fallback.

### Story 2.2 — Canlı market görünümü
**AC:**
1. Widget seçili market için güncel Up olasılığını ve top-of-book'u gösterir, WS tick'lerinde güncellenir.
2. Mini fiyat grafiği + strike çizgisi + pencere geri sayımı render olur.
3. WS koparsa REST polling'e düşer ve reconnect dener.

### Story 2.3 — Up/Down + boyut → trade-core
**AC:**
1. Boyut presetleri (1/5/25) seçilebilir.
2. Up'a dokunmak (env key ile) demo sayfasından Shannon'da pozisyon açar.
3. Durum alanı "pozisyon açık" + canlı P&L gösterir; pencere <60 sn ise successor'a geçilir.
4. Hata durumları kullanıcıya sade mesajla döner.

### Story 2.4 — Sonuç durumu + lokal geçmiş
**AC:**
1. Settle sonrası widget çözülen sonucu ve P&L'i gösterir.
2. Geçmiş bahisler localStorage'da tutulur ve çekmecede listelenir.
3. Sayfa yenilenince geçmiş ve son durum geri gelir.

### Story 2.5 — Demo web sayfası
**AC:**
1. Sahte "kripto haber makalesi" sayfası deploy edilir, widget makale içine gömülü.
2. Public URL çalışır ve mobilde düzgün render olur.

---

## Epic 3 — Sıfır-Kurulum Onboarding

**Genişletilmiş hedef:** Env key stub'ını gerçek, tarayıcıda üretilen burner cüzdanla değiştir; ilk bahsi sponsor servisiyle fonla; aynı widget'ı Telegram Mini App olarak paketle. Bitişte: temiz bir tarayıcı profili / Telegram'dan, hiçbir kurulum olmadan bahis açılıp settle oluyor.

### Story 3.1 — Burner cüzdan modülü
**AC:**
1. İlk yükleme bir keypair üretir, şifreler, `localStorage` (web) + Telegram `CloudStorage` (TMA) yazar.
2. Yeniden yükleme aynı burner'ı devralır.
3. Key hiçbir ağ isteğinde gönderilmez; sadece `trade-core`'a in-memory verilir.

### Story 3.2 — Sponsor servisi
**AC:**
1. `POST /sponsor {burnerAddr, hostId}` yeni adrese bir kez STT + 1 tUSDC gönderir, tx hash döner.
2. Aynı adrese ikinci çağrı reddedilir.
3. Host/gün ve IP başına cap aşılırsa 429 döner.
4. Faucet cüzdanı ve cap'ler env ile yapılandırılır; bakiye düşükse alarm log'u.

### Story 3.3 — İlk-dokunuş akışını bağla
**AC:**
1. Yeni kullanıcı Up'a dokunur → burner üretilir → `/sponsor` çağrılır → `buyGuaranteed` → pozisyon; hiçbir modal veya signup yok.
2. Temiz tarayıcı profilinde dokunuş→pozisyon ≤ ~15 sn.
3. Sponsor reddederse (cap) kullanıcıya "tek seferlik ücretsiz bahis doldu, yükle" mesajı.

### Story 3.4 — Telegram Mini App sarmalayıcı
**AC:**
1. TMA linki (`t.me/<bot>/app?startapp=<hostId>`) widget'ı Telegram içinde açar.
2. `startapp`'ten `hostId` parse edilir.
3. Burner Telegram `CloudStorage`'da kalıcı; TMA içinden Shannon'da trade çalışır.

### Story 3.5 — Session bakiyesi + tükeniş prompt'u
**AC:**
1. Bakiye = sponsor + kazançlar − stake'ler; widget'ta görünür.
2. Bakiye 0 olunca tek seferlik top-up prompt'u (deposit akışı stub).
3. Top-up stub'ı testnet faucet/sponsor çağrısına bağlı (varsa).

---

## Epic 4 — Host Attribution & Panel

**Genişletilmiş hedef:** Widget'tan geçen her trade'i gömen host'a bağla ve host'un kazancını görüp embed kodu alacağı paneli kur. Epic 1.5 sonucuna göre A (on-chain) veya B (off-chain) kolu.

### Story 4.1A — RouterAttribution kontratı (on-chain kolu)
**AC:**
1. `registerHost(payout) → hostId`, `routeBuy(hostId, market, side, sizeUsdc, maxPrice)`, `claimHostFees(hostId)`.
2. `routeBuy`: tUSDC çek → mint → istenmeyen bacağı sat → (ops) `feeBps` kes → `emit Traded(user, hostId, size, side)`.
3. Foundry testleri geçer; Shannon'a deploy + explorer'da verified.
4. `routeBuy` net pozisyonu `trade-core.buyGuaranteed` ile aynı sonucu verir.

### Story 4.1B — Off-chain attribution (fallback kolu)
**AC:**
1. Burner oluşturulurken backend `burnerAddr→hostId` kaydeder.
2. Indexer o adreslerin settle olan hacmini host'a toplar.
3. 2 host'a dağıtılmış N test trade'inde per-host hacim doğru raporlanır.

### Story 4.2 — Indexer
**AC:**
1. `Traded` loglarına subscribe (kol B'de burner fill'lerini tarar), per-host hacim/cüzdan/kazanç agregasyonu.
2. Dashboard API per-host metrikleri döner, ~1 blok/poll içinde güncellenir.
3. Yeniden başlatmada son işlenen bloktan devam eder.

### Story 4.3 — Host register + embed kodu
**AC:**
1. Host cüzdan bağlar → register → `hostId` alır.
2. Panel çalışan bir snippet verir: `<script>` + TMA linki, `hostId` gömülü.
3. Kopyalanan snippet boş bir sayfada host'a atıflı widget'ı render eder.

### Story 4.4 — Panel canlı metrikler
**AC:**
1. Kümülatif yönlendirilen hacim, tekil cüzdan, birikmiş kazanç gösterilir ve yenilenir.
2. Değerler indexer ile tutarlı.
3. Son işlemler listesi (zaman, boyut, sonuç).

---

## Epic 5 (stretch) — Auto-Settlement, Pilot & Demo Cilası

### Story 5.1 — Reactivity auto-redeem + watcher fallback
**AC:** Kazanan pozisyon settle'dan sonra kullanıcı aksiyonu olmadan redeem olur; Reactivity yoksa watcher servisi yapar; ikisi de log'lar.

### Story 5.2 — Pilot enstrümantasyonu
**AC:** Public `/stats` endpoint'i toplam trade, tekil cüzdan, %ilk-kez döner; demo ekranı bu kümülatif sayıları gösterir.

### Story 5.3 — Gerçek gruplara deploy
**AC:** Widget 2–3 gerçek Telegram grubuna/sayfaya konur; ≥1 harici gerçek kullanıcı trade eder; sayılar yakalanır.

### Story 5.4 — Demo videosu + feedback raporu
**AC:** 2–3 dk demo videosu (problem → tek dokunuş → on-chain kanıt → host paneli → roadmap) kaydedilir; SDK/dok feedback raporu build notlarından yazılır; BUIDL submit edilir.

---

## Next Steps

### Architect Prompt
"`docs/prd.md`'yi al ve `docs/architecture.md` üret. Monorepo (pnpm), `packages/trade-core|widget|contracts` + `apps/sponsor|indexer|dashboard`. Kritik: (1) `@somnia-chain/markets-sdk`'nin client-side burner key ile çalıştırılması ve bundle boyutu; (2) `mintSet`-garantili-fill algoritması (kitap derinliği eşiği, kayma, iade muhasebesi); (3) Epic 1.5 sonucuna göre `RouterAttribution` kontrat arayüzü veya off-chain attribution şeması; (4) sponsor servisi cap/anti-abuse; (5) Reactivity veya watcher ile auto-redeem. Testnet endpoint'leri Technical Assumptions'ta."

### UX Prompt
"Tek ekran, üç durum (idle / pozisyon açık / çözüldü), 320px + iframe. Up/Down iki büyük buton, mini grafik + strike, boyut presetleri, ince bakiye/geçmiş çekmecesi. Çekirdek döngüde modal yok, cüzdan-bağla yok. Karanlık tema, host içeriğiyle uyumlu nötr stil."

### BMAD çalıştırma notu (2 gün — sıkıştırılmış seremoni)
1. `docs/prd.md` (bu) + `docs/architecture.md` (architect) hazır olsun.
2. `@po` ile shard: `docs/epics/*`, `docs/stories/*`.
3. Epic 1'i tam BMAD döngüsüyle koştur (`@sm` draft → `@dev` → hızlı manuel QA). Spike'lar (1.1, 1.5) önce.
4. Epic 2–4: story başına `@dev`, QA'i manuel demo ile birleştir; her story sonunda deploy edilebilir tut.
5. Epic 5 zaman kalırsa.
