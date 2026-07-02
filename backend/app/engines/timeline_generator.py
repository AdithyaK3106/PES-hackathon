from typing import List, Dict, Any, Set
import re

class TimelineGenerator:
    @staticmethod
    def format_inr(number: float) -> str:
        """Format a number into Indian Rupee style format (e.g. ₹20,00,000)."""
        try:
            val_int = int(number)
            s = str(val_int)
            if len(s) <= 3:
                return f"\u20b9{s}"
            last_three = s[-3:]
            other_parts = s[:-3]
            groups = []
            while other_parts:
                groups.append(other_parts[-2:])
                other_parts = other_parts[:-2]
            groups.reverse()
            formatted = ",".join(groups) + "," + last_three
            return f"\u20b9{formatted}"
        except Exception:
            return f"\u20b9{number:,.2f}"

    @classmethod
    def generate(cls, transactions: List[Dict[str, Any]], risk_tx_ids: Set[str] = None) -> List[Dict[str, Any]]:
        """
        Generate a chronological timeline of transaction events.
        """
        timeline = []
        if risk_tx_ids is None:
            risk_tx_ids = set()

        # Sort transactions chronologically
        sorted_txs = sorted(transactions, key=lambda x: x["date"])

        for tx in sorted_txs:
            dt = tx["date"]
            time_str = dt.strftime("%H:%M")
            date_str = dt.strftime("%Y-%m-%d")
            
            amount = tx["amount"]
            channel = tx.get("channel", "OTHER")
            is_debit = tx.get("is_debit", True)
            
            # Type classification
            if is_debit:
                tx_type = "withdrawal" if channel == "ATM" else "debit"
            else:
                tx_type = "credit"
                
            # Helper to extract counterparty name
            desc = tx.get("description", "").upper()
            counterparty = "Unknown Counterparty"
            
            # Extraction logic for counterparty
            upi_match = re.search(r'([\w\-.]+@[\w\-.]+)', desc)
            if upi_match:
                counterparty = upi_match.group(1)
            else:
                # Look for name after NEFT/IMPS/RTGS
                name_extracted = False
                for kw in ["NEFT-", "IMPS/", "RTGS/"]:
                    if kw in desc:
                        parts = desc.split(kw.replace("-", "").replace("/", ""))
                        if len(parts) > 1:
                            subparts = re.split(r'[-/]', parts[1])
                            for sp in subparts:
                                if len(sp) > 3 and sp.isalpha() and sp not in ["TRANSFER", "FAMILY", "OWNACT", "SELF"]:
                                    counterparty = sp
                                    name_extracted = True
                                    break
                    if name_extracted:
                        break
                        
                if not name_extracted:
                    # Clean description tokens
                    words = [w for w in re.split(r'[/|\-,\s]+', desc) if w.isalpha() and len(w) > 3]
                    words = [w for w in words if w not in ["TRANSFER", "UPI", "IMPS", "NEFT", "RTGS", "CASH", "WITHDRAWAL", "DEPOSIT"]]
                    if words:
                        counterparty = " ".join(words[:2])

            formatted_amt = cls.format_inr(amount)
            if tx_type == "credit":
                event_text = f"{formatted_amt} credited via {channel}"
            elif tx_type == "withdrawal":
                event_text = f"{formatted_amt} withdrawn via ATM"
            else:
                event_text = f"{formatted_amt} debited via {channel}"

            timeline.append({
                "time": time_str,
                "date": date_str,
                "timestamp": tx["timestamp"],
                "event": event_text,
                "amount": amount,
                "type": tx_type,
                "channel": channel,
                "counterparty": counterparty,
                "risk_flag": tx["tx_id"] in risk_tx_ids or tx.get("risk_score", 0) >= 60
            })

        return timeline
