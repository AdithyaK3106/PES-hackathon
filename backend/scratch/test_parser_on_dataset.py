import os
import sys
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.engines.statement_parser import StatementParser

def test_all_statements():
    parser = StatementParser()
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dataset_dir = os.path.join(base_dir, "Bank-statements-dataset")
    
    if not os.path.exists(dataset_dir):
        print(f"Dataset directory not found at: {dataset_dir}")
        return

    # Gather all files
    files = []
    for root, _, filenames in os.walk(dataset_dir):
        for f in filenames:
            ext = Path(f).suffix.lower()
            if ext in ['.pdf', '.csv', '.xlsx', '.xls', '.txt']:
                files.append(os.path.join(root, f))

    print(f"Found {len(files)} bank statement files to test.")
    
    success_count = 0
    fail_count = 0
    results = []

    for idx, fp in enumerate(files):
        rel_path = os.path.relpath(fp, dataset_dir)
        print(f"[{idx+1}/{len(files)}] Processing {rel_path}...")
        try:
            account_id, transactions, parser_stats = parser.parse_statement(fp)
            
            # Print parsed details
            num_txs = len(transactions)
            confidence = parser_stats.get("confidence", 0.0)
            fmt = parser_stats.get("source_format", "Unknown")
            warnings = parser_stats.get("warnings", [])
            
            status = "SUCCESS" if confidence > 50.0 and num_txs > 0 else "PARTIAL/LOW_CONF"
            if num_txs == 0:
                status = "EMPTY/ZERO_TX"
                
            print(f"  Status: {status} | Account: {account_id} | Txs: {num_txs} | Conf: {confidence}% | Format: {fmt}")
            if warnings:
                print(f"  Warnings: {len(warnings)} found (showing first 3):")
                for w in warnings[:3]:
                    print(f"    - {w}")
                    
            results.append({
                "path": rel_path,
                "status": status,
                "account_id": account_id,
                "tx_count": num_txs,
                "confidence": confidence,
                "format": fmt,
                "warnings": warnings,
                "error": None
            })
            success_count += 1
        except Exception as e:
            print(f"  FAILED with critical exception: {e}")
            results.append({
                "path": rel_path,
                "status": "CRITICAL_FAIL",
                "account_id": None,
                "tx_count": 0,
                "confidence": 0.0,
                "format": "Unknown",
                "warnings": [],
                "error": str(e)
            })
            fail_count += 1

    print("\n" + "="*50)
    print("PARSING TEST SUMMARY:")
    print("="*50)
    print(f"Total Statements Tested: {len(files)}")
    print(f"Success/Partial Run: {success_count}")
    print(f"Critical Failures: {fail_count}")
    
    # Categorized results
    statuses = {}
    for r in results:
        statuses[r["status"]] = statuses.get(r["status"], 0) + 1
    
    print("\nStatus Breakdown:")
    for status, count in statuses.items():
        print(f"  - {status}: {count}")

    print("\nTop 10 Files with low confidence or errors:")
    low_conf_files = [r for r in results if r["status"] in ["PARTIAL/LOW_CONF", "CRITICAL_FAIL", "EMPTY/ZERO_TX"]]
    for r in low_conf_files[:20]:
        err_msg = f" | Error: {r['error']}" if r["error"] else ""
        print(f"  - {r['path']} ({r['status']}) | Txs: {r['tx_count']} | Conf: {r['confidence']}% | Format: {r['format']}{err_msg}")

if __name__ == "__main__":
    test_all_statements()
