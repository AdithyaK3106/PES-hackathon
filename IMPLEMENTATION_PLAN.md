# SENTINEL → AI Financial Investigation Workstation — Implementation Plan

## Context

We're pivoting SENTINEL (a real-time fraud recovery platform) into an **Automated Bank Statement Analysis System** for a 24-hour hackathon. The dataset is **static** (162 bank statement files: PDF, CSV, XLSX, XLS, TXT across multiple Indian banks). No real-time streaming, no banking APIs, no freeze/flag actions. The system should feel like an **AI Financial Investigation Workstation** — emphasis on investigation intelligence, graph analysis, explainability, and analyst productivity.

**Branch:** `hackathon/bank-statement-analysis`

### Mandatory Pipeline Order

```
Upload Statement → Statement Parser → Normalization Engine → Entity Extraction
→ Pattern Detection Engine → Risk Scoring Engine → Money Flow Graph Builder
→ Timeline Generator → Report Generator → Case Manager
```

### Do NOT Build
Authentication, WebSockets, Banking APIs, Freeze APIs, Telecom APIs, Recovery Engine, Simulator, Real-time streaming

---

## Phase 1: Backend Core Pipeline (4–5 hrs)

**Goal:** Upload a statement → parse with confidence stats → normalize → extract entities → detect patterns → score investigation → build graph → generate timeline → generate report → create case. Full pipeline returns JSON.

### 1.1 Gut `backend/main.py`

**Remove:**
- `ConnectionManager` class + `manager` instance (WebSocket)
- All 6 `/action/*` routes + `_handle_action` + `_record_action`
- `/attack-mode` route
- `/ws` WebSocket endpoint
- `_normalize_action_log()` helper

**Keep:**
- `/health`, `_normalize_nodes()`, `_normalize_edges()`, `_case_payload()` (modify)

**Add new routes:**
- `POST /upload` — accepts `UploadFile`, runs full pipeline, returns `{case_id, summary, parser_stats}`
- `GET /investigations` — list all investigations with risk scores
- `GET /investigation/{case_id}` — full investigation detail (case + transactions + patterns + graph + timeline + report)
- `GET /investigation/{case_id}/report` — formatted investigation report JSON
- `GET /stats` — dashboard KPIs: statements_uploaded, investigations_created, high_risk_investigations, high_risk_transactions, total_volume
- `GET /search?q=...&type=...` — global search across accounts, UPI IDs, names, merchants, IFSC, tx references
- `POST /seed-demo` — auto-process 3–5 primary PDFs to populate dashboard for judges

### 1.2 Rewrite `backend/app/services/orchestrator.py`

**Remove:** `run_pipeline()`, ML fusion, simulator_meta handling.

**New `process_statement(file_path, original_filename, store) -> dict`:**
1. `StatementParser.parse_statement(file_path)` → `(account_id, raw_txs, parser_stats)`
2. `NormalizationEngine.normalize(raw_txs, account_id)` → standardized txs
3. `EntityExtractor.extract_all(txs)` → entities dict
4. `PatternDetectionEngine.detect(txs, account_id)` → patterns list ← **runs BEFORE scoring**
5. `ScoringEngine.score_investigation(txs, patterns, account_id)` → investigation-level score ← **consumes patterns**
6. `graph_engine.build_money_flow_graph(case_id, txs, entities, store)` → graph
7. `TimelineGenerator.generate(txs)` → timeline
8. `ReportGenerator.generate(case, txs, patterns, entities, graph, timeline, parser_stats)` → report
9. `case_manager.create_investigation(...)` → case dict
10. Store everything, return result

### 1.3 Harden `backend/app/engines/statement_parser.py` (EXISTING — modify)

**Add parser confidence output.** Return tuple: `(account_id, transactions, parser_stats)`

```python
parser_stats = {
    "total_rows": int,
    "parsed_rows": int,
    "skipped_rows": int,
    "confidence": float,  # parsed_rows / total_rows * 100
    "warnings": ["3 malformed rows skipped", ...],
    "source_format": "Axis Bank CSV" | "Kotak CSV" | "PDF Table" | ...
}
```

**Format-specific handling:**
- Axis Bank CSV: skip metadata header rows (lines 1–7), columns `TRAN_DATE, CHQNO, PARTICULARS, DR, CR, BAL, SOL`
- Kotak/Union CSV: tab-separated, `WITHDRAWAL/DEPOSIT` columns
- SBI/ICORE CSV: `Dr_Amt/Cr_Amt` columns
- Excel: detect and skip metadata rows before actual header
- TXT: fixed-width parsing for PNB / Kerala Gramin Bank
- PDF: pdfplumber table extraction (existing logic, add confidence tracking)
- More date formats: `dd-MMM-yy`, `dd/mm/yy`, `dd-MMM-yyyy`

### 1.4 Create `backend/app/engines/normalization_engine.py` (NEW)

`normalize(raw_txs, account_id) -> list[dict]`

Output per tx:
```python
{
    "tx_id": str,
    "date": datetime,
    "timestamp": str,       # ISO format
    "description": str,     # cleaned
    "raw_description": str, # original for entity extraction
    "amount": float,
    "is_debit": bool,
    "sender_account": str,
    "receiver_account": str,
    "channel": str,         # NEFT/RTGS/UPI/IMPS/ATM/CASH/CHEQUE/OTHER
    "balance_after": float | None
}
```

Handles: multiple date formats, Indian number formatting (commas in lakhs), channel detection from description keywords, separate debit/credit column handling.

### 1.5 Create `backend/app/engines/entity_extractor.py` (NEW)

`extract_all(transactions) -> dict`:
- `upi_ids`: regex `[\w.]+@[\w]+` from descriptions
- `ifsc_codes`: regex `[A-Z]{4}0[A-Z0-9]{6}`
- `account_numbers`: 9–18 digit numbers in transfer descriptions
- `names`: person/company names from NEFT/RTGS narrations (pattern: `NEFT-NAME-IFSC-ACCNO`)
- `merchants`: merchant names from POS/UPI descriptions
- `banks`: from IFSC prefix mapping or description keywords

Entity extractor also creates entity-to-account mappings for graph enrichment. Each entity includes `{value, type, source_tx_ids, linked_accounts}`.

### 1.6 Create `backend/app/engines/pattern_detection_engine.py` (NEW)

**Runs BEFORE scoring engine. Scoring consumes pattern output — no duplicated logic.**

`detect(transactions, account_id) -> dict`:

```python
{
    "patterns": [
        {
            "name": "Fan Out",
            "severity": "High" | "Medium" | "Low",
            "confidence": 0.91,
            "description": "₹50 lakh distributed to 14 beneficiaries within 48 hours",
            "related_transactions": [tx_id, ...]
        }
    ]
}
```

**11 detectors:**
1. **Rapid Money Movement** — large credit followed by outgoing transfers within hours
2. **Fan-In** — many accounts sending to one account (converging funds)
3. **Fan-Out** — one account distributing to many accounts
4. **Circular Money Flow** — A→B→C→A cycle detection via graph traversal
5. **Layering** — funds passing through multiple intermediaries (chain depth > 2)
6. **Structuring** — multiple transactions just under reporting thresholds (e.g., many 9,900 or 49,000 txs)
7. **Dormant Account Activation** — no activity for 30+ days then sudden burst
8. **Cash Intensive Behaviour** — high proportion of ATM/cash withdrawals, especially serial 20k withdrawals
9. **High Transaction Velocity** — unusual number of transactions in a short window
10. **Immediate Balance Depletion** — large credit followed by near-complete withdrawal
11. **Repeated Round Amounts** — multiple transactions of exactly round amounts (10k, 50k, 1L)

### 1.7 Rewrite `backend/app/engines/scoring_engine.py`

**Key change: Primary output is Investigation Score, not individual transaction scores.**

**Remove:** simulator_meta, hop-based decay, crypto/remote-access flags, proportional scaler, individual-tx-only approach.

**New architecture:**

```python
def score_investigation(transactions, patterns, account_id) -> dict:
    """
    Consumes pattern detection output. Does NOT re-detect patterns.
    Computes investigation-level risk from pattern severity + tx anomalies.
    """
```

**Output:**
```python
{
    "risk_score": 91,
    "risk_level": "CRITICAL",  # CRITICAL >= 80, HIGH >= 60, MEDIUM >= 40, LOW < 40
    "explanation": [
        "₹50 lakh received in single transaction",
        "Distributed to 14 beneficiaries within 48 hours",
        "High transaction velocity: 47 transactions in 3 days",
        "Immediate outgoing transfers after large credits",
        "Circular fund movement detected",
        "Structuring: 6 transactions of ₹9,900 each"
    ],
    "triggered_patterns": ["Fan Out", "Rapid Money Movement", "Structuring", ...],
    "top_contributing_transactions": [
        {"tx_id": "...", "amount": 5000000, "reason": "Largest single inflow", "contribution": 25}
    ]
}
```

**Scoring formula:**
- Base: weighted sum of pattern severities (High=30, Medium=15, Low=5) normalized to 0–100
- Boost: +10 if multiple pattern types detected, +10 if total volume > 10L, +5 if high tx count
- Individual tx scores still computed internally for `top_contributing_transactions` ranking
- Every score MUST include human-readable `explanation` list — no numeric-only output

### 1.8 Extend `backend/app/engines/graph_engine.py` (KEEP existing, extend)

**Keep:** `get_graph`, `add_node`, `add_edge` — they work. Only extend.

**Modify `add_node` shape:**
```python
{
    "account_id": str,
    "node_type": str,      # account, person, upi_id, merchant, bank, ifsc
    "label": str,          # display name
    "risk": float,         # 0-100
    "status": str,         # active, suspicious, flagged
    "tx_count": int,
    "total_inflow": float,
    "total_outflow": float
}
```

**Modify `add_edge` shape:**
```python
{
    "from": str,
    "to": str,
    "tx_id": str,
    "amount": float,
    "channel": str,        # NEFT, UPI, etc.
    "date": str,           # ISO date
    "description": str
}
```

**Add:** `build_money_flow_graph(case_id, transactions, entities, store)` — batch builder:
- Creates primary account node
- Creates counterparty account nodes from transactions
- Creates entity nodes (person, upi_id, merchant, bank, ifsc) from entity extractor output
- Creates edges for each transaction
- Calculates per-node inflow/outflow/tx_count aggregates

### 1.9 Create `backend/app/engines/timeline_generator.py` (NEW)

`generate(transactions) -> list[dict]`:

```python
[
    {
        "time": "09:10",
        "date": "2025-03-15",
        "timestamp": "2025-03-15T09:10:00",
        "event": "₹20,00,000 credited via RTGS",
        "amount": 2000000,
        "type": "credit",         # credit, debit, withdrawal
        "channel": "RTGS",
        "counterparty": "DIAMOND PLAST",
        "risk_flag": True          # True if part of a detected pattern
    }
]
```

Sorted chronologically. Marks transactions that are part of detected patterns with `risk_flag: True`. Timeline appears in Report and Investigation Sidebar.

### 1.10 Create `backend/app/services/report_generator.py` (NEW)

`generate_report(case, transactions, patterns, entities, graph, timeline, parser_stats) -> dict`:

```python
{
    "executive_summary": str,           # auto-generated investigator-friendly paragraph
    "investigation_risk": {
        "score": 91,
        "level": "CRITICAL",
        "explanation": [str, ...]       # human-readable reasons
    },
    "detected_patterns": [{name, severity, confidence, description, related_transactions}],
    "risk_explanation": str,            # narrative explaining why this is risky
    "timeline": [timeline events],
    "money_flow_summary": {
        "total_inflow": float,
        "total_outflow": float,
        "net_flow": float,
        "unique_counterparties": int,
        "primary_flow_direction": "inbound" | "outbound"
    },
    "high_risk_transactions": [top 10 by contribution],
    "top_beneficiaries": [{account, name, total_received, tx_count}],
    "extracted_entities": {upi_ids, ifsc_codes, names, merchants, banks},
    "parser_statistics": {confidence, rows_parsed, rows_total, warnings},
    "graph_summary": {
        "total_nodes": int,
        "total_edges": int,
        "node_types": {account: N, person: N, ...}
    },
    "recommended_next_steps": [
        "Investigate linked account XXXX (received ₹15L)",
        "Request statements from beneficiary accounts",
        "Cross-reference with account YYYY (circular flow detected)"
    ]
}
```

**Executive summary** is auto-generated text, e.g.: *"Account 958533930537174 (SNEHA MALHOTRA) shows high-risk activity with a risk score of 91/100. Analysis of 615 transactions over 6 months reveals fan-out distribution to 14 beneficiaries, structuring of amounts under ₹10,000, and circular fund movement. Total volume: ₹2.3 Cr. Immediate investigation recommended."*

### 1.11 Simplify `backend/app/engines/case_manager.py` (KEEP existing, simplify)

**Remove:** chain/hop logic, max_nodes randomization, case linking by chain membership.

**New `create_investigation(...)` → dict:**
```python
{
    "case_id": str,
    "account_id": str,
    "status": "NEW" | "ANALYZED" | "HIGH_RISK",
    "risk_score": float,
    "risk_level": str,
    "total_transactions": int,
    "total_credits": float,
    "total_debits": float,
    "high_risk_transactions": [tx_ids],
    "patterns_detected": [pattern names],
    "pattern_count": int,
    "entities": dict,
    "statement_period": {"from": str, "to": str},
    "source_file": str,
    "parser_confidence": float,
    "created_at": str
}
```

### 1.12 Update supporting files

- **`data_store.py`:** Add `"investigations": {}`, `"reports": {}`, `"search_index": {}` keys
- **`config.py`:** Replace fraud weights with investigation weights, add `UPLOAD_DIR`, pattern thresholds
- **`constants.py`:** Update `CaseStatus` to `NEW/ANALYZED/HIGH_RISK/FLAGGED`
- **Disconnect `recovery_engine.py`:** Don't import/call it. Leave file intact.
- **Delete `mock_apis.py`** and **`ml_risk_engine.py`** (unused)
- **Update `reasoning_engine.py`:** Map new pattern names to human-readable explanations
- **Delete `suspicious_pattern_engine.py`:** Replaced by `pattern_detection_engine.py`

### 1.13 Create search index (in orchestrator)

After processing a statement, index all entities into `store["search_index"]`:
```python
# Key: searchable term (lowercase), Value: list of {case_id, match_type, context}
store["search_index"]["sneha malhotra"] = [{"case_id": "INV-001", "type": "person", "context": "Account holder"}]
store["search_index"]["axis0001234"] = [{"case_id": "INV-001", "type": "ifsc", "context": "IFSC in NEFT transfer"}]
```

`GET /search?q=sneha&type=all` searches this index. Types: `account`, `upi`, `name`, `merchant`, `ifsc`, `all`.

---

## Phase 2: Frontend Pivot — Upload + Dashboard (3–4 hrs)

**Goal:** Upload statements, view investigation-focused dashboard, browse transactions and investigations, global search.

### 2.1 Replace `useWebSocket.js` → `useDataStore.js`

**Remove:** WebSocket connection, reconnect logic, event handling, `startRealtime`/`stopRealtime`.

**Keep:** Singleton store pattern (store + listeners + notify), normalization helpers.

**New exports:**
- `uploadStatement(file) -> Promise` — POST multipart to `/upload`
- `fetchInvestigations()` — GET `/investigations`
- `fetchInvestigation(caseId)` — GET `/investigation/{caseId}`
- `fetchReport(caseId)` — GET `/investigation/{caseId}/report`
- `fetchStats()` — GET `/stats`
- `search(query, type)` — GET `/search?q=...&type=...`

### 2.2 Create `Upload.jsx` page (NEW)

- Drag-and-drop zone + file input (accept .pdf, .csv, .xlsx, .xls, .txt)
- Multi-file upload with progress indicator
- After upload: summary card showing account ID, tx count, risk score, parser confidence, patterns found
- "View Investigation" button → navigate to `/graph/:caseId`

### 2.3 Rewrite `Dashboard.jsx` — investigation-focused

**KPIs:** Statements Uploaded, Investigations Created, High Risk Investigations, High Risk Transactions, Total Transaction Volume

**Charts (reuse recharts):**
- Investigation Risk Distribution (BarChart — how many investigations per risk level)
- Transaction Channel Distribution (PieChart — NEFT/RTGS/UPI/IMPS/ATM)
- Pattern Distribution (BarChart — which patterns detected most frequently)
- Timeline Activity (LineChart — transaction volume over time across all investigations)

**Investigation cards grid:** sorted by risk score descending, showing top investigations.

### 2.4 Modify `Feed.jsx` → Transactions view

- Header: "Transaction Analysis"
- Remove velocity/throughput stats
- Add filters: investigation dropdown, channel, risk level, search by description/account
- Keep table structure + InvestigationSidebar on row click
- Add "Description" column

### 2.5 Modify `Cases.jsx` → Investigations view

- Rename columns: Case ID → Investigation ID, add Account Number, Risk Level, Pattern Count, Parser Confidence
- Status filters: ALL/NEW/ANALYZED/HIGH_RISK/FLAGGED
- Add "View Report" button per row, keep "View Graph" button

### 2.6 Update `App.jsx`

**Remove imports:** `AttackModeToggle`, `LiveAlertToast`, `SystemStatusBar`, `useWebSocket`

**Sidebar branding:** "SENTINEL" with subtitle "Financial Investigation Workstation"

**Add:** Global search bar in sidebar (searches accounts, UPIs, names, merchants, IFSC)

**Nav links:** Upload, Dashboard, Transactions, Investigations

**Routes:**
- `/` → redirect `/upload`
- `/upload` → Upload.jsx
- `/dashboard` → Dashboard.jsx
- `/transactions` → Feed.jsx (renamed view)
- `/investigations` → Cases.jsx (renamed view)
- `/graph/:caseId` → Graph.jsx (keep)
- `/report/:caseId` → Report.jsx (Phase 4)

---

## Phase 3: Money Flow Graph Pivot (2–3 hrs)

### 3.1 Update `GraphModule.jsx`

Remove `RecoveryBar` import/render. Remove action processing state. Keep layout structure (70/30 split). Title: "Money Flow Graph".

### 3.2 Rewrite `ActionPanel.jsx` → Investigation Tools

**Replace buttons (local UI interactions, no backend APIs):**
- **Trace Money Flow** — highlight connected path from selected node (BFS traversal on client)
- **Expand Network** — show all nodes connected to selected node within 2 hops
- **Generate Report** — fetch report, open Report page
- **View Timeline** — toggle timeline panel overlay on graph
- **Highlight Suspicious** — highlight all nodes/edges with risk > 60 in red

Rename "Decision Support" → "Investigation Tools". Rename ActionLog → Investigation Log.

### 3.3 Update `GraphCanvas.jsx`

- Node shapes by `node_type`: account=circle, person=diamond, upi_id=hexagon, merchant=square, bank=rectangle, ifsc=triangle
- Node colors by risk: green (low <40), amber (40–70), red (>70), gray (external/unknown)
- Edge thickness proportional to amount
- Edge labels: amount (INR formatted) + channel
- Node tooltip: label, total_inflow, total_outflow, tx_count, node_type

### 3.4 Update `Legend.jsx`

New items: Account (circle/blue), Person (diamond/purple), UPI ID (hexagon/teal), Merchant (square/orange), Suspicious (red border), Low Risk (green), High Risk (red).

### 3.5 Update `Graph.jsx` page

Use `useDataStore` instead of `useWebSocket`. Remove action endpoint POST calls. Add client-side investigation action handlers.

### 3.6 Stop importing (don't delete files)

- `NodeActions.jsx` — freeze/flag buttons not relevant
- `RecoveryBar.jsx` — recovery not relevant

---

## Phase 4: Report View + Sidebar + Timeline (2–3 hrs)

### 4.1 Rewrite `InvestigationSidebar.jsx`

**Remove:** 6 action buttons, "Decision Terminal", recovery display.

**Keep:** Transaction context, risk factors, slide-in overlay.

**Add:**
- Description field + channel badge
- Extracted entities section (UPI IDs, names, IFSC found in this tx)
- Related patterns section (which patterns this tx triggered)
- Mini timeline (transactions around this one chronologically)
- "View in Graph" button

### 4.2 Create `Report.jsx` page (NEW)

Route: `/report/:caseId`. Fetches from `/investigation/{caseId}/report`.

**Sections:**
1. **Executive Summary** — text block with risk score badge and risk level
2. **Investigation Risk** — score + explanation list (human-readable reasons)
3. **Detected Patterns** — cards with pattern name, severity badge, confidence %, description
4. **Timeline** — vertical timeline component with chronological events, risk-flagged items highlighted
5. **Money Flow Summary** — inflow/outflow/net with visual bars + unique counterparties
6. **High Risk Transactions** — table (top 10, clickable to open sidebar)
7. **Top Beneficiaries** — table with account, name, total received, tx count
8. **Extracted Entities** — grouped display of UPI IDs, IFSC codes, names, merchants
9. **Parser Statistics** — confidence %, rows parsed/total, warnings
10. **Graph Summary** — node/edge counts by type
11. **Recommended Next Steps** — bullet list of suggested follow-up actions
12. **"View Graph"** + **"Print Report"** buttons

### 4.3 Cosmetic updates

- `CaseCard.jsx` — show account_id, risk_level badge, pattern count, parser confidence
- Remove `GoldenTimer.jsx` imports
- `FactorBreakdown.jsx` — keep as-is, works generically

---

## Phase 5: Demo Prep + Polish (2 hrs)

### 5.1 Seed demo endpoint

`POST /seed-demo` processes 3–5 primary PDFs + 2–3 CSV files automatically. Creates full investigations with parsed transactions, risk scores, graphs, timelines, and reports. Dashboard is fully populated when judges arrive.

### 5.2 Frontend polish

- Loading spinners during upload/analysis
- Error toasts for failed uploads (with parser warnings if partial)
- Empty states with helpful "Upload your first statement" messages
- Ensure dark theme consistency across all new pages

### 5.3 Final testing

- Test parser against all 3 CSV formats (Axis, Kotak, ICORE)
- Test parser against 2–3 primary PDFs
- Test one XLSX file
- Verify graph renders with 50+ nodes
- Full demo flow: seed → dashboard → investigate → graph → report

---

## File Summary

### New Backend Files (5)
1. `backend/app/engines/normalization_engine.py`
2. `backend/app/engines/entity_extractor.py`
3. `backend/app/engines/pattern_detection_engine.py`
4. `backend/app/engines/timeline_generator.py`
5. `backend/app/services/report_generator.py`

### New Frontend Files (2)
1. `frontend/src/pages/Upload.jsx`
2. `frontend/src/pages/Report.jsx`

### Major Rewrites (5)
1. `backend/main.py` — gut real-time, add investigation endpoints + search + seed-demo
2. `backend/app/services/orchestrator.py` — batch statement processing with full pipeline
3. `backend/app/engines/scoring_engine.py` — investigation-level scoring consuming patterns
4. `frontend/src/hooks/useWebSocket.js` → `useDataStore.js` (REST-based singleton store)
5. `frontend/src/pages/Dashboard.jsx` — investigation-focused KPIs and charts

### Extend (keep existing, add to) (3)
1. `backend/app/engines/graph_engine.py` — add node types, batch builder
2. `backend/app/engines/case_manager.py` — simplify to 1-upload = 1-investigation
3. `backend/app/engines/statement_parser.py` — add parser confidence, format detection

### Moderate Modifications (6)
1. `frontend/src/App.jsx` — routes, nav, search bar
2. `frontend/src/pages/Feed.jsx` → Transactions view
3. `frontend/src/pages/Cases.jsx` → Investigations view
4. `frontend/src/modules/GraphModule/ActionPanel.jsx` — investigation tools
5. `frontend/src/modules/GraphModule/GraphCanvas.jsx` — node types + risk colors
6. `frontend/src/components/InvestigationSidebar.jsx` — entities, patterns, timeline

### Light Touch (4)
1. `frontend/src/modules/GraphModule/GraphModule.jsx` — remove RecoveryBar
2. `frontend/src/modules/GraphModule/Legend.jsx` — new legend items
3. `frontend/src/pages/Graph.jsx` — use REST store
4. `frontend/src/components/CaseCard.jsx` — show investigation fields

### Delete (3)
1. `backend/app/services/mock_apis.py`
2. `backend/app/services/ml_risk_engine.py`
3. `backend/app/engines/suspicious_pattern_engine.py` (replaced by pattern_detection_engine.py)

### Disconnect (don't delete) (1)
1. `backend/app/engines/recovery_engine.py`

### Stop importing (don't delete) (4)
1. `frontend/src/components/AttackModeToggle.jsx`
2. `frontend/src/components/LiveAlertToast.jsx`
3. `frontend/src/components/SystemStatusBar.jsx`
4. `frontend/src/modules/GraphModule/RecoveryBar.jsx`

---

## Verification Plan

1. **Parser test:** Upload `ICORE_STMT_294500196490.csv` → verify parser confidence 95%+, all columns mapped
2. **Pattern test:** Upload statement with known suspicious patterns (e.g., `958533930537174` — SNEHA MALHOTRA with layering) → verify patterns detected
3. **Score test:** Verify investigation score includes human-readable explanations, not just numbers
4. **Graph test:** Verify money flow graph shows account + person + UPI nodes with correct types
5. **Timeline test:** Verify chronological event list with risk flags
6. **Report test:** Verify full report JSON with all 11 sections populated
7. **Search test:** Search "SNEHA" → returns matching investigation
8. **Frontend E2E:** Login → Upload → Dashboard KPIs update → Transactions table → Graph viz → Report page
9. **Demo flow:** Seed → populated dashboard → pick highest risk → graph → report → upload new statement live

---

## Phase Execution Order

```
Phase 1 (backend pipeline) ──→ Phase 2 (frontend) ──→ Phase 3 (graph) ──→ Phase 4 (report+sidebar) ──→ Phase 5 (polish)
```

Each phase produces a working system. If time-crunched: skip Report.jsx (4.2) and show report inline in sidebar.
