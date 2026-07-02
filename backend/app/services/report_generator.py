from typing import List, Dict, Any
from datetime import datetime

class ReportGenerator:
    @staticmethod
    def format_inr(number: float) -> str:
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
    def generate_report(cls, case: Dict[str, Any], transactions: List[Dict[str, Any]], 
                        patterns_data: Dict[str, Any], entities: Dict[str, Any], 
                        graph: Dict[str, Any], timeline: List[Dict[str, Any]], 
                        parser_stats: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a comprehensive, analyst-ready investigation report.
        """
        account_id = case.get("account_id", "Unknown")
        risk_score = case.get("risk_score", 0.0)
        risk_level = case.get("risk_level", "LOW")
        
        # Calculate money flow metrics
        total_inflow = 0.0
        total_outflow = 0.0
        unique_counterparties = set()
        
        beneficiaries_map = {} # counterparty -> {total_received, tx_count}

        for tx in transactions:
            amount = tx.get("amount", 0.0)
            is_debit = tx.get("is_debit", True)
            
            # Simple counterparty extraction
            desc = tx.get("description", "").upper()
            counterparty = "unknown"
            for word in desc.split():
                if "@" in word:
                    counterparty = word
                    break
            if counterparty == "unknown" and "NEFT-" in desc:
                parts = desc.split("-")
                if len(parts) > 2:
                    counterparty = parts[2]
            if counterparty == "unknown" and "IMPS/" in desc:
                parts = desc.split("/")
                if len(parts) > 3:
                    counterparty = parts[3]
            if counterparty == "unknown":
                counterparty = desc[:15]

            unique_counterparties.add(counterparty)

            if is_debit:
                total_outflow += amount
                if counterparty not in beneficiaries_map:
                    beneficiaries_map[counterparty] = {"total_received": 0.0, "tx_count": 0}
                beneficiaries_map[counterparty]["total_received"] += amount
                beneficiaries_map[counterparty]["tx_count"] += 1
            else:
                total_inflow += amount

        net_flow = total_inflow - total_outflow
        primary_flow_direction = "inbound" if total_inflow > total_outflow else "outbound"

        # Format beneficiaries list
        top_beneficiaries = []
        for account, data in beneficiaries_map.items():
            top_beneficiaries.append({
                "account": account,
                "name": account,
                "total_received": data["total_received"],
                "tx_count": data["tx_count"]
            })
        top_beneficiaries.sort(key=lambda x: x["total_received"], reverse=True)
        top_beneficiaries = top_beneficiaries[:5]

        # Top 10 High Risk / Contribution transactions
        high_risk_txs = sorted(transactions, key=lambda x: x.get("amount", 0.0), reverse=True)[:10]

        # Gather pattern details
        patterns = patterns_data.get("patterns", [])
        pattern_names = [p["name"] for p in patterns]
        
        # Determine account holder name
        holder_names = [n["value"] for n in entities.get("names", [])]
        holder_name = holder_names[0] if holder_names else "Account Holder"

        # Generate Executive Summary Text
        period_str = ""
        if transactions:
            sorted_by_date = sorted(transactions, key=lambda x: x["date"])
            start_date = sorted_by_date[0]["date"].strftime("%b %Y")
            end_date = sorted_by_date[-1]["date"].strftime("%b %Y")
            period_str = f"over a period of {start_date} to {end_date}"
        else:
            period_str = "over the analyzed period"

        pattern_desc_str = ""
        if pattern_names:
            pattern_desc_str = f"reveals multiple suspicious behaviors including {', '.join(pattern_names[:3])}"
        else:
            pattern_desc_str = "shows standard operational patterns with low overall anomaly levels"

        exec_summary = (
            f"Account {account_id} ({holder_name}) shows {risk_level.lower()}-risk activity with a risk score of {int(risk_score)}/100. "
            f"Analysis of {len(transactions)} transactions {period_str} {pattern_desc_str}. "
            f"Total volume processed: credit flow of {cls.format_inr(total_inflow)} and debit flow of {cls.format_inr(total_outflow)}. "
            f"Immediate review and investigation are recommended."
        )

        # Graph summary details
        nodes_list = graph.get("nodes", []) if graph else []
        edges_list = graph.get("edges", []) if graph else []
        node_types_count = {}
        for n in nodes_list:
            nt = n.get("node_type", "account")
            node_types_count[nt] = node_types_count.get(nt, 0) + 1

        graph_summary = {
            "total_nodes": len(nodes_list),
            "total_edges": len(edges_list),
            "node_types": node_types_count
        }

        # Build human-readable explanations list
        explanations = []
        if risk_score >= 80:
            explanations.append("Critical risk score triggered by multiple high-severity behavioral patterns.")
        for p in patterns:
            explanations.append(f"Pattern detected: {p['name']} - {p['description']}")
        if total_inflow > 1000000:
            explanations.append(f"High volume inbound flow: {cls.format_inr(total_inflow)} received.")
        if len(transactions) > 100:
            explanations.append(f"High transaction frequency: {len(transactions)} events processed.")
        if not explanations:
            explanations.append("No critical risk factors identified. Transaction flows appear standard.")

        # Risk explanation narrative
        risk_explanation = (
            f"This account has been flagged at {risk_level} risk due to the presence of {len(patterns)} major suspicious patterns. "
            f"The primary driver of risk is the fund routing signature: inbound transfers are processed and sent to various beneficiaries "
            f"or withdrawn in cash within short intervals. This pattern is commonly associated with mule accounts or layering intermediaries."
        )

        # Recommended Next Steps
        next_steps = [
            "Initiate verification of account holder credentials and KYC records.",
            "Obtain statements of top beneficiary accounts to trace downstream money flow.",
            f"Cross-reference UPI IDs and IFSC codes with other active cases ({len(entities.get('upi_ids', []))} UPI IDs linked)."
        ]
        if "Circular Money Flow" in pattern_names:
            next_steps.append("Request reversal details for potential circular transactions.")
        if "Cash Intensive Behaviour" in pattern_names:
            next_steps.append("Audit nearby ATM location feeds for the identified serial withdrawal dates.")

        report = {
            "executive_summary": exec_summary,
            "investigation_risk": {
                "score": risk_score,
                "level": risk_level,
                "explanation": explanations
            },
            "detected_patterns": patterns,
            "risk_explanation": risk_explanation,
            "timeline": timeline[:50],  # Limit timeline preview in report to top 50 events
            "money_flow_summary": {
                "total_inflow": total_inflow,
                "total_outflow": total_outflow,
                "net_flow": net_flow,
                "unique_counterparties": len(unique_counterparties),
                "primary_flow_direction": primary_flow_direction
            },
            "high_risk_transactions": high_risk_txs,
            "top_beneficiaries": top_beneficiaries,
            "extracted_entities": entities,
            "parser_statistics": parser_stats,
            "graph_summary": graph_summary,
            "recommended_next_steps": next_steps
        }

        return report
