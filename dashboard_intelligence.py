"""
=============================================================================
dashboard_intelligence.py
=============================================================================
Modular Python engine providing 4 core intelligence features:
  1. Month-over-Month (MoM) Comparison
  2. Automated Coaching Recommendations (Rule-based Diagnostic Engine)
  3. Revenue Forecast Engine (SMA-based)
  4. Counsellor Comparison Tool (Delta Reports)

Suitable for plugging directly into a dashboard pipeline (e.g. Streamlit,
Dash, Jupyter, or Flask backend).
=============================================================================
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# COLUMN CONSOLIDATION HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def pick_col(df: pd.DataFrame, *candidates: str) -> str:
    """
    Returns the first matching column name from candidates that exists in df.
    Case-insensitive check is performed.
    """
    cols_lower = {c.lower(): c for c in df.columns}
    for c in candidates:
        if c.lower() in cols_lower:
            return cols_lower[c.lower()]
    return candidates[0]


def consolidate_column(df: pd.DataFrame, target_name: str, aliases: Optional[List[str]] = None) -> pd.Series:
    """
    Consolidates columns by searching for target_name and its aliases in the DataFrame.
    The aliases are name/casing VARIANTS of the SAME metric (e.g. "Total admissions"
    vs "Total Adm"), so when multiple exist they are COALESCED row-wise (first
    populated value wins) — NOT summed, which would double-count the same metric.
    If only one exists, it returns it as a numeric series.
    If none exist, returns a Series of zeros.
    """
    if aliases is None:
        aliases = []
    search_names = [target_name.lower()] + [a.lower() for a in aliases]
    found_cols = [c for c in df.columns if c.lower() in search_names]

    if not found_cols:
        return pd.Series(0.0, index=df.index)

    if len(found_cols) == 1:
        return pd.to_numeric(df[found_cols[0]], errors="coerce").fillna(0.0)

    # Multiple variant columns present (e.g. in a merged dataset): coalesce row-wise.
    # Take the first column's value; where it is missing (NaN), fall back to the next.
    result = pd.to_numeric(df[found_cols[0]], errors="coerce")
    for col in found_cols[1:]:
        result = result.fillna(pd.to_numeric(df[col], errors="coerce"))
    return result.fillna(0.0)


def get_standardized_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Returns a standardized DataFrame with consolidated columns for downstream analytics.
    This resolves issues with duplicate columns after concatenation (e.g. Total Adm vs Total admissions).
    """
    std_df = pd.DataFrame(index=df.index)
    
    # 1. Resolve Counselor Email
    email_col = pick_col(df, "Counselor Email", "Counsellor Email", "Email")
    if email_col in df.columns:
        std_df["Counselor Email"] = df[email_col].astype(str).str.strip().str.lower().replace("nan", "")
    else:
        std_df["Counselor Email"] = ""
        
    # 2. Resolve Date
    date_col = pick_col(df, "Date", "date", "Reporting Date", "__axis_date__")
    if date_col in df.columns:
        std_df["Date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        std_df["Date"] = pd.NaT

    # 3. Consolidate Key KPIs
    std_df["Total Adm"] = consolidate_column(df, "Total Adm", ["Total admissions", "Total Admissions"])
    std_df["Talktime"] = consolidate_column(df, "Talktime (In hours)", ["Talktime", "talktime"])
    std_df["Dialled Calls"] = consolidate_column(df, "Dialled Calls", ["Dialled calls"])
    std_df["Connected Calls"] = consolidate_column(df, "Connected calls", ["Connected Calls"])
    std_df["Effective Calls"] = consolidate_column(df, "Effective calls", ["Effective Calls"])
    std_df["EMI Paid"] = consolidate_column(df, "EMI Paid")
    std_df["Full Payment On Spot"] = consolidate_column(df, "Full Payment On spot", ["Full Payment On Spot"])
    std_df["Auto Dial"] = consolidate_column(df, "Auto Dial")
    std_df["Manual Dial"] = consolidate_column(df, "Manual Dial")
    std_df["AI Calls"] = consolidate_column(df, "AI")
    
    # 4. Copy status / categories if present
    status_col = pick_col(df, "Status", "status")
    if status_col in df.columns:
        std_df["Status"] = df[status_col]
        
    return std_df


# ═════════════════════════════════════════════════════════════════════════════
# 1. MONTH-OVER-MONTH (MoM) COMPARISON
# ═════════════════════════════════════════════════════════════════════════════
def mom_comparison(current_df: pd.DataFrame, previous_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates the Month-over-Month (MoM) percentage change and growth trends
    for key metrics ('Total Adm', 'Talktime', 'Dialled Calls') per counsellor.

    Parameters:
    -----------
    current_df  : pd.DataFrame
        DataFrame representing the current month's counselor performance.
    previous_df : pd.DataFrame
        DataFrame representing the previous month's counselor performance.

    Returns:
    --------
    pd.DataFrame
        Aggregated summary indexed by counselor email with raw values,
        percentage change, and visual growth labels for each metric.
    """
    # Standardize input dataframes to resolve column name aliases
    curr_std = get_standardized_df(current_df)
    prev_std = get_standardized_df(previous_df)

    # Helper function to aggregate to counselor level
    def aggregate_counsellors(std_df: pd.DataFrame) -> pd.DataFrame:
        if std_df.empty:
            return pd.DataFrame(columns=["Total Adm", "Talktime", "Dialled Calls"])
            
        agg = std_df.groupby("Counselor Email").agg({
            "Total Adm": "sum",
            "Talktime": "sum",
            "Dialled Calls": "sum"
        })
        return agg

    curr_agg = aggregate_counsellors(curr_std)
    prev_agg = aggregate_counsellors(prev_std)

    # Outer join to ensure we capture all active counselors across both months
    merged = curr_agg.join(prev_agg, lsuffix="_current", rsuffix="_previous", how="outer").fillna(0.0)

    # Calculate MoM changes
    for metric in ["Total Adm", "Talktime", "Dialled Calls"]:
        curr_col = f"{metric}_current"
        prev_col = f"{metric}_previous"
        pct_col = f"{metric}_MoM_Change(%)"
        label_col = f"{metric}_Growth_Status"

        # Safe division: replace denominator zeros with NaN
        denom = merged[prev_col].replace(0, np.nan)
        merged[pct_col] = ((merged[curr_col] - merged[prev_col]) / denom) * 100

        # Map edge cases where previous month was 0
        merged.loc[(merged[prev_col] == 0) & (merged[curr_col] > 0), pct_col] = 100.0
        merged.loc[(merged[prev_col] == 0) & (merged[curr_col] == 0), pct_col] = 0.0
        
        merged[pct_col] = merged[pct_col].round(2)

        # Generate readable visual flags
        def determine_growth_label(row):
            pct = row[pct_col]
            if pct > 0:
                return f"▲ +{pct:.1f}%"
            elif pct < 0:
                return f"▼ {pct:.1f}%"
            else:
                return "■ 0.0%"

        merged[label_col] = merged.apply(determine_growth_label, axis=1)

    # Arrange columns in a logical grouped order
    ordered_cols = []
    for metric in ["Total Adm", "Talktime", "Dialled Calls"]:
        ordered_cols.extend([f"{metric}_previous", f"{metric}_current", f"{metric}_MoM_Change(%)", f"{metric}_Growth_Status"])
    
    merged.index.name = "Counselor Email"
    return merged[ordered_cols]


def style_growth_report(df: pd.DataFrame) -> pd.io.formats.style.Styler:
    """
    Helper function to apply color highlights to growth labels in a pandas Styler object.
    Useful for Jupyter notebooks and Streamlit UI.
    """
    def get_color_style(val):
        if isinstance(val, str):
            if "▲" in val:
                return "color: #10b981; font-weight: bold; background-color: rgba(16, 185, 129, 0.1);"
            elif "▼" in val:
                return "color: #ef4444; font-weight: bold; background-color: rgba(239, 68, 68, 0.1);"
        elif isinstance(val, (int, float)):
            if val > 0:
                return "color: #10b981; font-weight: bold;"
            elif val < 0:
                return "color: #ef4444; font-weight: bold;"
        return ""

    style_cols = [c for c in df.columns if "Change" in c or "Status" in c]
    return df.style.map(get_color_style, subset=style_cols)


# ═════════════════════════════════════════════════════════════════════════════
# 2. AUTOMATED COACHING RECOMMENDATIONS (Rule-based Diagnostic Engine)
# ═════════════════════════════════════════════════════════════════════════════
def generate_coaching_recommendations(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rule-based Diagnostic Engine that appends a 'Coaching_Tip' column to the dataframe.
    
    Rules applied:
    - If 'Talktime' < 3 hours AND 'Dialled Calls' > 100:
      "Recommendation: Focus on Call Efficiency"
    - If 'Total Adm' == 0 AND 'Effective calls' > 50:
      "Recommendation: Focus on Closing Techniques"
    - Else:
      "Recommendation: Maintain consistency & monitor progress"

    Parameters:
    -----------
    df : pd.DataFrame
        Dashboard dataframe containing performance logs.

    Returns:
    --------
    pd.DataFrame
        Copy of the input DataFrame with a newly appended 'Coaching_Tip' column.
    """
    # 1. Standardize columns using the helper
    std_df = get_standardized_df(df)

    # Extract Series and coerce (standardized helper already converted to float)
    talk_vals = std_df["Talktime"]
    
    # Check if the values are already in hours based on column names
    orig_cols = [c.lower() for c in df.columns]
    is_already_hours = any("talktime" in c and "hour" in c for c in orig_cols)
    
    # Statistical heuristic based on average call duration
    if not is_already_hours and "Connected Calls" in std_df.columns:
        tot_conn = std_df["Connected Calls"].sum()
        if tot_conn > 0:
            avg_talk = talk_vals.sum() / tot_conn
            if avg_talk < 0.5:
                is_already_hours = True
    
    # Auto-Heuristic: Convert Talktime to Hours if represented in seconds or minutes
    if not is_already_hours and talk_vals.max() > 24:
        if talk_vals.max() > 1000:
            # Scale seconds to hours
            logger.info("  ↳ Talktime auto-scaled: detected seconds → converting to hours.")
            talk_vals = talk_vals / 3600.0
        else:
            # Scale minutes to hours
            logger.info("  ↳ Talktime auto-scaled: detected minutes → converting to hours.")
            talk_vals = talk_vals / 60.0

    dial_vals = std_df["Dialled Calls"]
    adm_vals = std_df["Total Adm"]
    eff_vals = std_df["Effective Calls"]

    # 2. Evaluate rule vectors
    tips = []
    for talk, dial, adm, eff in zip(talk_vals, dial_vals, adm_vals, eff_vals):
        if talk < 3.0 and dial > 100:
            tips.append("Recommendation: Focus on Call Efficiency")
        elif adm == 0 and eff > 50:
            tips.append("Recommendation: Focus on Closing Techniques")
        else:
            tips.append("Recommendation: Maintain consistency & monitor progress")

    # Append to a copy of the ORIGINAL dataframe to retain all other columns
    df_copy = df.copy()
    df_copy["Coaching_Tip"] = tips
    return df_copy


# ═════════════════════════════════════════════════════════════════════════════
# 3. REVENUE FORECAST ENGINE
# ═════════════════════════════════════════════════════════════════════════════
def add_revenue_potential(df: pd.DataFrame, avg_admission_value: float = 5000) -> pd.DataFrame:
    """
    Appends a 'Revenue_Potential' column by multiplying total admissions by avg_admission_value.
    """
    adm_col = pick_col(df, "Total Adm", "Total admissions", "Total Admissions", "admissions")
    df_copy = df.copy()
    df_copy["Revenue_Potential"] = pd.to_numeric(df_copy[adm_col], errors="coerce").fillna(0.0) * avg_admission_value
    return df_copy


def forecast_admissions_and_revenue(
    df: pd.DataFrame,
    avg_admission_value: float = 5000,
    sma_days: int = 15,
    forecast_days: int = 7
) -> pd.DataFrame:
    """
    Forecasts team 'Total Adm' and corresponding 'Revenue_Potential' for the next 7 days
    using a Simple Moving Average (SMA) of the last 15 days.

    Parameters:
    -----------
    df                  : pd.DataFrame
        Historical daily dataframe.
    avg_admission_value : float (default 5000)
        Value of a single admission.
    sma_days            : int (default 15)
        Number of historical days for moving average.
    forecast_days       : int (default 7)
        Number of days to forecast.

    Returns:
    --------
    pd.DataFrame
        Forecast dataset with columns: 'Date', 'Forecasted_Admissions', 'Forecasted_Revenue_Potential'
    """
    # 1. Standardize columns
    std_df = get_standardized_df(df)

    # 2. Aggregate team-level daily admissions
    daily_series = std_df.groupby("Date")["Total Adm"].sum()

    # Drop rows whose Date failed to parse (NaT). Otherwise index.min()/date_range()
    # below would be NaT and raise ValueError during reindexing.
    daily_series = daily_series[daily_series.index.notna()]

    if daily_series.empty:
        logger.warning("Empty series during forecasting. Returning empty dataframe.")
        return pd.DataFrame(columns=["Date", "Forecasted_Admissions", "Forecasted_Revenue_Potential"])

    # 3. Reindex to fill timeline calendar gaps with 0
    full_range = pd.date_range(start=daily_series.index.min(), end=daily_series.index.max(), freq="D")
    daily_series = daily_series.reindex(full_range, fill_value=0.0)

    # 4. Compute SMA of the last N days
    available_days = min(len(daily_series), sma_days)
    if available_days == 0:
        forecast_val = 0.0
    else:
        forecast_val = float(daily_series.tail(available_days).mean())

    forecast_val = round(forecast_val, 2)

    # 5. Generate forecasting timeline
    last_historical_date = daily_series.index.max()
    future_dates = pd.date_range(start=last_historical_date + pd.Timedelta(days=1), periods=forecast_days, freq="D")

    # 6. Build Forecast Output
    forecast_df = pd.DataFrame({
        "Date": future_dates.strftime("%Y-%m-%d"),
        "Forecasted_Admissions": [forecast_val] * forecast_days,
        "Forecasted_Revenue_Potential": [round(forecast_val * avg_admission_value, 2)] * forecast_days
    })

    return forecast_df


# ═════════════════════════════════════════════════════════════════════════════
# 4. COUNSELLOR COMPARISON TOOL
# ═════════════════════════════════════════════════════════════════════════════
def compare_counsellors(
    counsellor1_email: str,
    counsellor2_email: str,
    df: Optional[pd.DataFrame] = None
) -> pd.DataFrame:
    """
    Compares two counsellors side-by-side across all key KPI columns and returns a delta-report.
    If no dataframe is passed, it loads 'clean_data.json' automatically from the current directory.

    Parameters:
    -----------
    counsellor1_email : str
        First counselor email address.
    counsellor2_email : str
        Second counselor email address.
    df                : Optional[pd.DataFrame] (default None)
        Dataframe to use. If None, reads 'clean_data.json' in the current working directory.

    Returns:
    --------
    pd.DataFrame
        Side-by-side comparison table including: KPI, Value1, Value2, Absolute Delta, and Percentage Delta.
    """
    # 1. Fallback loading
    if df is None:
        json_path = Path("clean_data.json")
        if json_path.exists():
            df = pd.read_json(json_path)
        else:
            raise FileNotFoundError(
                "Default 'clean_data.json' not found. Please place it in the same directory "
                "or pass an explicit DataFrame to compare_counsellors()."
            )

    # 2. Standardize columns using the helper
    std_df = get_standardized_df(df)
    
    e1_clean = counsellor1_email.strip().lower()
    e2_clean = counsellor2_email.strip().lower()

    c1_rows = std_df[std_df["Counselor Email"] == e1_clean]
    c2_rows = std_df[std_df["Counselor Email"] == e2_clean]

    # Verify lookups
    if c1_rows.empty:
        raise ValueError(f"Counsellor '{counsellor1_email}' not found in the dataset.")
    if c2_rows.empty:
        raise ValueError(f"Counsellor '{counsellor2_email}' not found in the dataset.")

    # 3. Sum up raw KPIs
    def sum_metric(sub_df: pd.DataFrame, col: str) -> float:
        return float(sub_df[col].sum())

    c1_dial, c2_dial = sum_metric(c1_rows, "Dialled Calls"), sum_metric(c2_rows, "Dialled Calls")
    c1_conn, c2_conn = sum_metric(c1_rows, "Connected Calls"), sum_metric(c2_rows, "Connected Calls")
    c1_eff, c2_eff = sum_metric(c1_rows, "Effective Calls"), sum_metric(c2_rows, "Effective Calls")
    c1_talk, c2_talk = sum_metric(c1_rows, "Talktime"), sum_metric(c2_rows, "Talktime")
    c1_adm, c2_adm = sum_metric(c1_rows, "Total Adm"), sum_metric(c2_rows, "Total Adm")
    c1_emi, c2_emi = sum_metric(c1_rows, "EMI Paid"), sum_metric(c2_rows, "EMI Paid")
    c1_spot, c2_spot = sum_metric(c1_rows, "Full Payment On Spot"), sum_metric(c2_rows, "Full Payment On Spot")
    c1_auto, c2_auto = sum_metric(c1_rows, "Auto Dial"), sum_metric(c2_rows, "Auto Dial")
    c1_man, c2_man = sum_metric(c1_rows, "Manual Dial"), sum_metric(c2_rows, "Manual Dial")
    c1_ai, c2_ai = sum_metric(c1_rows, "AI Calls"), sum_metric(c2_rows, "AI Calls")

    raw_kpis = {
        "Dialled Calls": (c1_dial, c2_dial),
        "Connected Calls": (c1_conn, c2_conn),
        "Effective Calls": (c1_eff, c2_eff),
        "Talktime (Hours)": (c1_talk, c2_talk),
        "Total Admissions": (c1_adm, c2_adm),
        "EMI Paid": (c1_emi, c2_emi),
        "Full Payment On Spot": (c1_spot, c2_spot),
        "Auto Dial": (c1_auto, c2_auto),
        "Manual Dial": (c1_man, c2_man),
        "AI Calls": (c1_ai, c2_ai),
    }

    # 4. Formulate consolidated ratios
    ratios = {
        "Connect Rate (%)": (
            round((c1_conn / c1_dial * 100), 2) if c1_dial > 0 else 0.0,
            round((c2_conn / c2_dial * 100), 2) if c2_dial > 0 else 0.0
        ),
        "Effective Ratio (%)": (
            round((c1_eff / c1_conn * 100), 2) if c1_conn > 0 else 0.0,
            round((c2_eff / c2_conn * 100), 2) if c2_conn > 0 else 0.0
        ),
        "Conversion Rate (%)": (
            round((c1_adm / c1_conn * 100), 2) if c1_conn > 0 else 0.0,
            round((c2_adm / c2_conn * 100), 2) if c2_conn > 0 else 0.0
        ),
        "Revenue Potential": (
            c1_adm * 5000, 
            c2_adm * 5000
        )
    }

    all_kpis = {**raw_kpis, **ratios}

    # 5. Build report DataFrame
    comparison_records = []
    for kpi, (v1, v2) in all_kpis.items():
        abs_delta = round(v1 - v2, 2)
        if v2 == 0:
            pct_delta = 100.0 if v1 > 0 else 0.0
        else:
            pct_delta = round((v1 - v2) / v2 * 100, 2)

        comparison_records.append({
            "KPI": kpi,
            f"{counsellor1_email} (C1)": round(v1, 2),
            f"{counsellor2_email} (C2)": round(v2, 2),
            "Absolute Delta": abs_delta,
            "Percentage Delta (%)": pct_delta
        })

    return pd.DataFrame(comparison_records)


# ═════════════════════════════════════════════════════════════════════════════
# STANDALONE SMOKE-TEST RUNNER
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys
    # Reconfigure stdout to use utf-8 to prevent unicode console encoding errors on Windows
    if sys.platform.startswith("win"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    logger.info("=========================================================")
    logger.info("🧪  Dashboard Intelligence Engine - Smoke Test  🧪")
    logger.info("=========================================================")

    # 1. Load data
    data_path = Path("clean_data.json")
    if not data_path.exists():
        logger.error(f"Missing {data_path}. Run generate_clean_json.py first.")
        exit(1)

    logger.info(f"Loading {data_path}...")
    df = pd.read_json(data_path)
    logger.info(f"Successfully loaded: {df.shape[0]} rows, {df.shape[1]} columns.")

    # Convert date strings to Datetime instances
    df["Date"] = pd.to_datetime(df["Date"])

    # ─────────────────────────────────────────────────────────────────────────
    # Verification 1: Month-over-Month (MoM)
    # ─────────────────────────────────────────────────────────────────────────
    logger.info("\n--- VERIFICATION 1: Month-over-Month (MoM) Comparison ---")
    april_df = df[df["Date"].dt.month == 4]
    may_df = df[df["Date"].dt.month == 5]
    
    logger.info(f"  April rows: {len(april_df)} | May rows: {len(may_df)}")
    mom_df = mom_comparison(may_df, april_df)
    logger.info(f"  MoM comparison table built for {len(mom_df)} counselors.")
    logger.info("  Sample MoM growth records (first 5 rows):")
    print(mom_df.head(5).to_string())

    # ─────────────────────────────────────────────────────────────────────────
    # Verification 2: Automated Coaching Tips
    # ─────────────────────────────────────────────────────────────────────────
    logger.info("\n--- VERIFICATION 2: Rule-Based Coaching Recommendations ---")
    # Apply recommendations to aggregated counselor summaries
    std_df = get_standardized_df(df)
    agg_counselors = std_df.groupby("Counselor Email").agg({
        "Talktime": "sum",
        "Dialled Calls": "sum",
        "Total Adm": "sum",
        "Effective Calls": "sum"
    }).reset_index()

    recommended_df = generate_coaching_recommendations(agg_counselors)
    tip_counts = recommended_df["Coaching_Tip"].value_counts()
    logger.info("  Distribution of coaching recommendation tips:")
    for tip, cnt in tip_counts.items():
        logger.info(f"    * {tip}: {cnt}")
    logger.info("  Sample recommendations (first 5 rows):")
    print(recommended_df[["Counselor Email", "Coaching_Tip"]].head(5).to_string())

    # ─────────────────────────────────────────────────────────────────────────
    # Verification 3: Revenue Forecast Engine
    # ─────────────────────────────────────────────────────────────────────────
    logger.info("\n--- VERIFICATION 3: Revenue Forecast Engine ---")
    forecast_df = forecast_admissions_and_revenue(df, sma_days=15, forecast_days=7)
    logger.info("  Calculated 15-day Simple Moving Average (SMA) of admissions and projected next 7 days:")
    print(forecast_df.to_string(index=False))

    # ─────────────────────────────────────────────────────────────────────────
    # Verification 4: Counselor Comparison Tool
    # ─────────────────────────────────────────────────────────────────────────
    logger.info("\n--- VERIFICATION 4: Side-by-Side Counselor Comparison ---")
    active_counselors = std_df["Counselor Email"].dropna().unique()
    if len(active_counselors) >= 2:
        c1, c2 = active_counselors[0], active_counselors[1]
        logger.info(f"  Comparing: {c1} vs {c2}")
        comp_df = compare_counsellors(c1, c2, df)
        print(comp_df.to_string(index=False))
    else:
        logger.warning("  Not enough active counselors to run side-by-side comparison verification.")

    logger.info("\n=========================================================")
    logger.info("🎉  All 4 dashboard intelligence features smoke tested successfully!  🎉")
    logger.info("=========================================================")
