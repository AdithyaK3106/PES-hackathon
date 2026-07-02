import os
import sys
import pandas as pd
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def inspect_all():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dataset_dir = os.path.join(base_dir, "Bank-statements-dataset")
    
    files = []
    for root, _, filenames in os.walk(dataset_dir):
        for f in filenames:
            ext = Path(f).suffix.lower()
            if ext in ['.csv', '.xlsx', '.xls']:
                files.append(os.path.join(root, f))

    print(f"Inspecting {len(files)} files...")
    
    for fp in files[:30]:  # Inspect first 30 files
        rel_path = os.path.relpath(fp, dataset_dir)
        print("\n" + "-"*50)
        print(f"File: {rel_path}")
        ext = Path(fp).suffix.lower()
        try:
            if ext == '.csv':
                # Try tab or comma
                delimiter = ','
                with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                    first_lines = [f.readline() for _ in range(5)]
                for line in first_lines:
                    if '\t' in line:
                        delimiter = '\t'
                        break
                
                df = pd.read_csv(fp, sep=delimiter, nrows=5)
                print(f"CSV Columns: {df.columns.tolist()}")
                print(f"First row: {df.iloc[0].values if len(df) > 0 else 'None'}")
            else:
                # Excel
                df_preview = pd.read_excel(fp, nrows=5, header=None)
                print("Excel preview rows:")
                for idx, row in df_preview.iterrows():
                    print(f"  Row {idx}: {row.values.tolist()}")
        except Exception as e:
            print(f"Error inspecting: {e}")

if __name__ == "__main__":
    inspect_all()
