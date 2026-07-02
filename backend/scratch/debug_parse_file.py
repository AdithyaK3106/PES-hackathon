import sys
import os
import pandas as pd
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.engines.statement_parser import StatementParser

def debug_file():
    fp = 'Bank-statements-dataset/Secondary/42618891001229 STATEMENT IN EXCEL.xlsx'
    parser = StatementParser()
    
    print("--- PREVIEW SCAN ---")
    df_preview = pd.read_excel(fp, nrows=50, header=None)
    header_idx = -1
    for idx, row in df_preview.iterrows():
        cells = [str(val).strip().lower() for val in row.values if not pd.isna(val)]
        date_matches = any(kw in cell for cell in cells for kw in ['date', 'dt'])
        desc_matches = any(kw in cell for cell in cells for kw in ['particular', 'description', 'narration', 'details', 'remarks'])
        amt_matches = any(kw in cell for cell in cells for kw in ['amt', 'amount', 'debit', 'credit', 'dr', 'cr', 'withdrawal', 'deposit', 'bal', 'balance'])
        
        if date_matches and (desc_matches or amt_matches):
            header_idx = idx
            print(f"Matched header at index {idx}: {cells}")
            break

    if header_idx == -1:
        print("No header matched!")
        return

    print(f"\n--- LOADING WITH SKIPROWS={header_idx} ---")
    df = pd.read_excel(fp, skiprows=header_idx)
    print(f"Loaded DataFrame with shape: {df.shape}")
    print(f"Original columns: {df.columns.tolist()[:10]}...")
    
    df.columns = [str(col).lower().replace('\n', ' ').strip() for col in df.columns]
    print(f"Normalized columns: {df.columns.tolist()[:10]}...")
    
    # Identify columns
    date_col = parser._find_column(list(df.columns), ['date', 'dt'])
    desc_col = parser._find_column(list(df.columns), ['particular', 'desc', 'narration', 'narrative', 'detail', 'remark', 'info'])
    debit_col = parser._find_column(list(df.columns), ['debit', 'withdrawal', 'dr_amt', 'dr'])
    credit_col = parser._find_column(list(df.columns), ['credit', 'deposit', 'cr_amt', 'cr'])
    amount_col = parser._find_column(list(df.columns), ['amount', 'value', 'transaction amount'])
    balance_col = parser._find_column(list(df.columns), ['balance', 'bal', 'running balance'])
    
    print(f"date_col index: {date_col}")
    print(f"desc_col index: {desc_col}")
    print(f"debit_col index: {debit_col}")
    print(f"credit_col index: {credit_col}")
    print(f"amount_col index: {amount_col}")
    print(f"balance_col index: {balance_col}")
    
    print("\n--- LOOPING ROWS ---")
    parsed_rows = 0
    skipped_rows = 0
    for idx, row in df.iterrows():
        # Check null columns
        if pd.isna(row.iloc[date_col]) or pd.isna(row.iloc[desc_col]):
            print(f"Row {idx} skipped: date is nan ({pd.isna(row.iloc[date_col])}) or desc is nan ({pd.isna(row.iloc[desc_col])})")
            skipped_rows += 1
            continue
            
        date_str = str(row.iloc[date_col]).strip()
        desc_str = str(row.iloc[desc_col]).strip()
        
        if not date_str or not desc_str or date_str.lower() == 'nan' or desc_str.lower() == 'nan':
            print(f"Row {idx} skipped: date_str={date_str} or desc_str={desc_str} empty/nan")
            skipped_rows += 1
            continue
            
        try:
            timestamp = parser._parse_date(date_str)
            print(f"Row {idx} - date_str: '{date_str}' -> timestamp: '{timestamp}' | desc: '{desc_str[:30]}'")
            parsed_rows += 1
        except Exception as e:
            print(f"Row {idx} exception: {e}")
            skipped_rows += 1

    print(f"\nSummary: parsed_rows={parsed_rows}, skipped_rows={skipped_rows}")

if __name__ == "__main__":
    debug_file()
