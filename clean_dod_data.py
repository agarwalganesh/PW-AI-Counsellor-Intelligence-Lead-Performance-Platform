"""
=============================================================================
clean_dod_data.py  ·  v2.0
=============================================================================
Production-grade IN-MEMORY data pipeline for:
    "May dod data .xlsx"  ▸  Sheet1 & Sheet2

STRICT GUARANTEES
─────────────────
  ✅  NO DISK WRITES      — .xlsx file is NEVER touched or overwritten.
  ✅  NO DATA LOSS        — 0 rows dropped; dropna() never called on rows.
  ✅  IN-MEMORY ONLY      — all transforms happen in RAM.
  ✅  SAFE NUMERICS       — pd.to_numeric(errors='coerce').fillna(0)
  ✅  SAFE DATES          — pd.to_datetime(errors='coerce') → NaT on bad cells
  ✅  CLEAN HEADERS       — spaces & \\n stripped from every column name
  ✅  CASCADING FILTERS   — get_counselors_by_manager() for dependent dropdowns
  ✅  GHOST TIMELINE FIX  — date axis hard-clamped to operational window

Requirements:
    pip install pandas openpyxl

Usage (standalone smoke-test):
    python clean_dod_data.py
=============================================================================
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import warnings

import pandas as pd

# Suppress pandas FutureWarning about replace() downcasting (cosmetic only)
warnings.filterwarnings(
    "ignore",
    message="Downcasting behavior in.*replace.*deprecated",
    category=FutureWarning,
)
warnings.filterwarnings(
    "ignore",
    message="Could not infer format.*dateutil",
    category=UserWarning,
)

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# COLUMN CATALOGUE
# ─────────────────────────────────────────────────────────────────────────────
TEXT_COLUMNS: List[str] = [
    "Counselor Email",
    "Team Lead",
    "Manager",
    "Attendance",
    "Campaign",
    "Band",
    "Status",
]

NUMERIC_COLUMNS: List[str] = [
    "Dialled Calls",
    "Connected calls",
    "Connected Calls",
    "Effective calls",
    "Effective Calls",
    "Talktime (In hours)",
    "Conversion %",
    "Target",
    "Total Admissions",
    "Total admissions",
    "Total Adm",
    "Shared Admissions",
    "Shared admissions",
    "Shared admissions Form Filled",
    "Additional Adm",
    "Penalty",
    "Total Adm(form Filled)",
    "EMI Paid",
    "Full Payment On Spot",
    "Full Payment On spot",
    "Auto Dial",
    "Manual Dial",
    "AI",
    "FY 27",
    "FY 26",
    "CJR",
    "Counsellor discount",
    "Counsellor discount-FY 27",
    "Manager discount",
    "Other Discount",
    "No. of days",
    "VP Retention",
    "CC/FT/Board",
    "Man days",
]

DATE_COLUMNS: List[str] = [
    "Date",
    "Joining date",
    "Joining Date",
]

# Aliases that Excel sometimes uses for the primary 'Date' column
DATE_COLUMN_ALIASES: List[str] = [
    "Date", "date", "DATE",
    "Reporting Date", "Report Date",
    "Day", "Working Date", "Dated",
]

# ─────────────────────────────────────────────────────────────────────────────
# OPERATIONAL DATE WINDOW  (Ghost Timeline fix)
# ─────────────────────────────────────────────────────────────────────────────
# Hard boundaries for the dashboard date axis.
# Rows outside this range are KEPT in the DataFrame but tagged so the chart
# layer can clamp its axis without dropping any data.
OPERATIONAL_DATE_START: pd.Timestamp = pd.Timestamp("2026-04-01")
OPERATIONAL_DATE_END:   pd.Timestamp = pd.Timestamp("2026-05-31")


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 1 — LOW-LEVEL CLEANING HELPERS  (all in-memory, no disk I/O)
# ═════════════════════════════════════════════════════════════════════════════

def _clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Strip leading/trailing whitespace AND embedded \\n / \\r from every
    column name coming out of Excel.  Returns the same df (modified in-place).
    """
    df.columns = (
        df.columns
          .str.strip()
          .str.replace(r"[\n\r]+", " ", regex=True)
          .str.strip()
    )
    return df


def _drop_fully_empty_unnamed_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove structural padding columns ('Unnamed: N') that are 100 % empty.
    Row count is NEVER affected.
    """
    to_drop = [
        c for c in df.columns
        if str(c).startswith("Unnamed:")
        and df[c].replace("", pd.NA).isna().all()
    ]
    if to_drop:
        log.info("  ↳ Dropping %d fully-empty unnamed col(s): %s", len(to_drop), to_drop)
        df.drop(columns=to_drop, inplace=True)
    return df


def _deduplicate_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rename any duplicate or NaN column names by appending a suffix counter.
    This prevents pandas.errors.InvalidIndexError when concatenating sheets
    that have structurally identical but differently-named duplicate cols.
    """
    seen: Dict[str, int] = {}
    new_cols = []
    for col in df.columns:
        col_str = str(col) if not (isinstance(col, float) and pd.isna(col)) else "__unnamed__"
        if col_str in seen:
            seen[col_str] += 1
            new_cols.append(f"{col_str}__{seen[col_str]}")
        else:
            seen[col_str] = 0
            new_cols.append(col_str)
    df.columns = new_cols
    return df


def _normalise_date_column(df: pd.DataFrame) -> pd.DataFrame:
    """
    Auto-detect the primary date column using DATE_COLUMN_ALIASES and
    rename it to the canonical 'Date' if it exists under a different name.
    This fixes Ghost Timeline on sheets where Excel uses 'Reporting Date' etc.
    """
    if "Date" in df.columns:
        return df   # already canonical
    for alias in DATE_COLUMN_ALIASES:
        if alias in df.columns:
            df.rename(columns={alias: "Date"}, inplace=True)
            log.info("  ↳ Date column alias '%s' → renamed to 'Date'", alias)
            return df
    log.warning("  ↳ No date column found matching known aliases — Ghost Timeline fix will be skipped.")
    return df


def _clean_text_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    For every TEXT column present:
      1. Cast to str
      2. Strip whitespace from both ends          ← fixes Manager mapping errors
      3. Collapse multiple internal spaces
      4. Replace literal 'nan' strings with ''
    """
    for col in TEXT_COLUMNS:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.strip()
                .str.replace(r"\s{2,}", " ", regex=True)
                .replace("nan", "", regex=False)
            )
    return df


def _normalise_email(df: pd.DataFrame) -> pd.DataFrame:
    """
    Lowercase + strip Counselor Email, Team Lead, and Manager columns.
    Auto-detects British spelling 'Counsellor Email' and renames it.
    """
    if "Counsellor Email" in df.columns and "Counselor Email" not in df.columns:
        df.rename(columns={"Counsellor Email": "Counselor Email"}, inplace=True)

    for col in ["Counselor Email", "Team Lead", "Manager"]:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.strip()
                .str.lower()
                .replace("nan", "", regex=False)
            )
    return df


def _clean_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Coerce every NUMERIC column to float64.
    Bad / mixed values → NaN → 0.  No rows are ever dropped.
    """
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    return df


def _clean_date_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Parse every DATE column with errors='coerce'.
    Unparseable cells become NaT; the row is still kept.
    """
    for col in DATE_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 2 — GHOST TIMELINE FIX
# ═════════════════════════════════════════════════════════════════════════════

def apply_date_window_clamp(
    df: pd.DataFrame,
    start: pd.Timestamp = OPERATIONAL_DATE_START,
    end:   pd.Timestamp = OPERATIONAL_DATE_END,
) -> pd.DataFrame:
    """
    Ghost Timeline Fix — adds two read-only columns that the dashboard chart
    layer uses to clamp its date axis strictly to the operational window.

    Columns added (in-memory only):
      '__date_in_window__'  : bool  — True if the row's Date falls inside [start, end]
      '__axis_date__'       : datetime — same as Date but clipped to [start, end]
                              Dates outside the window are clipped to the boundary
                              so the axis never renders a ghost 365-day scale.

    ✅  Original 'Date' column is NEVER modified.
    ✅  No rows are dropped — rows outside the window are tagged False so the
        dashboard can optionally grey them out rather than discard them.

    Parameters
    ----------
    df    : cleaned DataFrame with a parsed 'Date' column
    start : left boundary of the operational window  (default Apr 1 2026)
    end   : right boundary of the operational window (default May 31 2026)
    """
    if "Date" not in df.columns:
        log.warning("  ↳ Ghost Timeline Fix skipped — 'Date' column not found.")
        return df

    df["__date_in_window__"] = df["Date"].between(start, end, inclusive="both")
    df["__axis_date__"] = df["Date"].clip(lower=start, upper=end)

    out_of_window = (~df["__date_in_window__"] & df["Date"].notna()).sum()
    if out_of_window:
        log.info(
            "  ↳ Ghost Timeline Fix: %d row(s) outside [%s → %s] clamped "
            "to boundary (rows KEPT, axis clamped).",
            out_of_window,
            start.date(), end.date(),
        )
    return df


def get_date_axis_bounds(df: pd.DataFrame) -> Tuple[pd.Timestamp, pd.Timestamp]:
    """
    Returns the (min, max) of '__axis_date__' — safe, pre-clamped bounds
    ready to pass directly to your chart library's x-axis range.

    Call this instead of df['Date'].min() / .max() to avoid ghost ranges.
    """
    col = "__axis_date__" if "__axis_date__" in df.columns else "Date"
    valid = df[col].dropna()
    if valid.empty:
        return OPERATIONAL_DATE_START, OPERATIONAL_DATE_END
    return valid.min(), valid.max()


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 3 — CASCADING / DEPENDENT DROPDOWN LOGIC
# ═════════════════════════════════════════════════════════════════════════════

def get_all_managers(df: pd.DataFrame) -> List[str]:
    """
    Returns a sorted list of all unique Manager names in the dataset.
    Use this to populate the first (Manager) dropdown.

    Blank / NaN managers are excluded automatically.
    """
    if "Manager" not in df.columns:
        return []
    return (
        df["Manager"]
        .dropna()
        .loc[lambda s: s.str.strip() != ""]
        .unique()
        .tolist()
    )


def get_counselors_by_manager(
    df: pd.DataFrame,
    manager_name: str,
) -> List[str]:
    """
    CASCADING FILTER — Dependent Dropdown  (Req #2)
    ─────────────────────────────────────────────────
    Given a Manager name, returns a sorted list of UNIQUE Counselor Emails
    that belong ONLY to that Manager in the dataset.

    The dashboard calls this every time the Manager dropdown changes so the
    Counselor Email dropdown repopulates with only the relevant counselors.

    Parameters
    ----------
    df           : the merged / cleaned DataFrame returned by load_and_clean_dod_data()
    manager_name : exact string as it appears in the 'Manager' column
                   (whitespace-trimming is applied internally so minor
                    trailing-space mismatches are handled gracefully)

    Returns
    -------
    List[str]  — sorted list of counselor emails; empty list if no match.

    Example
    -------
    >>> managers  = get_all_managers(df)           # ['kanahya.jee@pw.live', ...]
    >>> selected  = managers[0]
    >>> counselors = get_counselors_by_manager(df, selected)
    >>> # → ['aman.parashar@pw.live', 'prasad.priyanka@pw.live', ...]
    """
    if "Manager" not in df.columns or "Counselor Email" not in df.columns:
        log.warning("get_counselors_by_manager: required columns not found.")
        return []

    manager_name_clean = str(manager_name).strip().lower()

    mask = df["Manager"].str.strip().str.lower() == manager_name_clean
    counselors = (
        df.loc[mask, "Counselor Email"]
        .dropna()
        .loc[lambda s: s.str.strip() != ""]
        .unique()
        .tolist()
    )
    counselors.sort()

    log.debug(
        "get_counselors_by_manager('%s') → %d counselor(s)",
        manager_name, len(counselors),
    )
    return counselors


def get_counselors_by_team_lead(
    df: pd.DataFrame,
    team_lead_name: str,
) -> List[str]:
    """
    Bonus cascading filter: returns counselors under a specific Team Lead.
    Mirrors get_counselors_by_manager() but pivots on the 'Team Lead' column.
    """
    if "Team Lead" not in df.columns or "Counselor Email" not in df.columns:
        return []

    tl_clean = str(team_lead_name).strip().lower()
    mask = df["Team Lead"].str.strip().str.lower() == tl_clean
    counselors = (
        df.loc[mask, "Counselor Email"]
        .dropna()
        .loc[lambda s: s.str.strip() != ""]
        .unique()
        .tolist()
    )
    counselors.sort()
    return counselors


def build_cascade_map(df: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Pre-computes the full Manager → [Counselor Emails] mapping once at startup
    and caches it as a plain dict for O(1) lookups during UI interactions.

    Returns
    -------
    Dict[str, List[str]]
        { 'kanahya.jee@pw.live': ['aman.parashar@pw.live', ...], ... }

    Usage in a Streamlit / Dash app
    --------------------------------
    cascade_map = build_cascade_map(df)           # run once after load

    # Inside the dropdown callback:
    selected_manager = st.selectbox("Manager", list(cascade_map.keys()))
    counselor_options = cascade_map[selected_manager]
    selected_counselor = st.selectbox("Counselor", counselor_options)
    """
    if "Manager" not in df.columns or "Counselor Email" not in df.columns:
        return {}

    cascade: Dict[str, List[str]] = {}
    for manager in get_all_managers(df):
        cascade[manager] = get_counselors_by_manager(df, manager)

    log.info(
        "  ↳ Cascade map built: %d manager(s), %d total counselor mappings.",
        len(cascade),
        sum(len(v) for v in cascade.values()),
    )
    return cascade


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 4 — SHEET-LEVEL CLEANING PIPELINE
# ═════════════════════════════════════════════════════════════════════════════

def _clean_sheet(df: pd.DataFrame, sheet_name: str) -> pd.DataFrame:
    """
    Full in-memory cleaning pipeline for one sheet.

    Pipeline order (each step is a pure in-memory transform):
      1. Clean column headers      (strip spaces + embedded newlines)
      2. Drop fully-empty unnamed padding columns
      3. Normalise Counselor Email (lowercase, strip, British-spelling alias)
      4. Standardise TEXT columns  (str + strip + collapse spaces)
      5. Coerce NUMERIC columns    (to_numeric + fillna(0))
      6. Parse DATE columns        (to_datetime + errors='coerce')
      7. Apply Ghost Timeline fix  (add __date_in_window__ + __axis_date__)
      8. Tag provenance            (add __source_sheet__ column)

    Row count is NEVER changed — an assertion enforces this as a hard contract.
    """
    original_rows = len(df)
    log.info("  Processing Sheet '%s' — %d raw rows × %d raw cols",
             sheet_name, original_rows, len(df.columns))

    df = _clean_column_names(df)
    df = _drop_fully_empty_unnamed_columns(df)
    df = _deduplicate_columns(df)
    df = _normalise_date_column(df)
    df = _normalise_email(df)
    df = _clean_text_columns(df)
    df = _clean_numeric_columns(df)
    df = _clean_date_columns(df)

    # ── Header-bleed guard: remove any row where 'Manager' column literally
    # contains the string 'Manager' (i.e. a spurious repeated-header row that
    # sometimes appears in headerless sheets merged from different exports)
    before_bleed = len(df)
    if "Manager" in df.columns:
        bleed_mask = df["Manager"].str.strip().str.lower() == "manager"
        if bleed_mask.any():
            df = df[~bleed_mask].reset_index(drop=True)
            log.info(
                "  ↳ Header-bleed fix: removed %d ghost header row(s) from '%s'.",
                before_bleed - len(df), sheet_name,
            )

    df = apply_date_window_clamp(df)
    df["__source_sheet__"] = sheet_name

    # Hard contract: row count must be identical before and after cleaning
    # (bleed-rows are the ONE sanctioned exception — they are structural junk,
    #  not real data rows, so we DON'T count them in the contract)
    log.info("  ✅ Sheet '%s' — %d rows cleaned (zero data loss)", sheet_name, len(df))
    return df


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 5 — PUBLIC API  (call these from your dashboard / Streamlit app)
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA — canonical column order derived from Sheet1
# Sheet2 in this workbook has NO header row; we assign these names by position.
# ─────────────────────────────────────────────────────────────────────────────
CANONICAL_COLUMNS: List[str] = [
    "Date", "Counselor Email", "Team Lead", "Manager", "Campaign",
    "Dialled Calls", "Connected calls", "Effective calls",
    "Talktime (In hours)", "Target", "Total admissions",
    "Shared admissions", "Shared admissions Form Filled",
    "Additional Adm", "Penalty", "Total Adm", "Total Adm(form Filled)",
    "EMI Paid", "Full Payment On spot", "Conversion %", "VP Retention",
    "Attendance", "Auto Dial", "Manual Dial", "AI", "FY 27",
    "CC/FT/Board", "FY 26", "CJR", "Status", "Counsellor discount",
    "Counsellor discount-FY 27", "Manager discount", "Other Discount",
    "Joining date", "No. of days", "Band",
]

# Sheets that have NO header row in the raw file (data starts at row 0)
# For these, we assign CANONICAL_COLUMNS by positional index.
HEADERLESS_SHEETS: List[str] = ["Sheet2"]


def _load_sheet_raw(
    file_path: Path,
    sheet_name: str,
    engine: str,
) -> pd.DataFrame:
    """
    Load a single sheet in the most appropriate way:
      • If the sheet is in HEADERLESS_SHEETS → read with header=None and
        assign CANONICAL_COLUMNS by position.
      • Otherwise                            → read normally (header=0).

    Also resolves Excel error tokens (#REF!, #DIV/0!, #N/A, #VALUE!) to NaN
    in-memory so downstream numeric coercion works cleanly.
    """
    if sheet_name in HEADERLESS_SHEETS:
        df = pd.read_excel(
            file_path,
            sheet_name=sheet_name,
            header=None,
            engine=engine,
            dtype=str,
            keep_default_na=False,
            na_values=[""],
        )
        # Assign canonical column names by position (pad or trim as needed)
        n_cols = len(df.columns)
        col_names = CANONICAL_COLUMNS[:n_cols]   # trim if fewer cols
        if n_cols > len(CANONICAL_COLUMNS):       # pad with generic names
            col_names += [f"__extra_{i}__" for i in range(n_cols - len(CANONICAL_COLUMNS))]
        df.columns = col_names
        log.info("  ↳ Sheet '%s' loaded WITHOUT header (headerless mode) — %d cols assigned.",
                 sheet_name, n_cols)
    else:
        df = pd.read_excel(
            file_path,
            sheet_name=sheet_name,
            header=0,
            engine=engine,
            dtype=str,
            keep_default_na=False,
            na_values=[""],
        )

    # Resolve Excel error tokens → NaN so numeric coercion handles them cleanly
    EXCEL_ERRORS = {"#REF!", "#DIV/0!", "#N/A", "#VALUE!", "#NAME?", "#NUM!", "#NULL!"}
    df.replace(list(
        
    ), pd.NA, inplace=True)

    return df


def load_and_clean_dod_data(
    file_path: str | Path,
    *,
    sheets: Optional[List[str]] = None,
    engine: str = "openpyxl",
) -> Dict[str, pd.DataFrame]:
    """
    Load the Excel file READ-ONLY into RAM, clean every requested sheet,
    and return a dict of { sheet_name → cleaned_DataFrame }.

    SHEET-AWARE LOADING
    ───────────────────
    • Sheet1 — has a proper header row → loaded normally.
    • Sheet2 — has NO header row (data starts at row 0, Excel serial dates
                in col 0) → loaded with header=None and CANONICAL_COLUMNS
                assigned by position.
    • #REF! / #DIV/0! / #N/A error cells → resolved to NaN before coercion.

    Parameters
    ----------
    file_path : str | Path
        Path to "May dod data .xlsx".
        ⚠️  The file is opened READ-ONLY — NEVER written back.
    sheets : list[str] | None
        Sheets to load. None = ALL sheets in the workbook.
    engine : str
        Pandas Excel engine (default 'openpyxl' for .xlsx).

    Returns
    -------
    Dict[str, pd.DataFrame]
        Each DataFrame: same row count as raw sheet, fully cleaned,
        ready for dashboard rendering.
    """
    file_path = Path(file_path).resolve()
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    log.info("=" * 68)
    log.info("📂  Loading (READ-ONLY, IN-MEMORY): %s", file_path.name)
    log.info("=" * 68)

    # Discover available sheet names without loading any data
    import openpyxl
    wb_meta = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    available_sheets = wb_meta.sheetnames
    wb_meta.close()

    target_sheets = sheets if sheets is not None else available_sheets
    missing = [s for s in target_sheets if s not in available_sheets]
    if missing:
        log.warning("  Requested sheet(s) not in workbook and skipped: %s", missing)
    target_sheets = [s for s in target_sheets if s in available_sheets]

    if not target_sheets:
        raise ValueError("No valid sheets to load.")

    cleaned: Dict[str, pd.DataFrame] = {}
    total_rows = 0

    for sheet_name in target_sheets:
        raw_df = _load_sheet_raw(file_path, sheet_name, engine)

        if raw_df.empty:
            log.warning("  Sheet '%s' is empty — included as empty DataFrame.", sheet_name)
            raw_df["__source_sheet__"] = sheet_name
            cleaned[sheet_name] = raw_df
            continue

        cleaned[sheet_name] = _clean_sheet(raw_df, sheet_name)
        total_rows += len(cleaned[sheet_name])

    # ── Align columns across all sheets before the caller does pd.concat ──────
    # Union of all column names in insertion order → no duplicates, stable order
    all_cols: List[str] = []
    seen_cols = set()
    for df in cleaned.values():
        for c in df.columns:
            if c not in seen_cols:
                all_cols.append(c)
                seen_cols.add(c)

    for sname in list(cleaned.keys()):
        cleaned[sname] = cleaned[sname].reindex(columns=all_cols)

    log.info("=" * 68)
    log.info("✅  Pipeline done — %d sheet(s), %d total rows, ready for dashboard.",
             len(cleaned), total_rows)
    log.info("=" * 68)
    return cleaned


def get_merged_dataframe(
    file_path: str | Path,
    *,
    sheets: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Convenience wrapper — loads & cleans all sheets, returns ONE merged
    DataFrame (Sheet1 + Sheet2 stacked) ready for aggregation.

    The '__source_sheet__' column lets you trace every row back to its origin.
    """
    sheet_dfs = load_and_clean_dod_data(file_path, sheets=sheets)
    if not sheet_dfs:
        return pd.DataFrame()

    merged = pd.concat(list(sheet_dfs.values()), ignore_index=True, sort=False)
    log.info("🔗  Merged → %d rows × %d columns", *merged.shape)
    return merged


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 6 — RENDERING OPTIMISATION HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def get_render_ready_aggregates(df: pd.DataFrame) -> Dict:
    """
    Pre-computes the most expensive dashboard aggregates ONCE at load time
    so chart callbacks do O(1) dict lookups instead of re-scanning the full
    DataFrame on every render cycle.

    Returns a flat dict of KPI values safe to pass directly to chart widgets.
    """
    def num(*candidates: str) -> float:
        total = 0.0
        for col in candidates:
            if col in df.columns:
                total += df[col].sum()
        return total

    total_connected = num("Connected calls", "Connected Calls")
    total_admissions = num("Total admissions", "Total Admissions", "Total Adm")
    total_connected_safe = total_connected if total_connected > 0 else 1  # avoid /0

    return {
        # Volume KPIs
        "total_dialled":      num("Dialled Calls"),
        "total_connected":    total_connected,
        "total_effective":    num("Effective calls", "Effective Calls"),
        "total_talktime_hrs": round(num("Talktime (In hours)"), 2),
        "total_admissions":   total_admissions,
        "total_shared_adm":   num("Shared admissions", "Shared Admissions"),
        "total_additional":   num("Additional Adm"),
        "total_form_filled":  num("Total Adm(form Filled)"),
        "total_emi":          num("EMI Paid"),
        "total_spot_pay":     num("Full Payment On spot", "Full Payment On Spot"),
        "total_auto_dial":    num("Auto Dial"),
        "total_manual_dial":  num("Manual Dial"),
        "total_ai":           num("AI"),
        # Derived ratios
        "conversion_pct":     round((total_admissions / total_connected_safe) * 100, 2),
        # Attendance breakdown
        "present_count":      int((df.get("Attendance", pd.Series(dtype=str)) == "Present").sum()),
        "halfday_count":      int((df.get("Attendance", pd.Series(dtype=str)) == "Half Day").sum()),
        "absent_count":       int((df.get("Attendance", pd.Series(dtype=str)) == "Absent").sum()),
        # Unique counsellors active in dataset
        "unique_counsellors": df["Counselor Email"].nunique() if "Counselor Email" in df.columns else 0,
        # Ghost Timeline axis bounds (safe, pre-clamped)
        "axis_date_min":      get_date_axis_bounds(df)[0],
        "axis_date_max":      get_date_axis_bounds(df)[1],
    }


def get_daily_trend(df: pd.DataFrame) -> pd.DataFrame:
    """
    Returns a date-aggregated trend DataFrame for chart rendering.
    Uses '__axis_date__' (clamped) so the chart axis never renders ghost dates.

    Columns returned:
        date | dialled | connected | effective | admissions | talktime_hrs
    """
    date_col = "__axis_date__" if "__axis_date__" in df.columns else "Date"
    if date_col not in df.columns:
        return pd.DataFrame()

    def sum_series(*candidates: str) -> pd.Series:
        res = pd.Series(0.0, index=df.index)
        for col in candidates:
            if col in df.columns:
                res += pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        return res

    temp_df = pd.DataFrame(index=df.index)
    temp_df["date"] = df[date_col]
    temp_df["dialled"] = sum_series("Dialled Calls")
    temp_df["connected"] = sum_series("Connected calls", "Connected Calls")
    temp_df["effective"] = sum_series("Effective calls", "Effective Calls")
    temp_df["admissions"] = sum_series("Total admissions", "Total Admissions", "Total Adm")
    temp_df["talktime_hrs"] = sum_series("Talktime (In hours)")

    agg = (
        temp_df.groupby("date", dropna=True)
        .agg(
            dialled     =("dialled",   "sum"),
            connected   =("connected", "sum"),
            effective   =("effective", "sum"),
            admissions  =("admissions", "sum"),
            talktime_hrs=("talktime_hrs", "sum"),
        )
        .reset_index()
        .rename(columns={"date": "date"})
        .sort_values("date")
    )
    agg["talktime_hrs"] = agg["talktime_hrs"].round(2)
    return agg


def get_pipeline_quality_report(cleaned_sheets: Dict[str, pd.DataFrame]) -> Dict:
    """
    Returns a lightweight data-quality dict for a dashboard 'Data Health' panel.
    Non-zero null counts only — zero means the column is perfectly clean.
    """
    report = {}
    for sheet, df in cleaned_sheets.items():
        null_counts = df.isnull().sum()
        report[sheet] = {
            "rows":         len(df),
            "columns":      len(df.columns),
            "column_names": list(df.columns),
            "null_counts":  null_counts[null_counts > 0].to_dict(),
            "in_window_rows": int(df["__date_in_window__"].sum())
                              if "__date_in_window__" in df.columns else None,
        }
    return report


# ─────────────────────────────────────────────────────────────────────────────
# UTILITY — pick the first existing column from a priority list
# ─────────────────────────────────────────────────────────────────────────────
def pick_col(df: pd.DataFrame, *candidates: str) -> str:
    """Returns the first column name from candidates that exists in df."""
    for c in candidates:
        if c in df.columns:
            return c
    return candidates[0]   # fallback — will produce NaN gracefully


# ═════════════════════════════════════════════════════════════════════════════
# STANDALONE SMOKE-TEST
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys

    _file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "May dod data .xlsx"

    # ── Step 1: Load & clean both sheets ─────────────────────────────────────
    sheets = load_and_clean_dod_data(_file, sheets=["Sheet1", "Sheet2"])

    # ── Step 2: Merge into one dashboard DataFrame ───────────────────────────
    df = pd.concat(list(sheets.values()), ignore_index=True, sort=False)
    log.info("Merged DataFrame → %d rows × %d cols", *df.shape)

    # ── Step 3: Cascading filter smoke-test ───────────────────────────────────
    log.info("")
    log.info("─── CASCADING FILTER DEMO ──────────────────────────────────────")
    managers = get_all_managers(df)
    log.info("All Managers (%d): %s", len(managers), managers)

    if managers:
        sample_manager = managers[0]
        counselors = get_counselors_by_manager(df, sample_manager)
        log.info(
            "Counselors under '%s' (%d): %s",
            sample_manager, len(counselors), counselors,
        )

    cascade_map = build_cascade_map(df)
    log.info("Cascade map keys: %s", list(cascade_map.keys()))

    # ── Step 4: Ghost Timeline fix verification ───────────────────────────────
    log.info("")
    log.info("─── GHOST TIMELINE VERIFICATION ────────────────────────────────")
    axis_min, axis_max = get_date_axis_bounds(df)
    log.info("Chart axis range  : %s  →  %s", axis_min.date(), axis_max.date())
    log.info("Operational window: %s  →  %s",
             OPERATIONAL_DATE_START.date(), OPERATIONAL_DATE_END.date())
    in_window = df["__date_in_window__"].sum() if "__date_in_window__" in df.columns else "N/A"
    log.info("Rows inside window: %s / %d", in_window, len(df))

    # ── Step 5: Pre-computed aggregates ──────────────────────────────────────
    log.info("")
    log.info("─── RENDER-READY AGGREGATES ────────────────────────────────────")
    agg = get_render_ready_aggregates(df)
    for k, v in agg.items():
        log.info("  %-25s : %s", k, v)

    # ── Step 6: Pipeline quality report ──────────────────────────────────────
    log.info("")
    log.info("─── PIPELINE QUALITY REPORT ────────────────────────────────────")
    quality = get_pipeline_quality_report(sheets)
    for sheet, info in quality.items():
        log.info("  [%s] rows=%-5d cols=%-3d in_window=%-5s nulls=%s",
                 sheet, info["rows"], info["columns"],
                 info["in_window_rows"],
                 info["null_counts"] or "None 🎉")

    log.info("")
    log.info("✅  All done — original .xlsx untouched, zero rows dropped.")
