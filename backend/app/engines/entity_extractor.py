import re
from typing import List, Dict, Any, Set

class EntityExtractor:
    IFSC_BANK_MAP = {
        "SBIN": "State Bank of India",
        "ICIC": "ICICI Bank",
        "HDFC": "HDFC Bank",
        "UTIB": "Axis Bank",
        "KKBK": "Kotak Mahindra Bank",
        "BARB": "Bank of Baroda",
        "PUNB": "Punjab National Bank",
        "SIBL": "South Indian Bank",
        "YESB": "Yes Bank",
        "FDRL": "Federal Bank",
        "UBIN": "Union Bank of India",
        "BDBL": "Bandhan Bank",
        "KLGB": "Kerala Gramin Bank",
        "IBKL": "IDBI Bank",
        "CNRB": "Canara Bank",
        "IOBA": "Indian Overseas Bank"
    }

    MERCHANT_KEYWORDS = [
        "paytm", "amazon", "google pay", "gpay", "flipkart", "zomato", "swiggy", 
        "uber", "ola", "netflix", "phonepe", "razorpay", "billdesk", "rummy", 
        "junglee", "dream11", "cred", "bbps", "irctc"
    ]

    EXCLUDE_KEYWORDS = {
        "imps", "upi", "neft", "rtgs", "cash", "atm", "transfer", "family", "inb", 
        "rtn", "chg", "fee", "tax", "charges", "interest", "rev", "gst", "clearing",
        "clg", "self", "own", "acct", "account", "commission", "withdrawal", "deposit",
        "savings", "current", "salary", "loan", "card", "mobile", "biller", "payment"
    }

    @classmethod
    def extract_all(cls, transactions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extract all entities from normalized transactions and group them.
        Each entity includes {value, type, source_tx_ids, linked_accounts}.
        """
        # Intermediate stores: value -> {type, source_tx_ids, linked_accounts}
        entity_store = {}

        def add_entity(value: str, type_str: str, tx_id: str, accounts: List[str]):
            val_clean = str(value).strip()
            if not val_clean or len(val_clean) < 3:
                return
            
            # Key by lowercase to group, but preserve formatted casing in value
            key = (val_clean.lower(), type_str)
            if key not in entity_store:
                entity_store[key] = {
                    "value": val_clean,
                    "type": type_str,
                    "source_tx_ids": set(),
                    "linked_accounts": set()
                }
            
            entity_store[key]["source_tx_ids"].add(tx_id)
            for acc in accounts:
                if acc and acc != "external":
                    entity_store[key]["linked_accounts"].add(acc)

        for tx in transactions:
            tx_id = tx["tx_id"]
            desc = tx.get("description", "")
            sender = tx.get("sender_account", "")
            receiver = tx.get("receiver_account", "")
            accounts = [acc for acc in [sender, receiver] if acc and acc != "external"]

            # 1. UPI IDs
            upi_matches = re.findall(r'([\w\-.]+@[\w\-.]+)', desc)
            for upi in upi_matches:
                add_entity(upi.strip(), "upi_id", tx_id, accounts)

            # 2. IFSC Codes
            ifsc_matches = re.findall(r'\b([A-Z]{4}0[A-Z0-9]{6})\b', desc.upper())
            for ifsc in ifsc_matches:
                add_entity(ifsc, "ifsc_code", tx_id, accounts)
                # Automatically map Bank from IFSC
                prefix = ifsc[:4]
                bank_name = cls.IFSC_BANK_MAP.get(prefix)
                if bank_name:
                    add_entity(bank_name, "bank", tx_id, accounts)

            # 3. Account Numbers (9 to 18 digits)
            acc_matches = re.findall(r'\b(\d{9,18})\b', desc)
            # Filter out timestamps or long UPI reference IDs (UPI IDs are 12 digits, let's keep them if they represent receiver/sender)
            for acc in acc_matches:
                # Simple check to avoid matching UPI Tx Ref numbers if we already have it mapped.
                # In Indian banking, UPI transaction ref IDs are 12 digits (usually starting with 4, 5, etc.)
                # But it's safer to include them and let the analyst filter than to drop true bank accounts.
                add_entity(acc, "account_number", tx_id, accounts)

            # 4. Extract Names from NEFT / IMPS patterns
            # NEFT format: NEFT-UTR-NAME-IFSC-ACCNO or similar
            # Example: NEFT-HS92423554659713-GAURAV KUMA--388801001333-IC
            # IMPS format: MMT/IMPS/ACCNO/IFS/NAME/C
            desc_upper = desc.upper()
            names_found = []
            
            if "NEFT" in desc_upper:
                # Try hyphens split
                parts = [p.strip() for p in desc.split("-") if p.strip()]
                for part in parts:
                    if len(part) >= 4 and part.replace(" ", "").isalpha() and part.lower() not in cls.EXCLUDE_KEYWORDS:
                        names_found.append(part)
            
            if "IMPS" in desc_upper or "MMT/IMPS" in desc_upper:
                parts = [p.strip() for p in desc.split("/") if p.strip()]
                for part in parts:
                    if len(part) >= 4 and part.replace(" ", "").isalpha() and part.lower() not in cls.EXCLUDE_KEYWORDS:
                        names_found.append(part)

            # Generic fallback: Search for uppercase strings like "SHIV LAL BISHNOI" or "SNEHA MALHOTRA"
            # Split description by common separators and look for name-like tokens
            tokens = re.split(r'[/|\-,\s]+', desc)
            # Find contiguous alpha strings that are in uppercase (longer than 3 chars)
            name_candidate_words = []
            for token in tokens:
                if len(token) >= 3 and token.isalpha() and token.isupper() and token.lower() not in cls.EXCLUDE_KEYWORDS:
                    name_candidate_words.append(token)
            
            if len(name_candidate_words) >= 2:
                names_found.append(" ".join(name_candidate_words))

            for name in names_found:
                add_entity(name.strip(), "name", tx_id, accounts)

            # 5. Extract Merchants
            # POS/UPI merchant checks
            merchant_matches = []
            desc_lower = desc.lower()
            for m_kw in cls.MERCHANT_KEYWORDS:
                if m_kw in desc_lower:
                    # Find matching word/phrase
                    pattern = r'\b[a-zA-Z0-9\s]*' + re.escape(m_kw) + r'[a-zA-Z0-9\s]*\b'
                    match = re.search(pattern, desc_lower)
                    if match:
                        merchant_matches.append(match.group(0).strip().title())
                    else:
                        merchant_matches.append(m_kw.title())

            for merchant in merchant_matches:
                add_entity(merchant, "merchant", tx_id, accounts)

            # 6. Extract Banks from description keywords if no IFSC found
            for prefix, bank_name in cls.IFSC_BANK_MAP.items():
                if bank_name.lower() in desc_lower or prefix in desc_upper:
                    add_entity(bank_name, "bank", tx_id, accounts)

        # Build output structure
        result = {
            "upi_ids": [],
            "ifsc_codes": [],
            "account_numbers": [],
            "names": [],
            "merchants": [],
            "banks": []
        }

        for (val, type_str), data in entity_store.items():
            entity_dict = {
                "value": data["value"],
                "type": data["type"],
                "source_tx_ids": list(data["source_tx_ids"]),
                "linked_accounts": list(data["linked_accounts"])
            }
            plural_key = type_str + "s"
            if type_str == "ifsc_code":
                plural_key = "ifsc_codes"
            elif type_str == "bank":
                plural_key = "banks"
            elif type_str == "merchant":
                plural_key = "merchants"
            
            if plural_key in result:
                result[plural_key].append(entity_dict)

        return result
