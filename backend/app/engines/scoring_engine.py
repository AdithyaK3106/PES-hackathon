from typing import List, Dict, Any
from collections import defaultdict

def score_investigation(transactions: List[Dict[str, Any]], patterns: List[Dict[str, Any]], account_id: str) -> Dict[str, Any]:
    """
    Consumes pattern detection output and computes investigation-level risk score.
    Does NOT re-detect patterns.
    """
    # 1. Base Score calculation based on pattern severities
    severity_map = {"High": 30.0, "Medium": 15.0, "Low": 5.0}
    base_score = 0.0
    for pat in patterns:
        base_score += severity_map.get(pat.get("severity"), 5.0)
    
    # Cap base score at 75.0 to leave room for boosts
    base_score = min(75.0, base_score)
    
    # 2. Boosts
    boost = 0.0
    # +10 if multiple pattern types detected
    if len(patterns) >= 2:
        boost += 10.0
    
    # +10 if total volume > 10L
    total_volume = sum(float(tx.get("amount", 0.0)) for tx in transactions)
    if total_volume > 1000000:
        boost += 10.0
        
    # +5 if high tx count
    if len(transactions) > 100:
        boost += 5.0
        
    final_score = int(min(100.0, base_score + boost))
    if final_score == 0 and transactions:
        final_score = 15  # default baseline for non-empty statement

    # Risk Level classification
    if final_score >= 80:
        risk_level = "CRITICAL"
    elif final_score >= 60:
        risk_level = "HIGH"
    elif final_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Human-readable explanations
    explanations = []
    for pat in patterns:
        explanations.append(pat.get("description", f"{pat['name']} detected"))
        
    if total_volume > 1000000:
        vol_lakhs = total_volume / 100000
        explanations.append(f"High volume transactional activity: \u20b9{vol_lakhs:.1f} Lakh processed")
    if len(transactions) > 100:
        explanations.append(f"High transaction count: {len(transactions)} rows analyzed")

    if not explanations:
        explanations.append("Routine transaction patterns with low risk indicators.")

    # 3. Top Contributing Transactions
    tx_patterns = defaultdict(list)
    for pat in patterns:
        for tx_id in pat.get("related_transactions", []):
            tx_patterns[tx_id].append(pat["name"])

    # Find largest inflow and outflow
    inflows = [t for t in transactions if not t.get("is_debit", True)]
    largest_inflow_tx = max(inflows, key=lambda x: x["amount"]) if inflows else None
    
    outflows = [t for t in transactions if t.get("is_debit", True)]
    largest_outflow_tx = max(outflows, key=lambda x: x["amount"]) if outflows else None

    scored_txs = []
    for tx in transactions:
        tx_id = tx["tx_id"]
        amount = tx["amount"]
        contrib = 0.0
        reasons = []

        if tx_id in tx_patterns:
            pats = tx_patterns[tx_id]
            contrib += len(pats) * 20.0
            reasons.append(f"Linked to {', '.join(pats)}")
            
        if amount >= 50000:
            contrib += min(40.0, (amount / 100000.0) * 10)
            reasons.append(f"High amount: \u20b9{amount:,.2f}")
            
        if largest_inflow_tx and tx_id == largest_inflow_tx["tx_id"]:
            contrib += 15.0
            reasons.append("Largest single inflow")
        if largest_outflow_tx and tx_id == largest_outflow_tx["tx_id"]:
            contrib += 15.0
            reasons.append("Largest single outflow")

        if contrib > 0:
            reason_str = " + ".join(reasons)
            contribution_pct = int(min(35.0, contrib))
            scored_txs.append({
                "tx_id": tx_id,
                "amount": amount,
                "reason": reason_str,
                "contribution": contribution_pct
            })

    top_contributions = sorted(scored_txs, key=lambda x: x["contribution"], reverse=True)[:10]

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "explanation": explanations,
        "triggered_patterns": [p["name"] for p in patterns],
        "top_contributing_transactions": top_contributions
    }
