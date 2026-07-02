import uuid
from typing import Dict, Any, List
from app.engines.statement_parser import StatementParser
from app.engines.normalization_engine import NormalizationEngine
from app.engines.entity_extractor import EntityExtractor
from app.engines.pattern_detection_engine import PatternDetectionEngine
from app.engines.scoring_engine import score_investigation
from app.engines.graph_engine import build_money_flow_graph
from app.engines.timeline_generator import TimelineGenerator
from app.services.report_generator import ReportGenerator
from app.engines.case_manager import CaseManager

def update_search_index(case_id: str, entities: dict, account_id: str, store: dict):
    """
    Index names, UPI IDs, IFSC codes, merchants, and accounts for global search.
    """
    store.setdefault("search_index", {})
    index = store["search_index"]
    
    def add_to_index(term: str, type_str: str, context: str):
        if not term:
            return
        t_low = str(term).strip().lower()
        if not t_low:
            return
        entry = {
            "case_id": case_id,
            "type": type_str,
            "context": context,
            "value": str(term)
        }
        if t_low not in index:
            index[t_low] = []
        if entry not in index[t_low]:
            index[t_low].append(entry)

    # Index primary account holder and account details
    add_to_index(account_id, "account", "Primary Statement Account")
    
    # Index extracted entities
    for name_ent in entities.get("names", []):
        add_to_index(name_ent["value"], "name", "Extracted Name")
        
    for upi_ent in entities.get("upi_ids", []):
        add_to_index(upi_ent["value"], "upi", "UPI Identifier")
        
    for ifsc_ent in entities.get("ifsc_codes", []):
        add_to_index(ifsc_ent["value"], "ifsc", "IFSC Code")
        
    for merchant_ent in entities.get("merchants", []):
        add_to_index(merchant_ent["value"], "merchant", "Merchant Entity")

def process_statement(file_path: str, original_filename: str, store: dict) -> Dict[str, Any]:
    """
    Process an uploaded statement through the complete workstation pipeline.
    """
    # 1. Parse statement
    parser = StatementParser()
    account_id, raw_txs, parser_stats = parser.parse_statement(file_path)
    
    # 2. Normalize raw transactions
    txs = NormalizationEngine.normalize(raw_txs, account_id)
    
    # 3. Extract entities
    entities = EntityExtractor.extract_all(txs)
    
    # 4. Detect patterns (runs BEFORE scoring)
    patterns_data = PatternDetectionEngine.detect(txs, account_id)
    patterns = patterns_data.get("patterns", [])
    
    # 5. Score investigation
    risk_data = score_investigation(txs, patterns, account_id)
    
    case_id = f"INV-{uuid.uuid4().hex[:6].upper()}"
    
    # 6. Create Case Manager entry
    case = CaseManager.create_investigation(
        case_id=case_id,
        account_id=account_id,
        risk_data=risk_data,
        transactions=txs,
        patterns=patterns,
        entities=entities,
        parser_stats=parser_stats,
        source_file=original_filename,
        store=store
    )
    
    # 7. Build money flow graph
    graph = build_money_flow_graph(case_id, txs, entities, store)
    
    # 8. Build timeline
    risk_tx_ids = set()
    for pat in patterns:
        for tid in pat.get("related_transactions", []):
            risk_tx_ids.add(tid)
            
    timeline = TimelineGenerator.generate(txs, risk_tx_ids)
    
    # 9. Generate report
    report = ReportGenerator.generate_report(
        case=case,
        transactions=txs,
        patterns_data=patterns_data,
        entities=entities,
        graph=graph,
        timeline=timeline,
        parser_stats=parser_stats
    )
    
    # Store report and populate data store
    store.setdefault("reports", {})
    store["reports"][case_id] = report
    
    store.setdefault("transactions", {})
    for tx in txs:
        # Link transaction details for display
        tx["case_id"] = case_id
        tx["risk_score"] = risk_data["risk_score"]
        store["transactions"][tx["tx_id"]] = tx
        
    # 10. Update search index
    update_search_index(case_id, entities, account_id, store)
    
    return {
        "case_id": case_id,
        "case": case,
        "summary": report.get("executive_summary"),
        "parser_stats": parser_stats
    }
