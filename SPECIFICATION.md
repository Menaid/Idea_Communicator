# Kommunikationsapp med AI-stöd
## Komplett projektspecifikation
**Version:** 2025-11-12

---

## Executive Summary

En innovativ kommunikationsapp för små och medelstora organisationer (5-500 anställda) som kombinerar traditionell chatt och videomöten med AI-driven inspelning, transkribering och sammanfattning. Appens unika värde ligger i spontana möten där deltagare som inte kan vara med i realtid ändå kan ta del av innehållet.

**Kärnfunktioner:** Gruppchatt, video/röstsamtal, automatisk inspelning, AI-transkribering, intelligent sammanfattning, och maximal integritetskontroll med val av lagringsregion och AI-leverantör.

---

## 1. Målgrupp och problem som löses

### 1.1 Målgrupp
- Små till medelstora företag och organisationer (5-500 anställda)
- Organisationer utan fullständiga governance-processer
- Team som arbetar med förbättring och innovation
- EU-baserade företag med höga integritetskrav

### 1.2 Kärnproblem
- Förlorade idéer och insikter vid spontana tankar
- Beroende av att alla är tillgängliga samtidigt
- Otillräcklig dokumentation av spontana diskussioner
- Integritetsproblem med amerikanska molntjänster

### 1.3 Unik värdeproposition
- **Fokus på spontanitet** - 2-3 av 5 deltagare räcker för värdefullt samtal
- **AI-driven inkludering** - alla kan ta del utan att lyssna på långa inspelningar
- **Maximal integritetskontroll** - välj lagringsregion, AI-leverantör, lokal processing
- **EU-first approach** - byggd för europeiska integritetskrav

---

## 2. Funktionella krav och prioritering

**MVP-prioritering:** 4=Kritiskt, 3=Viktigt, 2=Kan vänta

| Funktion | Prioritet | Kommentar |
|----------|-----------|-----------|
| Grupp-videosamtal | 4 | Kärnfunktionalitet |
| Person-till-person chatt | 3 | Viktig användarupplevelse |
| Gruppchatt / Grupp-röstsamtal | 3 | Team-kommunikation |
| Inspelning / Transkribering / AI-sammanfattning | 3 | Unika värdepropositioner |

### 2.1 Roller och behörigheter
- **Vanlig gruppmedlem:** Kan delta, starta samtal, skapa grupper
- **Lokal gruppadmin:** Kan bjuda in/ta bort, konfigurera grupp, godkänna förlängningar
- **Global admin:** Tillgång till alla grupper, övervaka compliance, audit logs

### 2.2 Inspelning och samtycke
- **Vid start:** Fråga om inspelning ska aktiveras
- **Under möte:** Vem som helst kan starta inspelning
- **Alla deltagare måste aktivt samtycka** med loggning
- **Standard lagring:** 6 månader med påminnelser 7 dagar och 1 dag före radering
- **Förlängning** kräver motivering och godkännande

---

## 3. Affärsmodell

| Funktion | FREE | PRO | ENTERPRISE |
|----------|------|-----|------------|
| **Pris** | 0 kr | 199-299 kr/user/mån | Offert |
| **Användare** | Max 3 | 5-50 | 50+ |
| **Inspelningar/mån** | 5 | Obegränsat | Obegränsat |
| **Lagring** | 30 dagar | 6 månader | Obegränsat |
| **AI-val** | Grundläggande | Flera AI + lokal | Alla + dedikerad |
| **Hosting** | EU delad | Val region | On-premise |

---

## 4. Teknisk arkitektur och stack

### 4.1 Systemoversikt
1. **Frontend** - PWA (React + TypeScript)
2. **Backend API** - NestJS eller Python FastAPI
3. **WebRTC Media Server** - mediasoup
4. **Database** - PostgreSQL
5. **Storage** - MinIO (S3-kompatibel)
6. **AI Processing** - Redis queue + workers

### 4.2 Docker-arkitektur

Alla komponenter körs som separata containers:
- `frontend-container` (React PWA via Nginx)
- `api-container` (NestJS/FastAPI)
- `webrtc-container` (mediasoup)
- `database-container` (PostgreSQL)
- `storage-container` (MinIO)
- `redis-container` (queue + cache)
- `ai-worker-containers` (processing)

### 4.3 AI-integration
- **Transkribering:** OpenAI Whisper API eller Deepgram
- **Sammanfattning:** Anthropic Claude API (via AWS EU) eller Mistral AI (EU-alternativ)
- **Lokal AI:** Stöd för Apple Neural Engine, Qualcomm AI Engine (framtida)

### 4.4 EU Hosting-rekommendation

**Primärt val: Hetzner (Tyskland)**
- Datacenter i Tyskland och Finland
- Konkurrenskraftiga priser: ~500-2000 kr/månad för MVP
- Docker och Kubernetes support
- GDPR-compliant

**Alternativ:** OVHcloud (Frankrike), Scaleway (Frankrike)

---

## 5. Säkerhet och GDPR

### 5.1 GDPR-krav (Obligatoriskt)
- **Dataskyddsombud (DPO)** - Obligatoriskt för känslig data i stor skala
- **Dataskyddskonsekvensanalys (DPIA)** - Dokumentera risker och åtgärder
- **Behandlingsregister** - All personuppgiftsbehandling
- **Användarrättigheter:** Radering (30 dagar), dataportabilitet, rättelse, information
- **Samtycke:** Frivilligt, specifikt, informerat, otvetydigt - alltid loggat
- **Incidenthantering:** Rapportering inom 72 timmar

### 5.2 Teknisk säkerhet
- End-to-end kryptering för alla möten
- AES-256 kryptering för lagrad data
- OWASP Top 10 skydd (injection, broken access control, etc.)
- Audit logs för alla kritiska operationer
- Regular security audits och penetration testing

### 5.3 Integritet som konkurrensfördel
- **Val av lagringsregion:** Sverige, EU, USA, Kanada - data lämnar aldrig vald region
- **Val av AI-leverantör:** EU-baserad AI för maximal integritet
- **Lokal AI-processing:** Data behöver aldrig lämna enheten
- **Self-hosting:** Enterprise kan köra on-premise

---

## 6. Utvecklingsplan

**Total tidsestimat:** 15-20 veckor (4-5 månader) för komplett MVP

### Fas 0: Setup (2-3 dagar)
- Docker Desktop, Node.js, Git, VS Code
- API keys: Anthropic Claude, OpenAI Whisper

### Fas 1: Infrastruktur (1-2 veckor) ✅ COMPLETE
- PostgreSQL, Backend API, MinIO, Frontend grundstruktur
- **Leverans:** Registrering, login, tom dashboard

### Fas 2: Grupper och chatt (2-3 veckor) 🔄 NEXT
- Grupphantering, WebSocket, realtids-chatt
- **Leverans:** Fungerande chatt-app

### Fas 3: Video och röst (3-4 veckor)
- mediasoup, WebRTC, video/audio UI
- **Leverans:** Fungerande gruppsamtal

### Fas 4: Inspelning (2-3 veckor)
- Inspelning, samtycke, retention, åtkomst
- **Leverans:** Möten kan spelas in och spelas upp

### Fas 5: AI (3-4 veckor)
- AI workers, transkribering, sammanfattning, sök
- **Leverans:** Komplett AI-funktionalitet

### Fas 6: UX och notiser (2 veckor)
- Push-notiser, vänner/favoriter, onboarding, responsiv design
- **Leverans:** Polerad UX

### Fas 7: Production-ready (2-3 veckor)
- Säkerhet, GDPR-compliance, hosting setup, monitoring, testing
- **Leverans:** Production-ready MVP

---

## 7. Nästa steg

När du är redo att börja:
1. Godkänn denna specifikation ✅
2. Installera Docker Desktop och verifiera att det fungerar ✅
3. Skapa API-konton (Anthropic, OpenAI)
4. Vi börjar med Fas 0 - Claude Code genererar all kod steg för steg ✅
5. Du testar och ger feedback - ingen kodning krävs från dig ✅

### 7.1 Arbetsmetodik
- Claude Code får detta dokument som referens
- All kod genereras automatiskt baserat på spec
- Du kör lokalt i Docker och testar
- Vi justerar tillsammans vid behov
- Fas för fas tills MVP är klart

### 7.2 Kostnad under utveckling
- **MVP-utveckling:** Lokalt på din dator (gratis)
- **AI API-kostnader:** ~100-500 kr/månad under testning
- **Production hosting:** ~1200-4500 kr/månad (Hetzner EU)

---

## Current Status

**Phase Completed:** Phase 1 (Infrastructure & Authentication) ✅

**Next Phase:** Phase 2 (Groups & Chat)

**Branch:** Dev

**Last Updated:** 2025-11-16

---

*Detta dokument är din kompletta projektspecifikation. Använd det som referens genom hela utvecklingen. Claude Code kommer att följa denna spec exakt.*

*Lycka till med projektet!*
