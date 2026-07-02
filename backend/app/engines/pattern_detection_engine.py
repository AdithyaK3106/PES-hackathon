from typing import List, Dict, Any, Set
from datetime import datetime, timedelta
from collections import defaultdict
import re

class PatternDetectionEngine:
    @staticmethod
    def detect(transactions: List[Dict[str, Any]], account_id: str) -> Dict[str, Any]:
        """
        Scan normalized transactions for 11 distinct suspicious patterns.
        Returns a dict containing a list of detected pattern summaries.
        """
        detected = []
        if not transactions:
            return {"patterns": []}

        # Sort transactions chronologically
        txs = sorted(transactions, key=lambda x: x["date"])

        # Help extract counterparties
        def get_counterparty(tx):
            desc = tx.get("description", "").upper()
            # Try to find UPI ID
            upi_match = re.search(r'([\w\-.]+@[\w\-.]+)', desc)
            if upi_match:
                return upi_match.group(1)
            # Try to find account number
            acc_match = re.search(r'\b(\d{9,18})\b', desc)
            if acc_match:
                return acc_match.group(1)
            # Try to extract name
            for prefix in ["NEFT-", "IMPS/", "RTGS/"]:
                if prefix in desc:
                    parts = desc.split(prefix.replace("-", "").replace("/", ""))
                    if len(parts) > 1:
                        subparts = re.split(r'[-/]', parts[1])
                        for sp in subparts:
                            if len(sp) > 3 and sp.isalpha():
                                return sp
            return "unknown_counterparty"

        # 1. Rapid Money Movement
        # Large credit followed by outgoing transfers within 24 hours (>80% of credit)
        for i, tx in enumerate(txs):
            if not tx["is_debit"] and tx["amount"] >= 50000:
                credit_time = tx["date"]
                credit_amount = tx["amount"]
                related_debits = []
                total_debit = 0.0
                
                for j in range(i + 1, len(txs)):
                    other = txs[j]
                    if (other["date"] - credit_time).total_seconds() > 86400:
                        break
                    if other["is_debit"]:
                        related_debits.append(other)
                        total_debit += other["amount"]
                
                if total_debit >= 0.8 * credit_amount:
                    tx_ids = [tx["tx_id"]] + [o["tx_id"] for o in related_debits]
                    detected.append({
                        "name": "Rapid Money Movement",
                        "severity": "High",
                        "confidence": 0.90,
                        "description": f"Credit of \u20b9{credit_amount:,.2f} followed by outgoing transfers of \u20b9{total_debit:,.2f} ({total_debit/credit_amount*100:.1f}%) within 24 hours.",
                        "related_transactions": tx_ids
                    })
                    break  # Avoid spamming multiple rapid money movements

        # 2. Fan-In
        # >= 4 unique accounts sending to account_id
        incoming_counterparties = set()
        incoming_txs = []
        for tx in txs:
            if not tx["is_debit"]:
                cp = get_counterparty(tx)
                if cp != "unknown_counterparty":
                    incoming_counterparties.add(cp)
                    incoming_txs.append(tx["tx_id"])
        
        if len(incoming_counterparties) >= 4:
            detected.append({
                "name": "Fan-In",
                "severity": "Medium",
                "confidence": 0.85,
                "description": f"Multiple accounts ({len(incoming_counterparties)} unique senders) sending funds to this account.",
                "related_transactions": incoming_txs
            })

        # 3. Fan-Out
        # account_id sending to >= 4 unique accounts
        outgoing_counterparties = set()
        outgoing_txs = []
        for tx in txs:
            if tx["is_debit"]:
                cp = get_counterparty(tx)
                if cp != "unknown_counterparty":
                    outgoing_counterparties.add(cp)
                    outgoing_txs.append(tx["tx_id"])
                    
        if len(outgoing_counterparties) >= 4:
            detected.append({
                "name": "Fan-Out",
                "severity": "High",
                "confidence": 0.85,
                "description": f"Funds distributed from this account to {len(outgoing_counterparties)} unique beneficiaries.",
                "related_transactions": outgoing_txs
            })

        # 4. Circular Money Flow (A->B->C->A or A->B->A cycle)
        # We look for credits and debits to the same counterparty (Y sends to X, X sends to Y)
        # or cycles within a short window
        circular_txs = []
        counterparty_directions = defaultdict(lambda: {"in": [], "out": []})
        for tx in txs:
            cp = get_counterparty(tx)
            if cp != "unknown_counterparty":
                if tx["is_debit"]:
                    counterparty_directions[cp]["out"].append(tx)
                else:
                    counterparty_directions[cp]["in"].append(tx)
        
        for cp, dirs in counterparty_directions.items():
            if dirs["in"] and dirs["out"]:
                # Check if they occur in sequence (e.g. Y -> X then X -> Y, or X -> Y then Y -> X)
                for in_tx in dirs["in"]:
                    for out_tx in dirs["out"]:
                        if abs((in_tx["date"] - out_tx["date"]).total_seconds()) < 86400 * 2: # within 48 hours
                            circular_txs.extend([in_tx["tx_id"], out_tx["tx_id"]])
                            
        if circular_txs:
            detected.append({
                "name": "Circular Money Flow",
                "severity": "High",
                "confidence": 0.80,
                "description": "Round-trip / circular fund movement detected with counterparties within 48 hours.",
                "related_transactions": list(set(circular_txs))
            })

        # 5. Layering
        # Sequences of funds passing: A -> X followed by X -> B of similar amount
        layering_txs = []
        for i, tx in enumerate(txs):
            if not tx["is_debit"]:
                in_time = tx["date"]
                in_amt = tx["amount"]
                for j in range(i + 1, len(txs)):
                    other = txs[j]
                    if (other["date"] - in_time).total_seconds() > 86400:
                        break
                    if other["is_debit"] and abs(other["amount"] - in_amt) / in_amt < 0.1: # within 10% amount deviation
                        layering_txs.extend([tx["tx_id"], other["tx_id"]])
                        
        if layering_txs:
            detected.append({
                "name": "Layering",
                "severity": "High",
                "confidence": 0.85,
                "description": "Layering detected: incoming funds split or transferred to other accounts almost immediately with similar amounts.",
                "related_transactions": list(set(layering_txs))
            })

        # 6. Structuring
        # Multiple transactions just under reporting thresholds: 9,900-9,999 or 49,000-49,999
        structuring_txs = []
        for tx in txs:
            amt = tx["amount"]
            if (9000 <= amt <= 9999) or (45000 <= amt <= 49999) or (95000 <= amt <= 99999):
                structuring_txs.append(tx["tx_id"])
                
        if len(structuring_txs) >= 3:
            detected.append({
                "name": "Structuring",
                "severity": "High",
                "confidence": 0.90,
                "description": f"Detected {len(structuring_txs)} transactions structured just below reporting thresholds (\u20b910k, \u20b950k, \u20b91L).",
                "related_transactions": structuring_txs
            })

        # 7. Dormant Account Activation
        # gap > 30 days then sudden burst (>= 5 txs in 7 days)
        dormant_activation = False
        dormant_txs = []
        for i in range(1, len(txs)):
            gap = (txs[i]["date"] - txs[i-1]["date"]).days
            if gap >= 30:
                # Check subsequent activity in next 7 days
                start_time = txs[i]["date"]
                burst_txs = []
                for j in range(i, len(txs)):
                    if (txs[j]["date"] - start_time).days <= 7:
                        burst_txs.append(txs[j])
                    else:
                        break
                if len(burst_txs) >= 5:
                    dormant_activation = True
                    dormant_txs = [t["tx_id"] for t in burst_txs]
                    break
                    
        if dormant_activation:
            detected.append({
                "name": "Dormant Account Activation",
                "severity": "Medium",
                "confidence": 0.80,
                "description": "Sudden burst of transaction activity on an account that was dormant for over 30 days.",
                "related_transactions": dormant_txs
            })

        # 8. Cash Intensive Behaviour
        # High proportion of ATM/CASH txs, or serial ATM withdrawals (>=3 withdrawals of exact round numbers like 10k or 20k in 24 hours)
        cash_txs = [t for t in txs if t["channel"] in ["ATM", "CASH"]]
        serial_cash_ids = []
        
        # Check for serial ATM withdrawals
        for i, tx in enumerate(cash_txs):
            if tx["is_debit"] and tx["amount"] in [10000.0, 20000.0, 5000.0]:
                start_time = tx["date"]
                withdrawals = [tx]
                for j in range(i + 1, len(cash_txs)):
                    other = cash_txs[j]
                    if (other["date"] - start_time).total_seconds() > 86400:
                        break
                    if other["is_debit"] and other["amount"] == tx["amount"]:
                        withdrawals.append(other)
                
                if len(withdrawals) >= 3:
                    serial_cash_ids.extend([w["tx_id"] for w in withdrawals])
                    
        if serial_cash_ids:
            detected.append({
                "name": "Cash Intensive Behaviour",
                "severity": "High",
                "confidence": 0.95,
                "description": "Serial high-value ATM cash withdrawals executed within a short time window.",
                "related_transactions": list(set(serial_cash_ids))
            })
        elif len(cash_txs) / len(txs) > 0.5 and len(txs) >= 10:
            detected.append({
                "name": "Cash Intensive Behaviour",
                "severity": "Medium",
                "confidence": 0.85,
                "description": f"Over 50% of all transactions ({len(cash_txs)} out of {len(txs)}) are ATM/Cash transactions.",
                "related_transactions": [t["tx_id"] for t in cash_txs]
            })

        # 9. High Transaction Velocity
        # >= 10 transactions in a 24-hour window
        velocity_tx_ids = []
        for i, tx in enumerate(txs):
            start_time = tx["date"]
            window_txs = [tx]
            for j in range(i + 1, len(txs)):
                other = txs[j]
                if (other["date"] - start_time).total_seconds() > 86400:
                    break
                window_txs.append(other)
            if len(window_txs) >= 10:
                velocity_tx_ids.extend([w["tx_id"] for w in window_txs])
                
        if velocity_tx_ids:
            detected.append({
                "name": "High Transaction Velocity",
                "severity": "Medium",
                "confidence": 0.90,
                "description": "Unusual frequency of transaction activity: 10 or more transactions executed in under 24 hours.",
                "related_transactions": list(set(velocity_tx_ids))
            })

        # 10. Immediate Balance Depletion
        # Large credit followed by near-complete withdrawal (ending balance drops below 5% of credit amount)
        depletion_tx_ids = []
        for i, tx in enumerate(txs):
            if not tx["is_debit"] and tx["amount"] >= 100000:
                credit_amt = tx["amount"]
                start_bal = tx.get("balance_after", None)
                if start_bal is not None:
                    credit_time = tx["date"]
                    # Find balance 24 hours later
                    final_bal = start_bal
                    depletion_txs_window = [tx]
                    for j in range(i + 1, len(txs)):
                        other = txs[j]
                        if (other["date"] - credit_time).total_seconds() > 86400:
                            break
                        depletion_txs_window.append(other)
                        if other.get("balance_after") is not None:
                            final_bal = other["balance_after"]
                            
                    if final_bal < 0.05 * credit_amt:
                        depletion_tx_ids.extend([t["tx_id"] for t in depletion_txs_window])
                        
        if depletion_tx_ids:
            detected.append({
                "name": "Immediate Balance Depletion",
                "severity": "High",
                "confidence": 0.85,
                "description": "Large credit immediately followed by withdrawals that fully deplete the account balance.",
                "related_transactions": list(set(depletion_tx_ids))
            })

        # 11. Repeated Round Amounts
        # >= 4 transactions of exactly round amounts (10k, 50k, 1L, etc.)
        round_amounts = {1000.0, 5000.0, 10000.0, 20000.0, 25000.0, 30000.0, 40000.0, 50000.0, 100000.0, 200000.0, 500000.0}
        round_tx_ids = []
        for tx in txs:
            if tx["amount"] in round_amounts:
                round_tx_ids.append(tx["tx_id"])
                
        if len(round_tx_ids) >= 4:
            detected.append({
                "name": "Repeated Round Amounts",
                "severity": "Low",
                "confidence": 0.90,
                "description": f"Multiple transactions ({len(round_tx_ids)}) contain suspiciously round amounts.",
                "related_transactions": round_tx_ids
            })

        # Deduplicate list by pattern name
        deduped = []
        seen = set()
        for pat in detected:
            if pat["name"] not in seen:
                seen.add(pat["name"])
                deduped.append(pat)

        return {"patterns": deduped}
