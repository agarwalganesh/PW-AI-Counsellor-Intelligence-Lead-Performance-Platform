import json
from pathlib import Path
import pandas as pd
from clean_dod_data import get_merged_dataframe

def generate_json():
    # Path to Excel file
    excel_path = Path("May dod data .xlsx")
    if not excel_path.exists():
        print(f"Error: {excel_path} not found.")
        return
        
    print("Loading and cleaning Excel data...")
    df = get_merged_dataframe(excel_path)
    
    # Standardize column names to be JSON friendly and match typical variants.
    # For dates, convert to string format so it serializes properly. Coerce first so
    # an object-dtype column (mixed datetimes / NaN from cross-sheet reindex) doesn't
    # raise "Can only use .dt accessor with datetimelike values".
    for date_col in ("Date", "Joining date", "Joining Date", "__axis_date__"):
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce").dt.strftime("%Y-%m-%d")
        
    # Export to clean_data.json
    output_path = Path("clean_data.json")
    print(f"Writing to {output_path}...")
    df.to_json(output_path, orient="records", date_format="iso", indent=2)
    print("Generation complete!")

if __name__ == "__main__":
    generate_json()
