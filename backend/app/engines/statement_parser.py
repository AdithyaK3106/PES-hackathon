import pdfplumber
import pandas as pd
from datetime import datetime
from typing import List, Dict, Tuple, Any
import re
from pathlib import Path
from dateutil import parser as date_parser

class StatementParser:
    def __init__(self):
        self.account_id = None
        self.statement_period = None

    def parse_statement(self, file_path: str) -> Tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
        """
        Parse bank statement from PDF, CSV, XLSX, XLS, or TXT.
        Returns Tuple of (account_id, transactions, parser_stats)
        """
        file_ext = Path(file_path).suffix.lower()
        transactions = []
        account_id = None
        parser_stats = {
            "total_rows": 0,
            "parsed_rows": 0,
            "skipped_rows": 0,
            "confidence": 100.0,
            "warnings": [],
            "source_format": "Unknown"
        }

        try:
            if file_ext == '.pdf':
                account_id, transactions, parser_stats = self._parse_pdf(file_path, parser_stats)
            elif file_ext == '.csv':
                account_id, transactions, parser_stats = self._parse_csv(file_path, parser_stats)
            elif file_ext in ['.xlsx', '.xls']:
                account_id, transactions, parser_stats = self._parse_excel(file_path, parser_stats)
            elif file_ext == '.txt':
                account_id, transactions, parser_stats = self._parse_txt(file_path, parser_stats)
            else:
                raise ValueError(f"Unsupported file format: {file_ext}")
        except Exception as e:
            parser_stats["warnings"].append(f"Parser encountered critical error: {str(e)}")
            parser_stats["confidence"] = 0.0
            if not account_id:
                account_id = Path(file_path).stem

        # Post-process transactions to ensure they have ID, channel, standard dates
        for idx, tx in enumerate(transactions):
            if "tx_id" not in tx or not tx["tx_id"]:
                tx["tx_id"] = f"{account_id}_tx_{idx}"
            tx["sender_account"] = account_id if tx["is_debit"] else "external"
            tx["receiver_account"] = "external" if tx["is_debit"] else account_id
            if "channel" not in tx:
                tx["channel"] = "bank_statement"

        # Calculate final confidence
        total = parser_stats["total_rows"]
        parsed = parser_stats["parsed_rows"]
        if total > 0:
            parser_stats["confidence"] = round((parsed / total) * 100, 2)
        else:
            parser_stats["confidence"] = 0.0 if parser_stats["warnings"] else 100.0

        return account_id, transactions, parser_stats

    def _extract_account_id(self, text: str) -> str:
        """Extract account number from statement text using regex patterns."""
        patterns = [
            r'Account\s*No\s*[:#\-]?\s*(\d{9,18})',
            r'Account\s*Number\s*[:#\-]?\s*(\d{9,18})',
            r'A/C\s*No\s*[:#\-]?\s*(\d{9,18})',
            r'A/c\s*[:#\-]?\s*(\d{9,18})',
            r'Statement of Account No\s*-\s*(\d{9,18})',
            r'SB101\s+(\d{9,18})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string flexibly using dateutil, with optimizations."""
        if not date_str or pd.isna(date_str) or str(date_str).strip() == "":
            raise ValueError("Empty date string")
        
        # Clean newlines and returns from cell wrapping
        clean_str = str(date_str).strip().replace("\n", "").replace("\r", "")
        
        # Quick length and complexity filter to skip footers/descriptions early
        if len(clean_str) > 25 or len(clean_str.split()) > 3:
            raise ValueError(f"String too long or complex for date: '{clean_str}'")

        # Strip trailing/leading non-alphanumeric chars
        clean_str = re.sub(r'^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$', '', clean_str)
        if not clean_str:
            raise ValueError("Empty string after stripping non-alphanumeric characters")

        # Try fast-path formats
        for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%d-%b-%Y', '%Y-%m-%d', '%d-%m-%y', '%d/%m/%y', '%d-%b-%y', '%d-%B-%Y', '%d-%B-%y'):
            try:
                return datetime.strptime(clean_str, fmt)
            except ValueError:
                pass
            try:
                return datetime.strptime(clean_str.title(), fmt)
            except ValueError:
                pass
            try:
                return datetime.strptime(clean_str.upper(), fmt)
            except ValueError:
                pass

        # Parse with dateutil fallback only if there are digits
        if not any(char.isdigit() for char in clean_str):
            raise ValueError(f"No digits in date candidate: '{clean_str}'")

        dt = date_parser.parse(clean_str, dayfirst=True)
        return dt.replace(tzinfo=None)

    def _parse_amount(self, amount_str: str) -> float:
        """Clean and parse transaction amounts (handling lakhs commas, symbols, wrapped newlines)."""
        if not amount_str or pd.isna(amount_str):
            return 0.0
        # Clean newlines and returns
        clean_str = str(amount_str).strip().replace("\n", "").replace("\r", "")
        cleaned = re.sub(r'[^\d.\-]', '', clean_str)
        if not cleaned:
            return 0.0
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def _parse_pdf(self, file_path: str, stats: Dict) -> Tuple[str, List[Dict], Dict]:
        """Extract transactions and account info from PDF table using pdfplumber."""
        transactions = []
        account_id = None
        stats["source_format"] = "PDF Table"

        with pdfplumber.open(file_path) as pdf:
            # Parse first page for account details
            first_page = pdf.pages[0]
            text = first_page.extract_text() or ""
            account_id = self._extract_account_id(text)

            # Extract tables from all pages
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                if not tables:
                    continue
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Header detection
                    header = [str(cell).lower().replace('\n', ' ').strip() if cell else "" for cell in table[0]]
                    date_col = self._find_column(header, ['date', 'dt'])
                    desc_col = self._find_column(header, ['particular', 'desc', 'narration', 'narrative', 'detail', 'remark', 'info'])
                    
                    # Columns check: look for debit/credit or amount columns
                    debit_col = self._find_column(header, ['debit', 'withdrawal', 'dr_amt', 'dr'])
                    credit_col = self._find_column(header, ['credit', 'deposit', 'cr_amt', 'cr'])
                    amount_col = self._find_column(header, ['amount', 'value', 'transaction amount'])
                    balance_col = self._find_column(header, ['balance', 'bal', 'running balance'])

                    # If no valid column config, skip table
                    if date_col == -1 or desc_col == -1:
                        continue

                    for row_idx, row in enumerate(table[1:]):
                        if not any(row):  # Skip empty rows
                            continue
                        
                        stats["total_rows"] += 1
                        try:
                            # Build transaction dict
                            date_str = str(row[date_col]).strip() if date_col >= 0 and date_col < len(row) else ""
                            desc_str = str(row[desc_col]).strip() if desc_col >= 0 and desc_col < len(row) else ""
                            
                            if not date_str or not desc_str:
                                stats["skipped_rows"] += 1
                                continue

                            timestamp = self._parse_date(date_str)
                            
                            # Determine debit/credit amount
                            amount = 0.0
                            is_debit = True
                            
                            # Check separate debit/credit columns
                            if debit_col >= 0 and debit_col < len(row) and row[debit_col] and str(row[debit_col]).strip():
                                val = self._parse_amount(row[debit_col])
                                if val > 0:
                                    amount = val
                                    is_debit = True
                            if credit_col >= 0 and credit_col < len(row) and row[credit_col] and str(row[credit_col]).strip():
                                val = self._parse_amount(row[credit_col])
                                if val > 0:
                                    amount = val
                                    is_debit = False
                                    
                            # If no separate debit/credit, check main amount column
                            if amount == 0.0 and amount_col >= 0 and amount_col < len(row) and row[amount_col] and str(row[amount_col]).strip():
                                val = self._parse_amount(row[amount_col])
                                amount = abs(val)
                                is_debit = val < 0 or '-' in str(row[amount_col])
                                
                            balance_val = None
                            if balance_col >= 0 and balance_col < len(row) and row[balance_col] and str(row[balance_col]).strip():
                                balance_val = self._parse_amount(row[balance_col])

                            tx = {
                                "tx_id": f"pdf_{timestamp.timestamp()}_{amount}_{row_idx}",
                                "date": timestamp,
                                "timestamp": timestamp.isoformat() + "Z",
                                "description": desc_str,
                                "raw_description": desc_str,
                                "amount": amount,
                                "is_debit": is_debit,
                                "balance_after": balance_val
                            }
                            transactions.append(tx)
                            stats["parsed_rows"] += 1
                        except Exception as e:
                            stats["skipped_rows"] += 1
                            stats["warnings"].append(f"Page {page_num+1} row {row_idx}: failed to parse - {str(e)}")

        if not account_id:
            account_id = Path(file_path).stem
        return account_id, transactions, stats

    def _parse_csv(self, file_path: str, stats: Dict) -> Tuple[str, List[Dict], Dict]:
        """Extract transactions from CSV file with metadata skipping and format detection."""
        # Find header index and columns
        delimiter = ','
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = [f.readline() for _ in range(50)]
        
        for line in lines:
            if '\t' in line:
                delimiter = '\t'
                break
                
        header_idx = 0
        columns = []
        account_id = None
        
        # Scan header and meta
        for idx, line in enumerate(lines):
            line_clean = line.strip()
            if not line_clean:
                continue
            
            if not account_id:
                account_id = self._extract_account_id(line_clean)
                
            cells = [c.strip().lower() for c in line_clean.split(delimiter)]
            date_matches = any(self._cell_contains_keywords(cell, ['date', 'dt']) for cell in cells)
            desc_matches = any(self._cell_contains_keywords(cell, ['particular', 'description', 'narration', 'details', 'remarks']) for cell in cells)
            amt_matches = any(self._cell_contains_keywords(cell, ['amt', 'amount', 'debit', 'credit', 'dr', 'cr', 'withdrawal', 'deposit', 'bal', 'balance']) for cell in cells)
            
            if date_matches and (desc_matches or amt_matches):
                header_idx = idx
                columns = [c.strip() for c in line.split(delimiter)]
                break
                
        # Detect source format
        cols_lower = [c.lower() for c in columns]
        if "tran_date" in cols_lower and "sol" in cols_lower:
            stats["source_format"] = "Axis Bank CSV"
        elif "withdrawal/deposit" in cols_lower or ("withdrawal" in cols_lower and "deposit" in cols_lower):
            stats["source_format"] = "Kotak/Union CSV"
        elif "dr_amt" in cols_lower or "cr_amt" in cols_lower:
            stats["source_format"] = "SBI/ICORE CSV"
        else:
            stats["source_format"] = "CSV Statement"

        # Load CSV using pandas starting from header row
        df = pd.read_csv(file_path, skiprows=header_idx, sep=delimiter)
        return self._df_to_transactions(df, account_id, stats)

    def _parse_excel(self, file_path: str, stats: Dict) -> Tuple[str, List[Dict], Dict]:
        """Extract transactions from Excel (XLSX, XLS) statements."""
        # Find header index using preview
        df_preview = pd.read_excel(file_path, nrows=50, header=None)
        header_idx = 0
        account_id = None
        
        for idx, row in df_preview.iterrows():
            row_str = " ".join([str(val) for val in row.values if not pd.isna(val)])
            if not account_id:
                account_id = self._extract_account_id(row_str)
                
            cells = [str(val).strip().lower() for val in row.values if not pd.isna(val)]
            date_matches = any(self._cell_contains_keywords(cell, ['date', 'dt']) for cell in cells)
            desc_matches = any(self._cell_contains_keywords(cell, ['particular', 'description', 'narration', 'details', 'remarks']) for cell in cells)
            amt_matches = any(self._cell_contains_keywords(cell, ['amt', 'amount', 'debit', 'credit', 'dr', 'cr', 'withdrawal', 'deposit', 'bal', 'balance']) for cell in cells)
            
            if date_matches and (desc_matches or amt_matches):
                header_idx = idx
                break

        stats["source_format"] = "Excel Statement"
        df = pd.read_excel(file_path, skiprows=header_idx)
        return self._df_to_transactions(df, account_id, stats)

    def _df_to_transactions(self, df: pd.DataFrame, account_id: str, stats: Dict) -> Tuple[str, List[Dict], Dict]:
        """Process pandas DataFrame rows to standardized transactions."""
        transactions = []
        if not account_id:
            account_id = Path(stats.get("source_file", "statement")).stem

        df.columns = [str(col).lower().replace('\n', ' ').strip() for col in df.columns]

        # Identify columns
        date_col = self._find_column(list(df.columns), ['date', 'dt'])
        desc_col = self._find_column(list(df.columns), ['particular', 'desc', 'narration', 'narrative', 'detail', 'remark', 'info'])
        
        debit_col = self._find_column(list(df.columns), ['debit', 'withdrawal', 'dr_amt', 'dr'])
        credit_col = self._find_column(list(df.columns), ['credit', 'deposit', 'cr_amt', 'cr'])
        amount_col = self._find_column(list(df.columns), ['amount', 'value', 'transaction amount'])
        balance_col = self._find_column(list(df.columns), ['balance', 'bal', 'running balance'])

        if date_col == -1 or desc_col == -1:
            date_col, desc_col, debit_col, credit_col, amount_col, balance_col = self._find_fallback_columns(df)
            if date_col == -1 or desc_col == -1:
                return account_id, transactions, stats

        for idx, row in df.iterrows():
            if idx > 10000: # Safety cap
                break
                
            # Skip rows where crucial columns are null
            if date_col == -1 or desc_col == -1 or pd.isna(row.iloc[date_col]) or pd.isna(row.iloc[desc_col]):
                continue

            stats["total_rows"] += 1
            try:
                date_str = str(row.iloc[date_col]).strip()
                desc_str = str(row.iloc[desc_col]).strip()
                
                if not date_str or not desc_str or date_str.lower() == 'nan' or desc_str.lower() == 'nan':
                    stats["skipped_rows"] += 1
                    continue

                timestamp = self._parse_date(date_str)
                
                # Debit/Credit amount check
                amount = 0.0
                is_debit = True

                # Check separate columns
                if debit_col >= 0 and debit_col < len(row) and not pd.isna(row.iloc[debit_col]) and str(row.iloc[debit_col]).strip():
                    val = self._parse_amount(str(row.iloc[debit_col]))
                    if val > 0:
                        amount = val
                        is_debit = True
                if credit_col >= 0 and credit_col < len(row) and not pd.isna(row.iloc[credit_col]) and str(row.iloc[credit_col]).strip():
                    val = self._parse_amount(str(row.iloc[credit_col]))
                    if val > 0:
                        amount = val
                        is_debit = False
                        
                # If no separate debit/credit amount, check amount column
                if amount == 0.0 and amount_col >= 0 and amount_col < len(row) and not pd.isna(row.iloc[amount_col]) and str(row.iloc[amount_col]).strip():
                    val = self._parse_amount(str(row.iloc[amount_col]))
                    amount = abs(val)
                    is_debit = val < 0 or '-' in str(row.iloc[amount_col])
                
                balance_val = None
                if balance_col >= 0 and balance_col < len(row) and not pd.isna(row.iloc[balance_col]) and str(row.iloc[balance_col]).strip():
                    balance_val = self._parse_amount(str(row.iloc[balance_col]))

                tx = {
                    "tx_id": f"df_{timestamp.timestamp()}_{amount}_{idx}",
                    "date": timestamp,
                    "timestamp": timestamp.isoformat() + "Z",
                    "description": desc_str,
                    "raw_description": desc_str,
                    "amount": amount,
                    "is_debit": is_debit,
                    "balance_after": balance_val
                }
                transactions.append(tx)
                stats["parsed_rows"] += 1
            except Exception as e:
                stats["skipped_rows"] += 1
                stats["warnings"].append(f"Row {idx}: failed to parse - {str(e)}")

        if not account_id:
            account_id = "unknown"
        return account_id, transactions, stats

    def _parse_txt(self, file_path: str, stats: Dict) -> Tuple[str, List[Dict], Dict]:
        """Extract transactions from PNB or Kerala Gramin Bank (KLGB) fixed-width txt files."""
        transactions = []
        account_id = None
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
        full_text = "".join(lines)
        
        if "KERALA GRAMIN BANK" in full_text:
            stats["source_format"] = "Kerala Gramin Bank TXT"
            acct_match = re.search(r'Account Number\s*:\s*(?:SB\d+\s+)?(\d+)', full_text, re.IGNORECASE)
            if acct_match:
                account_id = acct_match.group(1).strip()
            
            for idx, line in enumerate(lines):
                match = re.match(r'^\s*(\d{2}-\d{2}-\d{2})\s+(\d{2}-\d{2}-\d{2})', line)
                if match:
                    stats["total_rows"] += 1
                    try:
                        date_str = match.group(1).strip()
                        timestamp = self._parse_date(date_str)
                        
                        desc = line[32:82].strip()
                        debit_str = line[102:116].strip()
                        credit_str = line[116:131].strip()
                        balance_str = line[131:148].strip()
                        
                        amount = 0.0
                        is_debit = True
                        
                        if debit_str:
                            val = self._parse_amount(debit_str)
                            if val > 0:
                                amount = val
                                is_debit = True
                        if credit_str:
                            val = self._parse_amount(credit_str)
                            if val > 0:
                                amount = val
                                is_debit = False
                                
                        balance_val = self._parse_amount(balance_str) if balance_str else None
                        
                        tx = {
                            "tx_id": f"txt_klgb_{timestamp.timestamp()}_{amount}_{idx}",
                            "date": timestamp,
                            "timestamp": timestamp.isoformat() + "Z",
                            "description": desc,
                            "raw_description": desc,
                            "amount": amount,
                            "is_debit": is_debit,
                            "balance_after": balance_val
                        }
                        transactions.append(tx)
                        stats["parsed_rows"] += 1
                    except Exception as e:
                        stats["skipped_rows"] += 1
                        stats["warnings"].append(f"Line {idx}: KGB fail - {str(e)}")
                        
        elif "PUNJAB NATIONAL BANK" in full_text:
            stats["source_format"] = "Punjab National Bank TXT"
            acct_match = re.search(r'Account No\s*:\s*(\d+)', full_text, re.IGNORECASE)
            if acct_match:
                account_id = acct_match.group(1).strip()
                
            for idx, line in enumerate(lines):
                match = re.match(r'^\s*(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})', line)
                if match:
                    stats["total_rows"] += 1
                    try:
                        date_str = match.group(1).strip()
                        timestamp = self._parse_date(date_str)
                        
                        desc = line[41:101].strip()
                        debit_str = line[101:121].strip()
                        credit_str = line[121:141].strip()
                        balance_str = line[141:161].strip()
                        
                        amount = 0.0
                        is_debit = True
                        
                        if debit_str:
                            val = self._parse_amount(debit_str)
                            if val > 0:
                                amount = val
                                is_debit = True
                        if credit_str:
                            val = self._parse_amount(credit_str)
                            if val > 0:
                                amount = val
                                is_debit = False
                                
                        balance_val = self._parse_amount(balance_str) if balance_str else None
                        
                        tx = {
                            "tx_id": f"txt_pnb_{timestamp.timestamp()}_{amount}_{idx}",
                            "date": timestamp,
                            "timestamp": timestamp.isoformat() + "Z",
                            "description": desc,
                            "raw_description": desc,
                            "amount": amount,
                            "is_debit": is_debit,
                            "balance_after": balance_val
                        }
                        transactions.append(tx)
                        stats["parsed_rows"] += 1
                    except Exception as e:
                        stats["skipped_rows"] += 1
                        stats["warnings"].append(f"Line {idx}: PNB fail - {str(e)}")
        else:
            stats["source_format"] = "Generic TXT"
            stats["warnings"].append("Could not identify KGB or PNB statement formats in TXT.")
            
        if not account_id:
            account_id = Path(file_path).stem
            
        return account_id, transactions, stats

    def _cell_contains_keywords(self, cell_text: str, keywords: List[str]) -> bool:
        """Helper to match keywords against cell text using word boundaries."""
        if not cell_text:
            return False
        words = re.split(r'[^a-z0-9]', str(cell_text).lower())
        for word in words:
            for kw in keywords:
                if word.startswith(kw.lower()):
                    return True
        return False

    def _find_column(self, columns: List[str], keywords: List[str]) -> int:
        """Find column index by keyword matching using word boundaries."""
        for keyword in keywords:
            for i, col in enumerate(columns):
                if self._cell_contains_keywords(col, [keyword]):
                    return i
        return -1  # Default to -1 (not found)

    def _find_fallback_columns(self, df: pd.DataFrame) -> Tuple[int, int, int, int, int, int]:
        """Attempt to guess columns based on data types if no headers match."""
        date_col = -1
        desc_col = -1
        debit_col = -1
        credit_col = -1
        amount_col = -1
        balance_col = -1
        
        if df.empty:
            return date_col, desc_col, debit_col, credit_col, amount_col, balance_col
            
        sample_row = None
        for _, row in df.iterrows():
            if not row.isna().all():
                sample_row = row
                break
                
        if sample_row is None:
            return date_col, desc_col, debit_col, credit_col, amount_col, balance_col
            
        for i, val in enumerate(sample_row):
            if pd.isna(val):
                continue
            
            # Check for Date
            if isinstance(val, (datetime, pd.Timestamp)):
                if date_col == -1:
                    date_col = i
            elif isinstance(val, str):
                val_clean = val.strip()
                if re.match(r'^\d{2,4}[-/]\d{2}[-/]\d{2,4}', val_clean) or re.match(r'^\d{2}[-/][a-zA-Z]{3}[-/]\d{2,4}', val_clean):
                    if date_col == -1:
                        date_col = i
                elif len(val_clean) > 15:
                    if desc_col == -1:
                        desc_col = i
            elif isinstance(val, (int, float)) and not isinstance(val, bool):
                if amount_col == -1:
                    amount_col = i
                elif balance_col == -1:
                    balance_col = i
                    
        if desc_col == -1:
            longest_len = 0
            for i, val in enumerate(sample_row):
                if isinstance(val, str) and i != date_col:
                    if len(val) > longest_len:
                        longest_len = len(val)
                        desc_col = i
                        
        return date_col, desc_col, debit_col, credit_col, amount_col, balance_col
