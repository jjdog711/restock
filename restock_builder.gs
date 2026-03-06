/**
 * ============================================================================
 * STATE OF MIND - VAULT RESTOCK SYSTEM BUILDER
 * ============================================================================
 * 
 * This Google Apps Script builds the complete Vault Restock System.
 * Run the main() function once to create all tabs, formulas, and formatting.
 * 
 * After running:
 * 1. Go to "Treez Valuation (Raw)" tab
 * 2. Import your Treez Inventory Valuation CSV starting at cell A6
 * 3. Run "Restock -> Run Daily Update" to refresh checklist and compliance output
 * 
 * Version: 2.2 SHIP READINESS
 * Last Updated: 2026-03-06
 * 
 * v2.2 CHANGES (March 6, 2026):
 * - Finalized user-facing tab naming model:
 *   Home, Start Here, Restock List, Backstock Alerts, Compliance Alerts, Compliance History, Data Watchlist
 * - Added post-run routing behavior:
 *   open Compliance Alerts when issues exist, otherwise open Restock List
 * - Hardened profile/location/performance diagnostics flow for Albany + Latham operations
 * - Cleaned user-facing copy and fixed encoding artifacts
 * 
 * v1.7 CHANGES (December 18, 2025):
 * - Renamed checklist columns for compact display: Pick Shelf Qty -> Flr, Reserve Qty -> Bck, Units Pulled -> Pull, Barcode Match -> BC Match
 * - Optimized column widths for portrait printing
 * - Hidden Oldest Backstock Date column by default
 * 
 * v1.6 CHANGES (December 18, 2025):
 * - Updated treezColumns array for new Treez export format (NY METRC)
 * - New columns added: Harvest Batch, Production Batch #, Cbga Lab Result, Delta-9 Thc Lab Result
 * - Column names changed: Ext Batch ID -> State Tracking ID, Treez Batch -> Batch
 * - Updated treezColIndex: inventoryBarcodes=35, size=44, externalId=46, inventoryType=47
 * - Fixed all formula column references (AT, AU, AR, AI)
 * 
 * DYNAMIC ROWS: Checklist shows exactly the rows needed (run refreshChecklist after import)
 * URGENCY: "1 - Critical", "2 - Soon", "3 - Low" - sorts correctly alphabetically
 * VISUAL: Full grid borders, zebra striping, proper column alignment
 * 
 * ENABLED FEATURES:
 * - Filter Treez data for ADULT, Available > 0, valid product types
 * - Location role lookup (PICK SHELF / RESERVE / IGNORE)
 * - Unique product aggregation by External ID
 * - Pick Shelf Qty / Reserve Qty calculation
 * - Only show products with Reserve > 0 (must have backstock to pull)
 * - First Pull From: Shows actual reserve location + qty
 * - Then Pull From: Shows second reserve location (if exists)
 * - Barcode Match QC: Checks for multiple barcodes (OK / CHECK)
 * - Oldest Reserve Date: FIFO guidance
 * - Urgency coloring (Critical/Soon/Low)
 * - Target displays as unlimited (no specific target set)
 * 
 * STILL DISABLED (for future versions):
 * - Rule matching (using hardcoded defaults)
 * - Pack Style detection (always "Single")
 * 
 * DEFAULT THRESHOLDS (per business rule):
 * - Threshold: 7 (add to list when 6 or fewer on shelf)
 * - Warning (amber): 4 or fewer
 * - Critical (red): 2 or fewer
 * - Recommended Pull: 99 or available reserve (whichever is less)
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const CONFIG = {
  // Tab names in display order
  tabs: [
    'Home',
    'Start Here',
    'Treez Valuation (Raw)',
    'Restock Settings',
    'Restock Engine (Internal)',
    'Restock List',
    'Backstock Alerts',
    'Data Watchlist',
    'System_Reference',
    'System_Diagnostics',
    'AI_Diagnostics',
    'Compliance Config',
    'Compliance Alerts',
    'Compliance History'
  ],
  
  // Colors
  colors: {
    critical: '#f4cccc',      // Soft red
    soon: '#fff2cc',          // Soft amber
    low: '#d9ead3',           // Soft green
    header: '#f3f3f3',        // Light grey for headers
    headerText: '#000000',    // Black header text
    doneText: '#999999',      // Grey for done rows
    border: '#b7b7b7',        // Border color
    instructionBg: '#e8f0fe', // Light blue for instruction areas
    settingsHeader: '#d9ead3', // Green for settings section headers
    complianceFlag: '#fde9d9' // Light salmon for compliance issues
  },
  
  // Raw data configuration
  rawDataStartRow: 6,
  
  // Treez column headers (exact match to export - updated December 2025)
  // Note: Treez changed column names and added new columns in late 2025
  treezColumns: [
    'Date of Inventory Valuation', 'Time of Inventory Valuation', 
    'Date Inventory Received', 'Time Inventory Received',
    'Invoice ID', 'Invoice Line #', 'State Tracking ID', 'Batch',  // Changed from 'Ext Batch ID', 'Treez Batch'
    'Receiving License', 'Product Type', 'Subtype', 'Brand', 
    'Product Name', 'Classification', 'Tier', 'Available',
    'Reserved', 'Packed & Ready', 'Unit Cost', 'Amount',
    'Unit of Measure', 'Total Cost', 'Unit Price', 'Potential Gross Sales',
    'Location', 'Date Last Received', 'Time Last Received', 'Packaged Date',
    'External Invoice ID', 'Manifest #', 'Harvest Batch', 'Production Batch #',  // NEW columns
    'Attributes', 'Product Barcodes', 'Inventory Barcodes', 'Distributor',  // Shifted +2
    'Distributor License', 'Harvest Date', 'Manufacture Date', 'Expiration Date',
    'Lab Testing State', 'Total Mg THC', 'Total Mg CBD', 'Size',  // Shifted +2
    'Extraction Method', 'External ID', 'Inventory Type',  // Shifted +2
    'Cbc Lab Result', 'Cbd Lab Result', 'Cbdv Lab Result', 'Cbg Lab Result',
    'Cbga Lab Result', 'Cbn Lab Result', 'Delta-9 Thc Lab Result',  // NEW lab columns
    'Thc Lab Result', 'Thca Lab Result', 'Thcv Lab Result',
    'Total Cannabinoids Lab Result', 'Total Terpenes Lab Result'
  ],
  
  // Key Treez column indices (1-based for Sheets formulas)
  // Updated December 2025 for new Treez export format (+4 new columns)
  treezColIndex: {
    dateValuation: 1,
    timeValuation: 2,
    dateReceived: 3,
    receivingLicense: 9,
    productType: 10,
    subtype: 11,
    brand: 12,
    productName: 13,
    classification: 14,
    available: 16,
    location: 25,
    inventoryBarcodes: 35,  // Was 33, shifted +2 (Harvest Batch, Production Batch # added)
    size: 44,              // Was 42, shifted +2
    externalId: 46,        // Was 44, shifted +2
    inventoryType: 47      // Was 45, shifted +2
  },
  
  // Allowed product types (cannabis only, excludes MERCH)
  allowedProductTypes: [
    'FLOWER', 'PREROLL', 'CARTRIDGE', 'EDIBLE', 'EXTRACT',
    'BEVERAGE', 'TINCTURE', 'TOPICAL', 'PILL'
  ],
  
  // Checklist columns
  checklistColumns: [
    'Urgency', 'Brand', 'Product', 'Type', 'Size / Strength', 'Classification',
    'Flr', 'Bck', 'Target Pick Qty', 'Recommended Pull Qty',
    'First Pull From', 'Then Pull From', 'Pull', 'Restock Status',
    'Done', 'Notes', 'BC Match', 'Oldest Backstock Date'
  ],
  
  // Restock status dropdown options
  restockStatusOptions: ['To Pull', 'Pulled', 'Partial', 'No Backstock', "Can't Find"],
  
  // Location role options
  locationRoleOptions: ['PICK SHELF', 'RESERVE', 'IGNORE'],
  
  // Pack style options
  packStyleOptions: ['Single', 'Pack', 'Any'],

  // Checklist sort/view modes
  checklistSortModes: ['PRIORITY', 'LOCATION_WAVE'],

  // Workspace visibility modes
  workspaceModes: ['STANDARD', 'MANAGER']
};

const TAB_NAME_UPDATES = {
  'Daily Home': 'Home',
  'Instructions': 'Start Here',
  'Restock Checklist': 'Restock List',
  'No_Reserve_Risk': 'Backstock Alerts',
  'Data Exceptions': 'Data Watchlist',
  'Missing_Compliance': 'Compliance Alerts',
  'Compliance Log': 'Compliance History'
};

const TAB_NAME_LEGACY = {
  'Home': ['Daily Home'],
  'Start Here': ['Instructions'],
  'Restock List': ['Restock Checklist'],
  'Backstock Alerts': ['No_Reserve_Risk'],
  'Data Watchlist': ['Data Exceptions'],
  'Compliance Alerts': ['Missing_Compliance'],
  'Compliance History': ['Compliance Log']
};

function preferredTabName_(name) {
  return TAB_NAME_UPDATES[String(name || '').trim()] || String(name || '').trim();
}

function getSheetByCompatName_(ss, name) {
  const preferred = preferredTabName_(name);
  let sheet = ss.getSheetByName(preferred);
  if (sheet) return sheet;

  const legacy = TAB_NAME_LEGACY[preferred] || [];
  for (let i = 0; i < legacy.length; i++) {
    sheet = ss.getSheetByName(legacy[i]);
    if (sheet) return sheet;
  }
  if (preferred !== name) {
    return ss.getSheetByName(name);
  }
  return null;
}

function ensureSheetByCompatName_(ss, name, insertIndex) {
  const preferred = preferredTabName_(name);
  const existingPreferred = ss.getSheetByName(preferred);
  if (existingPreferred) return existingPreferred;

  const legacy = TAB_NAME_LEGACY[preferred] || [];
  for (let i = 0; i < legacy.length; i++) {
    const sheet = ss.getSheetByName(legacy[i]);
    if (!sheet) continue;
    if (!ss.getSheetByName(preferred)) {
      sheet.setName(preferred);
      return sheet;
    }
    return sheet;
  }

  if (typeof insertIndex === 'number') {
    return ss.insertSheet(preferred, insertIndex);
  }
  return ss.insertSheet(preferred);
}

function migrateLegacyTabNames_(ss) {
  const legacyKeys = Object.keys(TAB_NAME_UPDATES);
  for (let i = 0; i < legacyKeys.length; i++) {
    const legacy = legacyKeys[i];
    const preferred = TAB_NAME_UPDATES[legacy];
    const preferredSheet = ss.getSheetByName(preferred);
    const legacySheet = ss.getSheetByName(legacy);
    if (!preferredSheet && legacySheet) {
      legacySheet.setName(preferred);
    }
  }
}

const CHECKLIST_SCHEMA_CONTRACT = [
  { key: 'date_received', index: 3, aliases: ['Date Inventory Received', 'Date Received'] },
  { key: 'product_type', index: 10, aliases: ['Product Type', 'Type'] },
  { key: 'subtype', index: 11, aliases: ['Subtype'] },
  { key: 'brand', index: 12, aliases: ['Brand', 'Vendor'] },
  { key: 'product_name', index: 13, aliases: ['Product Name', 'Product'] },
  { key: 'classification', index: 14, aliases: ['Classification'] },
  { key: 'available', index: 16, aliases: ['Available', 'Qty On Hand', 'On Hand'] },
  { key: 'location', index: 25, aliases: ['Location', 'Storage Location', 'Current Location'] },
  { key: 'inventory_barcodes', index: 35, aliases: ['Inventory Barcodes', 'Barcodes'] },
  { key: 'size', index: 44, aliases: ['Size', 'Size / Strength'] },
  { key: 'external_id', index: 46, aliases: ['External ID', 'SKU', 'Item ID'] },
  { key: 'inventory_type', index: 47, aliases: ['Inventory Type', 'Type of Inventory'] }
];

// ============================================================================
// LOCATION ROLES SEED DATA
// ============================================================================

const LOCATION_ROLES_DATA = [
  // PICK SHELF
  ['SALES FLOOR', 'PICK SHELF', true, 'Active vault pick shelf (only pick shelf in v1)'],
  
  // RESERVE - Standard Bins
  ['BIN 1', 'RESERVE', true, 'Numbered vault bins'],
  ['BIN 2', 'RESERVE', true, ''],
  ['BIN 3', 'RESERVE', true, ''],
  ['BIN 4', 'RESERVE', true, ''],
  ['BIN A', 'RESERVE', true, 'Lettered vault bins'],
  ['BIN B', 'RESERVE', true, ''],
  ['BIN C', 'RESERVE', true, ''],
  ['BIN D', 'RESERVE', true, ''],
  ['BIN E', 'RESERVE', true, ''],
  ['BIN F', 'RESERVE', true, ''],
  ['BIN FERNWAY', 'RESERVE', true, 'Brand-specific bin'],
  
  // RESERVE - Back Bins & Shelves
  ['BACK BIN 1', 'RESERVE', true, 'Back-of-vault bins'],
  ['BACK BIN 2', 'RESERVE', true, ''],
  ['BACK BIN 3', 'RESERVE', true, ''],
  ['04BACK BIN 1', 'RESERVE', true, 'Data quality note: has 04 prefix in Treez'],
  ['BACK SHELF 1', 'RESERVE', true, 'Back-of-vault shelving'],
  ['BACK SHELF 2', 'RESERVE', true, ''],
  ['BACK SHELF 3', 'RESERVE', true, ''],
  ['BACK SHELF 4', 'RESERVE', true, ''],
  ['BACK SHELF 5', 'RESERVE', true, ''],
  
  // RESERVE - Upper Bins
  ['UPPER BIN 1', 'RESERVE', true, 'Upper storage area'],
  ['UPPER BIN 2', 'RESERVE', true, ''],
  ['UPPER BIN 3', 'RESERVE', true, ''],
  ['UPPER BIN 4', 'RESERVE', true, ''],
  ['UPPER BIN 5', 'RESERVE', true, ''],
  ['UPPER BIN 6', 'RESERVE', true, ''],
  ['UPPER BIN 7', 'RESERVE', true, ''],
  ['UPPER BIN 8', 'RESERVE', true, ''],
  ['UPPER BIN 9', 'RESERVE', true, ''],
  
  // RESERVE - Shelves
  ['SHELF A', 'RESERVE', true, 'Lettered shelves (backstock)'],
  ['SHELF B', 'RESERVE', true, ''],
  ['SHELF C', 'RESERVE', true, ''],
  ['SHELF D', 'RESERVE', true, ''],
  ['SHELF E', 'RESERVE', true, ''],
  ['TALL SHELF 1', 'RESERVE', true, 'Tall shelving units (backstock)'],
  ['TALL SHELF 2', 'RESERVE', true, ''],
  ['TALL SHELF 3', 'RESERVE', true, ''],
  ['TALL SHELF 4', 'RESERVE', true, ''],
  ['TALL SHELF 5', 'RESERVE', true, ''],
  ['TALL SHELF 6', 'RESERVE', true, ''],
  ['TALL SHELF 7', 'RESERVE', true, ''],
  
  // RESERVE - Fridge
  ['FRIDGE BIN 1', 'RESERVE', true, 'Refrigerated storage (beverages, perishables)'],
  ['FRIDGE BIN 2', 'RESERVE', true, ''],
  
  // IGNORE - Problem/Staging/Special
  ['QUARANTINE', 'IGNORE', false, 'Hold area; not for restocking'],
  ['POS RETURN', 'IGNORE', false, 'Returns area'],
  ['UNSELLABLE INVENTORY', 'IGNORE', false, 'Damaged/unsellable'],
  ['FIND ME', 'IGNORE', false, 'Problem inventory needing resolution'],
  ['PROCESSING BACKSTOCK', 'IGNORE', false, 'Staging area; not yet in sellable inventory'],
  ['DISPLAYS', 'IGNORE', false, 'Display units; not active inventory'],
  ['HELD', 'IGNORE', false, 'Always ignored in v1']
];

// ============================================================================
// STOCKING RULES SEED DATA
// ============================================================================

// Stocking Rules: 20 blank slots for custom rules + 1 default rule
// Columns: [Rule Name, Brand, Product Type, Size, Name Contains, Target, Warning, Critical, Active]
// - Brand: Exact match (case-insensitive), leave blank to match all
// - Product Type: Exact match, leave blank to match all
// - Size: Contains match (e.g., "28 G" matches "28 G" or "28 G - 5 PACK")
// - Name Contains: Case-insensitive contains (e.g., "5 PACK" matches any product with "5 pack" in name)
// - Rules are matched by SPECIFICITY: more criteria filled = higher priority
const STOCKING_RULES_DATA = [
  // 20 blank rule slots for managers to fill in
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  ['', '', '', '', '', '', '', '', false],
  // DEFAULT RULE: Catch-all for anything not matched above
  ['Default - All Products', '', '', '', '', 7, 4, 2, true]
];

// ============================================================================
// COMPLIANCE AUDIT DEFAULTS
// ============================================================================

const COMPLIANCE_DEFAULTS = {
  configSheetName: 'Compliance Config',
  outputSheetName: 'Compliance Alerts',
  logSheetName: 'Compliance History',
  rawSheetName: 'Treez Valuation (Raw)',
  headerRow: 6,
  dataStartRow: 7,
  processedLogicMode: 'EITHER', // STATUS | LOCATION | EITHER
  requireQtyGtZero: true,
  productTypeScope: 'CANNABIS_ONLY', // ALL | CANNABIS_ONLY
  canonicalFields: [
    'product_name',
    'brand_vendor',
    'sku_item_id',
    'batch_lot',
    'status',
    'location',
    'qty_on_hand',
    'product_type',
    'expiration',
    'thc'
  ],
  aliases: {
    product_name: ['Product Name', 'Product', 'Item Name', 'Name'],
    brand_vendor: ['Brand', 'Vendor', 'Brand/Vendor', 'Manufacturer', 'Distributor'],
    sku_item_id: ['External ID', 'SKU', 'Item ID', 'State Tracking ID', 'Inventory ID'],
    batch_lot: ['Batch', 'Lot', 'Batch/Lot', 'Production Batch #', 'Harvest Batch'],
    status: ['Status', 'Inventory Status', 'Item Status'],
    location: ['Location', 'Storage Location', 'Current Location'],
    qty_on_hand: ['Available', 'Qty On Hand', 'On Hand', 'Quantity', 'Inventory Quantity'],
    product_type: ['Product Type', 'Type', 'Category'],
    expiration: ['Expiration Date', 'Expiry Date', 'Exp Date', 'Expires On'],
    thc: [
      'Total Mg THC',
      'Thc Lab Result',
      'Delta-9 Thc Lab Result',
      'Total THC',
      'THC %',
      'THC (mg)',
      'Potency'
    ]
  },
  processedStatusAllowlist: ['Processed', 'Active', 'Available', 'Sellable'],
  excludedLocations: [
    'BIN RECEIVING',
    'POS RETURN',
    'SAMPLES',
    'QUARANTINE',
    'DAMAGED',
    'INTAKE',
    'PROCESSING BACKSTOCK',
    'UNSELLABLE INVENTORY',
    'HELD',
    'FIND ME'
  ],
  cannabisProductTypes: [
    'FLOWER',
    'PREROLL',
    'CARTRIDGE',
    'EDIBLE',
    'EXTRACT',
    'BEVERAGE',
    'TINCTURE',
    'TOPICAL',
    'PILL'
  ],
  missingTokens: ['', 'N/A', 'NA', 'NULL', 'NONE', '-', '0', '0.0', '0%', '0 MG']
};

// ============================================================================
// STORE PROFILES + SYSTEM REFERENCE
// ============================================================================

const SYSTEM_REFERENCE = {
  sheetName: 'System_Reference',
  settingsLocationCapacity: 220,
  storeProfilesHeaders: [
    'profile_id',
    'store_name',
    'receiving_license_match',
    'is_default',
    'auto_run_enabled',
    'profile_override'
  ],
  locationProfileHeaders: [
    'profile_id',
    'location_name',
    'role',
    'include_in_engine',
    'notes'
  ],
  locationReviewHeaders: [
    'run_ts',
    'profile_id',
    'location_name',
    'suggested_role',
    'status',
    'first_seen_ts',
    'seen_count',
    'last_seen_ts'
  ],
  storeProfilesRows: [
    ['ALBANY', 'Albany', 'OCM-RETL-26-000470-D1', true, true, false],
    ['LATHAM', 'Latham', 'OCM-CAURD-24-000178-D1', false, true, false]
  ],
  props: {
    lastImportSignature: 'RESTOCK_LAST_IMPORT_SIGNATURE',
    lastImportRunTs: 'RESTOCK_LAST_IMPORT_RUN_TS',
    activeProfile: 'RESTOCK_ACTIVE_PROFILE',
    complianceHighlightRows: 'RESTOCK_COMPLIANCE_HIGHLIGHT_ROWS',
    complianceHighlightHash: 'RESTOCK_COMPLIANCE_HIGHLIGHT_HASH',
    complianceSnapshotHash: 'RESTOCK_COMPLIANCE_SNAPSHOT_HASH',
    lastChecklistRows: 'RESTOCK_LAST_CHECKLIST_ROWS',
    lastChecklistRawSignature: 'RESTOCK_LAST_CHECKLIST_RAW_SIGNATURE',
    lastChecklistRulesSignature: 'RESTOCK_LAST_CHECKLIST_RULES_SIGNATURE',
    uiMode: 'RESTOCK_UI_MODE',
    runInProgress: 'RESTOCK_RUN_IN_PROGRESS',
    lastSuccessSignature: 'RESTOCK_LAST_SUCCESS_SIGNATURE',
    lastRunId: 'RESTOCK_LAST_RUN_ID',
    lastRunOutcome: 'RESTOCK_LAST_RUN_OUTCOME',
    lastRunDurationMs: 'RESTOCK_LAST_RUN_DURATION_MS',
    profileCacheSignature: 'RESTOCK_PROFILE_CACHE_SIGNATURE',
    profileCacheProfileId: 'RESTOCK_PROFILE_CACHE_PROFILE_ID',
    lastSchemaStatus: 'RESTOCK_LAST_SCHEMA_STATUS',
    lastConfigStatus: 'RESTOCK_LAST_CONFIG_STATUS'
  },
  ignoreSuggestRegex: /RETURN|QUARANTINE|UNSELLABLE|DAMAGED|RECEIVING|SAMPLE|HOLD|HELD|PROCESSING|DISPLAY|FIND\s*ME|FRONT OF HOUSE/i
};

const RUN_OUTCOMES = {
  success: 'SUCCESS',
  blockedSchema: 'BLOCKED_SCHEMA',
  blockedPreflight: 'BLOCKED_PREFLIGHT',
  skippedLocked: 'SKIPPED_LOCKED',
  skippedDuplicate: 'SKIPPED_DUPLICATE',
  failedChecklist: 'FAILED_STAGE_CHECKLIST',
  failedCompliance: 'FAILED_STAGE_COMPLIANCE',
  failedException: 'FAILED_EXCEPTION'
};

const DIAGNOSTICS = {
  sheetName: 'System_Diagnostics',
  runJournalHeaders: [
    'run_id',
    'started_at',
    'ended_at',
    'duration_ms',
    'source',
    'profile_id',
    'signature',
    'outcome',
    'error_code',
    'warning_count',
    'checklist_rows',
    'no_reserve_rows',
    'compliance_flagged'
  ],
  healthEventHeaders: [
    'event_ts',
    'event_type',
    'severity',
    'profile_id',
    'detail'
  ],
  perfWarnThresholdsMs: {
    ALBANY: 25000,
    LATHAM: 60000,
    DEFAULT: 45000
  },
  maxDetailLength: 45000,
  progressRowInterval: 2500,
  progressMinIntervalMs: 4000,
  progressMaxEvents: 12
};

const AI_DIAGNOSTICS = {
  sheetName: 'AI_Diagnostics',
  runRetention: 30,
  runSummaryStartCol: 1,   // A
  stageStepsStartCol: 30,  // AD
  queueHealthStartCol: 50, // AX
  hotspotsStartCol: 62,    // BJ
  perfPacketCell: 'BJ24',
  runSummaryHeaders: [
    'run_id',
    'started_at',
    'ended_at',
    'duration_ms',
    'source',
    'profile_id',
    'signature',
    'outcome',
    'error_code',
    'warning_count',
    'perf_warn',
    'checklist_rows',
    'no_reserve_rows',
    'compliance_flagged',
    'true_unmapped_count',
    'mapped_ignore_count',
    'resolved_closed_count',
    'stage_profile_resolve_ms',
    'stage_schema_gate_ms',
    'stage_location_sync_ms',
    'stage_preflight_ms',
    'stage_checklist_ms',
    'stage_compliance_ms',
    'stage_finalize_ms',
    'stage_other_ms'
  ],
  stageStepHeaders: [
    'run_id',
    'profile_id',
    'source',
    'stage',
    'step',
    'duration_ms',
    'stage_duration_ms',
    'unaccounted_ms',
    'api_reads',
    'api_writes',
    'rows_total',
    'rows_changed',
    'strategy',
    'segment_count',
    'span_width',
    'counter_a',
    'counter_b',
    'detail_json',
    'logged_at'
  ],
  queueHealthHeaders: [
    'run_id',
    'profile_id',
    'source',
    'true_unmapped_count',
    'mapped_ignore_count',
    'resolved_closed_count',
    'open_queue_count',
    'unknown_locations_csv',
    'logged_at'
  ],
  hotspotsHeaders: [
    'stage',
    'step',
    'avg_duration_ms',
    'max_duration_ms',
    'samples'
  ]
};

const PROFILE_LOCATION_SEEDS = {
  ALBANY: [
    ['SALES FLOOR', 'PICK SHELF', true, 'Albany active pick shelf'],
    ['BACKSTOCK BIN A', 'RESERVE', true, 'Albany reserve backstock'],
    ['BACKSTOCK BIN B', 'RESERVE', true, 'Albany reserve backstock'],
    ['SHELF 1', 'RESERVE', true, 'Albany reserve shelving'],
    ['SHELF 2', 'RESERVE', true, 'Albany reserve shelving'],
    ['SHELF 3', 'RESERVE', true, 'Albany reserve shelving'],
    ['SHELF 4', 'RESERVE', true, 'Albany reserve shelving'],
    ['SHELF 5', 'RESERVE', true, 'Albany reserve shelving'],
    ['SHELF 6', 'RESERVE', true, 'Albany reserve shelving'],
    ['TOP', 'RESERVE', true, 'Albany reserve top shelf'],
    ['BIN RECEIVING', 'IGNORE', false, 'Albany receiving staging'],
    ['SAMPLES', 'IGNORE', false, 'Albany sample inventory'],
    ['POS RETURN', 'IGNORE', false, 'Albany returns area'],
    ['QUARANTINE', 'IGNORE', false, 'Albany quarantine hold'],
    ['UNSELLABLE INVENTORY', 'IGNORE', false, 'Albany unsellable inventory'],
    ['DISPLAYS', 'IGNORE', false, 'Albany display-only inventory'],
    ['DAMAGED PRODUCTS', 'IGNORE', false, 'Albany damaged inventory']
  ],
  LATHAM_EXTRA: [
    ['BACK BIN 4', 'RESERVE', true, 'Latham reserve bin'],
    ['BACK BIN 5', 'RESERVE', true, 'Latham reserve bin'],
    ['BACK BIN 6', 'RESERVE', true, 'Latham reserve bin'],
    ['PROCESSED - PUT AWAY', 'RESERVE', true, 'Latham processed staging treated as reserve'],
    ['BIN RECEIVING', 'IGNORE', false, 'Latham receiving staging'],
    ['SAMPLES', 'IGNORE', false, 'Latham sample inventory'],
    ['POS RETURN', 'IGNORE', false, 'Latham returns area'],
    ['QUARANTINE', 'IGNORE', false, 'Latham quarantine hold'],
    ['UNSELLABLE INVENTORY', 'IGNORE', false, 'Latham unsellable inventory'],
    ['DISPLAYS', 'IGNORE', false, 'Latham display-only inventory'],
    ['ON HOLD', 'IGNORE', false, 'Latham held inventory'],
    ['DAMAGED PRODUCTS', 'IGNORE', false, 'Latham damaged inventory'],
    ['PROCESSING RACK', 'IGNORE', false, 'Latham processing rack'],
    ['FIND ME', 'IGNORE', false, 'Problem inventory location'],
    ['FRONT OF HOUSE SALES', 'IGNORE', false, 'Exclude front of house from restock']
  ]
};

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function to build the entire Vault Restock System.
 * Run this once to create all tabs, formulas, and formatting.
 */
function main() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Logger.log('Starting Vault Restock System Builder...');
  
  // Step 1: Create all tabs
  Logger.log('Creating tabs...');
  createAllTabs(ss);
  
  // Step 2: Setup each tab
  Logger.log('Setting up Home tab...');
  setupDailyHomeTab(ss);

  Logger.log('Setting up Start Here tab...');
  setupInstructionsTab(ss);
  
  Logger.log('Setting up Treez Valuation tab...');
  setupTreezValuationTab(ss);

  Logger.log('Setting up System Reference tab...');
  setupSystemReferenceTab(ss);

  Logger.log('Setting up System Diagnostics tab...');
  setupSystemDiagnosticsTab(ss);

  Logger.log('Setting up AI Diagnostics tab...');
  setupAIDiagnosticsTab(ss);
  
  Logger.log('Setting up Restock Settings tab...');
  setupRestockSettingsTab(ss);

  // Seed active profile location roles into Restock Settings before engine formulas run.
  const activeProfile = resolveActiveStoreProfile_(ss, { allowOverride: true, useRawData: true });
  syncLocationRolesForProfile_(ss, activeProfile.profileId, { source: 'main' });
  
  Logger.log('Setting up Restock Engine tab...');
  setupRestockEngineTab(ss);
  
  Logger.log('Setting up Restock List tab...');
  setupRestockChecklistTab(ss);

  Logger.log('Setting up Backstock Alerts tab...');
  setupNoReserveRiskTab(ss);
  
  Logger.log('Setting up Data Watchlist tab...');
  setupDataExceptionsTab(ss);
  
  Logger.log('Setting up Compliance Config tab...');
  setupComplianceConfigTab(ss);
  
  Logger.log('Setting up Compliance Alerts tab...');
  setupMissingComplianceTab(ss);
  
  Logger.log('Setting up Compliance History tab...');
  setupComplianceLogTab(ss);
  
  // Step 3: Apply formatting
  Logger.log('Applying formatting...');
  applyAllFormatting(ss);
  
  // Step 4: Create named ranges
  Logger.log('Creating named ranges...');
  createNamedRanges(ss);
  
  // Step 5: Protect internal tabs
  Logger.log('Setting up protections...');
  setupProtections(ss);

  // Step 6: Apply simplified default workspace view for staff users.
  applyWorkspaceView_(ss, 'STANDARD', { silent: true, persist: true });
  refreshDailyHomeHealthFromState_(ss);
  const homeSheet = getSheetByCompatName_(ss, 'Home');
  if (homeSheet) {
    ss.setActiveSheet(homeSheet);
  }
  
  Logger.log('Vault Restock System build complete!');
  SpreadsheetApp.getUi().alert('Vault Restock System built successfully!\n\nNext steps:\n1. Go to "Treez Valuation (Raw)" tab\n2. Import your Treez CSV starting at cell A6\n3. Run "Run Daily Update" from the Restock menu\n4. (Optional) Run "Install Auto-Run" once for import automation\n5. Review "Restock List", "Backstock Alerts", and "Compliance Alerts"');
}

// ============================================================================
// STOCKING RULES - Script-based rule matching
// ============================================================================

/**
 * Applies stocking rules to products in the Engine tab.
 * This function reads rules from Restock Settings and matches each product
 * to the best rule based on specificity (more criteria = higher priority).
 * 
 * Matching logic:
 * - Brand: exact match (case-insensitive)
 * - Product Type: exact match
 * - Size: contains match
 * - Name Contains: case-insensitive contains
 * 
 * Tie-breaking: If same specificity, lower Target wins (more conservative).
 * Fallback: Default rule from table if no custom rules match.
 */
function applyStockingRules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Restock Settings');
  const engineSheet = ss.getSheetByName('Restock Engine (Internal)');
  
  if (!settingsSheet || !engineSheet) {
    Logger.log('Required sheets not found. Run main() first.');
    return;
  }
  
  // Read rules table bounds from metadata (N3:N4). Fallback to legacy positions.
  const rulesStartRow = parseInt(settingsSheet.getRange('N3').getValue(), 10) || 63;
  const rulesEndRow = parseInt(settingsSheet.getRange('N4').getValue(), 10) || (rulesStartRow + STOCKING_RULES_DATA.length - 1);
  const rulesRowCount = Math.max(1, rulesEndRow - rulesStartRow + 1);
  
  // Read all rules from Settings tab (columns A-I)
  const rulesRange = settingsSheet.getRange(rulesStartRow, 1, rulesRowCount, 9);
  const rulesData = rulesRange.getValues();
  
  // Parse rules into objects for easier matching
  const rules = rulesData.map((row, index) => ({
    index: index,
    name: row[0] || '',
    brand: (row[1] || '').toString().toUpperCase().trim(),
    productType: (row[2] || '').toString().toUpperCase().trim(),
    size: (row[3] || '').toString().toUpperCase().trim(),
    nameContains: (row[4] || '').toString().toUpperCase().trim(),
    target: row[5],
    warning: row[6],
    critical: row[7],
    active: row[8] === true
  })).filter(rule => rule.active && rule.target > 0); // Only active rules with valid Target
  
  Logger.log('Found ' + rules.length + ' active rules');
  
  // Find the default rule (should be last active rule with no criteria)
  const defaultRule = rules.find(r => 
    r.brand === '' && r.productType === '' && r.size === '' && r.nameContains === ''
  ) || { name: 'Default', target: 7, warning: 4, critical: 2 };
  
  // Read products from Engine tab
  // Product summary starts at column Q (17), we need Q-V for matching (External ID, Brand, Name, Type, Subtype, Size)
  // And we'll write to columns AF-AI (32-35)
  const summaryStartCol = 17; // Column Q
  
  // Get rows to scan from current used range instead of full column.
  const engineLastRow = Math.max(2, engineSheet.getLastRow());
  const rowsToScan = Math.max(0, engineLastRow - 1);
  if (rowsToScan === 0) {
    Logger.log('No products found in Engine tab');
    return;
  }

  // Get the last row with data in column Q (External ID)
  const externalIds = engineSheet.getRange(2, summaryStartCol, rowsToScan, 1).getValues();
  let productCount = 0;
  for (let i = 0; i < externalIds.length; i++) {
    if (externalIds[i][0] === '' || externalIds[i][0] === null) break;
    productCount++;
  }
  
  if (productCount === 0) {
    Logger.log('No products found in Engine tab');
    return;
  }
  
  Logger.log('Processing ' + productCount + ' products for rule matching');
  
  // Read product data: Q=External ID, R=Brand, S=Name, T=Type, U=Subtype, V=Size
  const productData = engineSheet.getRange(2, summaryStartCol, productCount, 6).getValues();
  
  // Prepare output array for columns AF-AI
  const ruleOutput = [];
  
  // Match each product to best rule
  for (let i = 0; i < productCount; i++) {
    const product = {
      externalId: productData[i][0],
      brand: (productData[i][1] || '').toString().toUpperCase().trim(),
      name: (productData[i][2] || '').toString().toUpperCase().trim(),
      type: (productData[i][3] || '').toString().toUpperCase().trim(),
      size: (productData[i][5] || '').toString().toUpperCase().trim()
    };
    
    // Find best matching rule
    let bestMatch = null;
    let bestSpecificity = -1;
    let bestTarget = Infinity;
    
    for (const rule of rules) {
      // Check if rule matches product
      const brandMatch = rule.brand === '' || rule.brand === product.brand;
      const typeMatch = rule.productType === '' || rule.productType === product.type;
      const sizeMatch = rule.size === '' || product.size.includes(rule.size);
      const nameMatch = rule.nameContains === '' || product.name.includes(rule.nameContains);
      
      if (brandMatch && typeMatch && sizeMatch && nameMatch) {
        // Calculate specificity (count of non-empty criteria)
        const specificity = 
          (rule.brand !== '' ? 1 : 0) +
          (rule.productType !== '' ? 1 : 0) +
          (rule.size !== '' ? 1 : 0) +
          (rule.nameContains !== '' ? 1 : 0);
        
        // Better match if: higher specificity, OR same specificity with lower target (conservative)
        if (specificity > bestSpecificity || 
            (specificity === bestSpecificity && rule.target < bestTarget)) {
          bestMatch = rule;
          bestSpecificity = specificity;
          bestTarget = rule.target;
        }
      }
    }
    
    // Use best match or default
    const matchedRule = bestMatch || defaultRule;
    
    ruleOutput.push([
      matchedRule.name || 'Default',
      matchedRule.target || 7,
      matchedRule.warning || 4,
      matchedRule.critical || 2
    ]);
  }
  
  // Write results to Engine tab columns AF-AI (32-35)
  // AF = Matched Rule (col 32)
  // AG = Target (col 33)
  // AH = Warning (col 34)
  // AI = Critical (col 35)
  engineSheet.getRange(2, 32, productCount, 4).setValues(ruleOutput);
  
  Logger.log('Stocking rules applied to ' + productCount + ' products');
}

function computeStockingRulesSignature_(settingsSheet) {
  if (!settingsSheet) return '';
  const rulesStartRow = parseInt(settingsSheet.getRange('N3').getValue(), 10) || 63;
  const rulesEndRow = parseInt(settingsSheet.getRange('N4').getValue(), 10) || (rulesStartRow + STOCKING_RULES_DATA.length - 1);
  const rulesRowCount = Math.max(1, rulesEndRow - rulesStartRow + 1);
  const values = settingsSheet.getRange(rulesStartRow, 1, rulesRowCount, 9).getDisplayValues();
  return computeTextHash_(safeJson_(values));
}

function runDailyUpdate() {
  return runDailyUpdate_({
    includeChecklist: true,
    includeCompliance: true,
    silent: false,
    source: 'menu_daily'
  });
}

function runChecklistOnly() {
  return runDailyUpdate_({
    includeChecklist: true,
    includeCompliance: false,
    silent: false,
    source: 'menu_checklist'
  });
}

function runComplianceOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  migrateLegacyTabNames_(ss);
  ensureSystemDiagnosticsTab_(ss);
  const schemaGate = validateRunSchemaGate_(ss, {
    includeChecklist: false,
    includeCompliance: true
  });
  const props = PropertiesService.getDocumentProperties();
  props.setProperty(SYSTEM_REFERENCE.props.lastSchemaStatus, schemaGate.schemaStatus);
  props.setProperty(SYSTEM_REFERENCE.props.lastConfigStatus, schemaGate.configStatus);
  if (!schemaGate.ok) {
    const message = schemaGate.blockingIssues.join(' | ');
    appendHealthEvent_(ss, 'SCHEMA_BLOCK', 'ERROR', '', message);
    SpreadsheetApp.getUi().alert('Compliance run blocked due to schema/config guardrails.\n\n' + message);
    refreshDailyHomeHealthFromState_(ss);
    return { ok: false, reason: RUN_OUTCOMES.blockedSchema, schemaGate: schemaGate };
  }

  const signature = computeRawImportSignature_(ss);
  const profile = resolveActiveStoreProfile_(ss, {
    allowOverride: true,
    useRawData: true,
    signature: signature
  });
  props.setProperty(SYSTEM_REFERENCE.props.activeProfile, profile.profileId);
  syncLocationRolesForProfile_(ss, profile.profileId, { source: 'runComplianceOnly' });
  const result = runComplianceCheck({ silent: false, source: 'menu_compliance' });
  const complianceSheet = getSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.outputSheetName);
  if (complianceSheet) {
    ss.setActiveSheet(complianceSheet);
  }
  refreshDailyHomeHealthFromState_(ss);
  return result;
}

function setChecklistViewPriority() {
  return setChecklistViewMode_('PRIORITY');
}

function setChecklistViewLocationWave() {
  return setChecklistViewMode_('LOCATION_WAVE');
}

function setChecklistViewMode_(mode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const settingsSheet = ss.getSheetByName('Restock Settings');
  if (!settingsSheet) {
    ui.alert('Restock Settings tab not found. Run main() first.');
    return { ok: false, reason: 'MISSING_SETTINGS' };
  }

  const targetMode = parseEnumWithFallback_(mode, CONFIG.checklistSortModes, 'PRIORITY');
  const currentMode = parseEnumWithFallback_(settingsSheet.getRange('L2').getDisplayValue(), CONFIG.checklistSortModes, 'PRIORITY');
  if (currentMode !== targetMode) {
    settingsSheet.getRange('L2').setValue(targetMode);
  }

  const result = refreshChecklist({ silent: true });
  if (!result || result.ok !== true) {
    ui.alert(
      'Checklist view updated to ' + targetMode + ', but checklist refresh did not complete.\n' +
      'Run "Run Checklist Only" after confirming import and mappings.'
    );
    return { ok: false, mode: targetMode, checklist: result };
  }

  ui.alert('Checklist view set to ' + targetMode + '.\n\nRows in view: ' + result.dataRowCount);
  return { ok: true, mode: targetMode, dataRowCount: result.dataRowCount };
}

function ensureChecklistViewConfig_(ss) {
  const settingsSheet = ss.getSheetByName('Restock Settings');
  if (!settingsSheet) return;

  settingsSheet.getRange('K2').setValue('Checklist View Mode').setFontWeight('bold');
  const modeCell = settingsSheet.getRange('L2');
  const modeValue = parseEnumWithFallback_(modeCell.getDisplayValue(), CONFIG.checklistSortModes, 'PRIORITY');
  modeCell.setValue(modeValue);
  const sortModeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.checklistSortModes, true)
    .setAllowInvalid(false)
    .build();
  modeCell.setDataValidation(sortModeValidation);
  settingsSheet.getRange('M2').setValue('PRIORITY = urgency order | LOCATION_WAVE = grouped by First Pull From');
}

function ensureNoReserveRiskTab_(ss) {
  const existing = getSheetByCompatName_(ss, 'Backstock Alerts');
  if (existing) return;
  const newSheet = ensureSheetByCompatName_(ss, 'Backstock Alerts');
  const checklistSheet = getSheetByCompatName_(ss, 'Restock List');
  if (checklistSheet) {
    ss.setActiveSheet(newSheet);
    ss.moveActiveSheet(checklistSheet.getIndex() + 1);
  }
  setupNoReserveRiskTab(ss);
}

function ensureSystemDiagnosticsTab_(ss) {
  if (ss.getSheetByName(DIAGNOSTICS.sheetName)) return;
  ss.insertSheet(DIAGNOSTICS.sheetName);
  setupSystemDiagnosticsTab(ss);
}

function ensureAIDiagnosticsTab_(ss) {
  if (ss.getSheetByName(AI_DIAGNOSTICS.sheetName)) return;
  ss.insertSheet(AI_DIAGNOSTICS.sheetName);
  setupAIDiagnosticsTab(ss);
}

function ensureDailyHomeTab_(ss) {
  const existing = getSheetByCompatName_(ss, 'Home');
  if (existing) return;
  const sheet = ensureSheetByCompatName_(ss, 'Home');
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);
  setupDailyHomeTab(ss);
}

function buildRunId_() {
  const now = new Date();
  const ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const rand = Math.floor(Math.random() * 100000);
  return 'RUN-' + ts + '-' + ('00000' + rand).slice(-5);
}

function createRunContext_(options) {
  const opts = options || {};
  const startedAt = new Date();
  return {
    runId: buildRunId_(),
    startedAt: startedAt,
    startedMs: startedAt.getTime(),
    endedAt: null,
    durationMs: 0,
    source: opts.source || 'manual',
    profileId: opts.profileId || '',
    signature: opts.signature || '',
    outcome: '',
    errorCode: '',
    warningCount: 0,
    checklistRows: 0,
    noReserveRows: 0,
    complianceFlagged: 0,
    stageDurations: {},
    stageStepDurations: {},
    stageCounters: {},
    queueHealth: {
      trueUnmappedCount: 0,
      mappedIgnoreCount: 0,
      resolvedClosedCount: 0,
      openQueueCount: 0,
      unknownLocationsCsv: ''
    },
    perfWarn: false
  };
}

function ensureStageMetrics_(runCtx, stageName) {
  if (!runCtx || !stageName) return;
  if (!runCtx.stageStepDurations[stageName]) {
    runCtx.stageStepDurations[stageName] = {};
  }
  if (!runCtx.stageCounters[stageName]) {
    runCtx.stageCounters[stageName] = {};
  }
}

function captureStageStepDurations_(runCtx, stageName, stepDurations) {
  if (!runCtx || !stageName || !stepDurations) return;
  ensureStageMetrics_(runCtx, stageName);
  const keys = Object.keys(stepDurations);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = parseInt(stepDurations[key], 10);
    runCtx.stageStepDurations[stageName][key] = isNaN(value) ? 0 : Math.max(0, value);
  }
}

function mergeStageCounters_(runCtx, stageName, counters) {
  if (!runCtx || !stageName || !counters) return;
  ensureStageMetrics_(runCtx, stageName);
  const keys = Object.keys(counters);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    runCtx.stageCounters[stageName][key] = counters[key];
  }
}

function attachStageDiagnostics_(runCtx, stageName, payload) {
  if (!runCtx || !stageName || !payload) return;

  if (payload.stepDurationsMs) {
    captureStageStepDurations_(runCtx, stageName, payload.stepDurationsMs);
  }
  if (payload.metrics) {
    mergeStageCounters_(runCtx, stageName, payload.metrics);
  }
  if (payload.counters) {
    mergeStageCounters_(runCtx, stageName, payload.counters);
  }
  if (payload.diagnostics) {
    if (payload.diagnostics.stepDurationsMs) {
      captureStageStepDurations_(runCtx, stageName, payload.diagnostics.stepDurationsMs);
    }
    if (payload.diagnostics.metrics) {
      mergeStageCounters_(runCtx, stageName, payload.diagnostics.metrics);
    }
  }
}

function getStageOtherDurationMs_(runCtx) {
  if (!runCtx || !runCtx.stageDurations) return 0;
  const knownStages = {
    profile_resolve: true,
    schema_gate: true,
    location_sync: true,
    preflight: true,
    checklist: true,
    compliance: true,
    finalize: true
  };
  let total = 0;
  const stageKeys = Object.keys(runCtx.stageDurations);
  for (let i = 0; i < stageKeys.length; i++) {
    const stage = stageKeys[i];
    if (knownStages[stage]) continue;
    total += parseInt(runCtx.stageDurations[stage], 10) || 0;
  }
  return total;
}

function runWithStageTiming_(runCtx, stageName, fn, options) {
  const opts = options || {};
  const ss = opts.ss || null;
  if (ss && opts.logStart === true) {
    logRunStageEvent_(ss, runCtx, 'RUN_STAGE_START', 'INFO', stageName, opts.startDetails || {});
  }
  const start = Date.now();
  try {
    const result = fn();
    const durationMs = Date.now() - start;
    runCtx.stageDurations[stageName] = durationMs;
    attachStageDiagnostics_(runCtx, stageName, result);
    if (ss && opts.logEnd === true) {
      const endDetails = typeof opts.buildEndDetails === 'function'
        ? (opts.buildEndDetails(result, durationMs) || {})
        : (opts.endDetails || {});
      if (typeof endDetails === 'object' && endDetails !== null && !Array.isArray(endDetails)) {
        endDetails.duration_ms = durationMs;
      }
      logRunStageEvent_(ss, runCtx, 'RUN_STAGE_END', 'INFO', stageName, endDetails);
    }
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    runCtx.stageDurations[stageName] = durationMs;
    if (ss && opts.logFailure !== false) {
      logRunStageEvent_(ss, runCtx, 'RUN_STAGE_FAIL', 'ERROR', stageName, {
        duration_ms: durationMs,
        error: String(error)
      });
    }
    throw error;
  } finally {
    if (!runCtx.stageDurations.hasOwnProperty(stageName)) {
      runCtx.stageDurations[stageName] = Date.now() - start;
    }
  }
}

function getPerfWarnThresholdMs_(profileId) {
  const token = String(profileId || '').toUpperCase().trim();
  if (DIAGNOSTICS.perfWarnThresholdsMs[token]) {
    return DIAGNOSTICS.perfWarnThresholdsMs[token];
  }
  return DIAGNOSTICS.perfWarnThresholdsMs.DEFAULT;
}

function getSystemDiagnosticsSheet_(ss) {
  let sheet = ss.getSheetByName(DIAGNOSTICS.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(DIAGNOSTICS.sheetName);
    setupSystemDiagnosticsTab(ss);
    sheet = ss.getSheetByName(DIAGNOSTICS.sheetName);
  }
  return sheet;
}

function appendRunJournal_(ss, runCtx) {
  const sheet = getSystemDiagnosticsSheet_(ss);
  sheet.appendRow([
    runCtx.runId,
    runCtx.startedAt,
    runCtx.endedAt,
    runCtx.durationMs,
    runCtx.source,
    runCtx.profileId,
    runCtx.signature,
    runCtx.outcome,
    runCtx.errorCode,
    runCtx.warningCount,
    runCtx.checklistRows,
    runCtx.noReserveRows,
    runCtx.complianceFlagged
  ]);
}

function stringifyDiagnosticValue_(value) {
  if (value === null || typeof value === 'undefined') return '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  if (Array.isArray(value)) {
    return value.map(v => stringifyDiagnosticValue_(v)).filter(v => v !== '').join(',');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

function truncateDiagnosticDetail_(detail) {
  const maxLen = DIAGNOSTICS.maxDetailLength || 45000;
  const text = String(detail || '');
  if (text.length <= maxLen) return text;
  const suffix = ' ...[truncated]';
  return text.slice(0, Math.max(0, maxLen - suffix.length)) + suffix;
}

function formatDiagnosticDetail_(detail) {
  if (detail === null || typeof detail === 'undefined') return '';
  if (typeof detail === 'string') {
    return truncateDiagnosticDetail_(detail.replace(/\s+/g, ' ').trim());
  }

  const parts = [];
  const keys = Object.keys(detail);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = stringifyDiagnosticValue_(detail[key]);
    if (value === '') continue;
    const cleanValue = value.replace(/\s+/g, ' ').trim();
    if (cleanValue === '') continue;
    parts.push(key + '=' + cleanValue);
  }
  return truncateDiagnosticDetail_(parts.join('; '));
}

function logRunStageEvent_(ss, runCtx, eventType, severity, stageName, detail) {
  const payload = {
    run_id: runCtx && runCtx.runId ? runCtx.runId : '',
    source: runCtx && runCtx.source ? runCtx.source : '',
    stage: stageName || ''
  };
  if (runCtx && runCtx.signature) {
    payload.signature = runCtx.signature;
  }
  if (detail !== null && typeof detail !== 'undefined') {
    if (typeof detail === 'string') {
      payload.detail = detail;
    } else if (typeof detail === 'object' && !Array.isArray(detail)) {
      const keys = Object.keys(detail);
      for (let i = 0; i < keys.length; i++) {
        payload[keys[i]] = detail[keys[i]];
      }
    } else {
      payload.detail = String(detail);
    }
  }
  appendHealthEvent_(ss, eventType, severity, runCtx && runCtx.profileId ? runCtx.profileId : '', formatDiagnosticDetail_(payload));
}

function summarizeStepDurations_(stepDurations) {
  const src = stepDurations || {};
  const keys = Object.keys(src);
  const output = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const safeKey = key + '_ms';
    output[safeKey] = src[key];
  }
  return output;
}

function runTimedStep_(stepDurations, stepName, fn) {
  const start = Date.now();
  try {
    return fn();
  } finally {
    stepDurations[stepName] = Date.now() - start;
  }
}

function emitDiagnosticsCheckpoint_(ss, diagnostics, eventType, severity, detail) {
  if (!diagnostics || !diagnostics.runCtx) return;
  logRunStageEvent_(
    ss,
    diagnostics.runCtx,
    eventType || 'RUN_CHECKPOINT',
    severity || 'INFO',
    diagnostics.stage || '',
    detail || {}
  );
}

function appendHealthEvent_(ss, eventType, severity, profileId, detail) {
  const sheet = getSystemDiagnosticsSheet_(ss);
  const lastRow = Math.max(2, sheet.getLastRow());
  const appendRow = lastRow + 1;
  sheet.getRange(appendRow, 14, 1, 5).setValues([[
    new Date(),
    String(eventType || '').trim(),
    String(severity || '').trim().toUpperCase(),
    String(profileId || '').trim().toUpperCase(),
    truncateDiagnosticDetail_(String(detail || ''))
  ]]);
}

function countOpenUnknownLocationQueue_(ss) {
  const sheet = ss.getSheetByName(SYSTEM_REFERENCE.sheetName);
  if (!sheet) return 0;
  const lastRow = Math.max(2, sheet.getLastRow());
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, 15, lastRow - 1, 4).getDisplayValues(); // profile, location, suggested, status
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const profileId = String(values[i][0] || '').toUpperCase().trim();
    const location = String(values[i][1] || '').toUpperCase().trim();
    if (!profileId || !location) continue;
    const status = String(values[i][3] || '').toUpperCase().trim();
    if (!status || status === 'NEW' || status === 'OPEN') {
      count++;
    }
  }
  return count;
}

function getTriggerStatus_(ss) {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const hasTrigger = triggers.some(t => t.getHandlerFunction() === 'handleSpreadsheetChange');
    if (!hasTrigger) return 'NOT_INSTALLED';

    const profile = resolveActiveStoreProfile_(ss, { allowOverride: true, useRawData: true });
    if (!profile.autoRunEnabled) return 'DISABLED_FOR_PROFILE';
    return 'ACTIVE';
  } catch (error) {
    // Simple triggers can run in reduced auth contexts; avoid breaking onOpen/menu creation.
    Logger.log('getTriggerStatus_ unavailable in current context: ' + error);
    return 'UNKNOWN_NOAUTH';
  }
}

function finalizeRunContext_(ss, runCtx, options) {
  const opts = options || {};
  const props = PropertiesService.getDocumentProperties();
  runCtx.endedAt = runCtx.endedAt || new Date();
  runCtx.durationMs = Math.max(0, runCtx.endedAt.getTime() - runCtx.startedMs);

  props.setProperty(SYSTEM_REFERENCE.props.lastRunId, runCtx.runId);
  props.setProperty(SYSTEM_REFERENCE.props.lastRunOutcome, runCtx.outcome || '');
  props.setProperty(SYSTEM_REFERENCE.props.lastRunDurationMs, String(runCtx.durationMs || 0));
  const inProgressId = props.getProperty(SYSTEM_REFERENCE.props.runInProgress) || '';
  if (inProgressId === runCtx.runId) {
    props.deleteProperty(SYSTEM_REFERENCE.props.runInProgress);
  }

  if (opts.persistSuccessSignature && runCtx.signature) {
    props.setProperty(SYSTEM_REFERENCE.props.lastSuccessSignature, runCtx.signature);
    props.setProperty(SYSTEM_REFERENCE.props.lastImportSignature, runCtx.signature);
  }

  runCtx.queueHealth.openQueueCount = countOpenUnknownLocationQueue_(ss);
  appendRunJournal_(ss, runCtx);
  try {
    appendAIDiagnostics_(ss, runCtx);
  } catch (aiError) {
    appendHealthEvent_(
      ss,
      'AI_DIAGNOSTICS_FAIL',
      'WARN',
      runCtx.profileId,
      formatDiagnosticDetail_({
        run_id: runCtx.runId,
        source: runCtx.source,
        stage: 'finalize',
        error: String(aiError)
      })
    );
  }

  const stageParts = [];
  const stageKeys = Object.keys(runCtx.stageDurations || {});
  for (let i = 0; i < stageKeys.length; i++) {
    const key = stageKeys[i];
    stageParts.push(key + '=' + runCtx.stageDurations[key] + 'ms');
  }
  if (stageParts.length > 0) {
    appendHealthEvent_(
      ss,
      'STAGE_TIMINGS',
      'INFO',
      runCtx.profileId,
      formatDiagnosticDetail_({
        run_id: runCtx.runId,
        source: runCtx.source,
        stage: 'pipeline',
        stages: stageParts.join('|')
      })
    );
  }

  if (runCtx.outcome && runCtx.outcome !== RUN_OUTCOMES.success) {
    appendHealthEvent_(
      ss,
      'RUN_OUTCOME',
      'WARN',
      runCtx.profileId,
      formatDiagnosticDetail_({
        run_id: runCtx.runId,
        source: runCtx.source,
        stage: 'pipeline',
        outcome: runCtx.outcome,
        error_code: runCtx.errorCode || ''
      })
    );
  }

  updateDailyHomeHealth_(ss, {
    triggerStatus: getTriggerStatus_(ss),
    lastOutcome: runCtx.outcome,
    lastRunDurationMs: runCtx.durationMs,
    configValidity: props.getProperty(SYSTEM_REFERENCE.props.lastConfigStatus) || 'UNKNOWN',
    schemaStatus: props.getProperty(SYSTEM_REFERENCE.props.lastSchemaStatus) || 'UNKNOWN',
    unknownQueueOpen: runCtx.queueHealth.openQueueCount
  });
}

function runDailyUpdate_(options) {
  const opts = options || {};
  const includeChecklist = opts.includeChecklist !== false;
  const includeCompliance = opts.includeCompliance !== false;
  const silent = opts.silent === true;
  const source = String(opts.source || 'manual');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  migrateLegacyTabNames_(ss);
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  const signature = opts.signature || computeRawImportSignature_(ss) || '';
  const runCtx = createRunContext_({
    source: source,
    signature: signature
  });
  let lock = null;
  let preflight = null;
  let checklistResult = null;
  let complianceResult = null;
  let profile = null;

  try {
    ensureDailyHomeTab_(ss);
    ensureChecklistViewConfig_(ss);
    ensureNoReserveRiskTab_(ss);
    ensureSystemDiagnosticsTab_(ss);
    ensureAIDiagnosticsTab_(ss);
    logRunStageEvent_(ss, runCtx, 'RUN_START', 'INFO', 'pipeline', {
      include_checklist: includeChecklist,
      include_compliance: includeCompliance,
      signature_present: signature ? true : false
    });

    if (source === 'auto_trigger' && signature) {
      const lastSuccessSignature = props.getProperty(SYSTEM_REFERENCE.props.lastSuccessSignature) || '';
      if (signature === lastSuccessSignature) {
        runCtx.outcome = RUN_OUTCOMES.skippedDuplicate;
        runCtx.errorCode = RUN_OUTCOMES.skippedDuplicate;
        logRunStageEvent_(ss, runCtx, 'RUN_SKIPPED', 'INFO', 'pipeline', {
          reason: RUN_OUTCOMES.skippedDuplicate,
          phase: 'pre_lock'
        });
        finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
        return { ok: false, reason: RUN_OUTCOMES.skippedDuplicate, skipped: true };
      }
    }

    lock = LockService.getDocumentLock();
    if (!lock.tryLock(1000)) {
      runCtx.outcome = RUN_OUTCOMES.skippedLocked;
      runCtx.errorCode = RUN_OUTCOMES.skippedLocked;
      logRunStageEvent_(ss, runCtx, 'RUN_SKIPPED', 'WARN', 'pipeline', {
        reason: RUN_OUTCOMES.skippedLocked,
        phase: 'lock_acquire'
      });
      updateDailyHomeSummary_(ss, {
        status: 'BUSY',
        runTimestamp: new Date(),
        profileId: '',
        checklistRows: 0,
        noReserveRiskRows: 0,
        complianceIssues: 0,
        unknownLocationsQueued: 0,
        nextStep: 'Another run is already in progress. Retry in a moment.'
      });
      finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
      if (!silent && source !== 'auto_trigger') {
        ui.alert('Daily update is already running. Please wait and retry.');
      }
      return { ok: false, reason: RUN_OUTCOMES.skippedLocked, skipped: true };
    }

    props.setProperty(SYSTEM_REFERENCE.props.runInProgress, runCtx.runId);
    logRunStageEvent_(ss, runCtx, 'RUN_LOCK_ACQUIRED', 'INFO', 'pipeline', {});

    if (source === 'auto_trigger' && signature) {
      const lockedLastSuccess = props.getProperty(SYSTEM_REFERENCE.props.lastSuccessSignature) || '';
      if (signature === lockedLastSuccess) {
        runCtx.outcome = RUN_OUTCOMES.skippedDuplicate;
        runCtx.errorCode = RUN_OUTCOMES.skippedDuplicate;
        logRunStageEvent_(ss, runCtx, 'RUN_SKIPPED', 'INFO', 'pipeline', {
          reason: RUN_OUTCOMES.skippedDuplicate,
          phase: 'post_lock'
        });
        finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
        return { ok: false, reason: RUN_OUTCOMES.skippedDuplicate, skipped: true };
      }
    }

    profile = runWithStageTiming_(
      runCtx,
      'profile_resolve',
      function() {
        return resolveActiveStoreProfile_(ss, { allowOverride: true, useRawData: true, signature: signature });
      },
      {
        ss: ss,
        logStart: true,
        logEnd: true,
        buildEndDetails: function(result) {
          return {
            profile_id: result && result.profileId ? result.profileId : '',
            profile_source: result && result.source ? result.source : '',
            auto_run_enabled: result && result.autoRunEnabled ? true : false,
            signature_license: getLicenseTokenFromSignature_(signature)
          };
        }
      }
    );
    runCtx.profileId = profile.profileId;
    mergeStageCounters_(runCtx, 'profile_resolve', {
      profileId: profile.profileId,
      profileSource: profile.source || '',
      autoRunEnabled: profile.autoRunEnabled === true
    });
    if (!silent) {
      ss.toast('Daily update started for profile ' + profile.profileId + '.', 'Restock Daily Update', 5);
    }
    updateDailyHomeSummary_(ss, {
      status: 'RUNNING',
      runTimestamp: new Date(),
      profileId: profile.profileId,
      checklistRows: 0,
      noReserveRiskRows: 0,
      complianceIssues: 0,
      unknownLocationsQueued: 0,
      nextStep: 'Running checklist and compliance checks...'
    });
    props.setProperty(SYSTEM_REFERENCE.props.activeProfile, profile.profileId);

    const schemaGate = runWithStageTiming_(
      runCtx,
      'schema_gate',
      function() {
        return validateRunSchemaGate_(ss, {
          includeChecklist: includeChecklist,
          includeCompliance: includeCompliance
        });
      },
      {
        ss: ss,
        logStart: true,
        logEnd: true,
        buildEndDetails: function(result) {
          return {
            schema_ok: result && result.ok ? true : false,
            schema_status: result && result.schemaStatus ? result.schemaStatus : '',
            config_status: result && result.configStatus ? result.configStatus : '',
            warning_count: result && result.warnings ? result.warnings.length : 0,
            blocking_issue_count: result && result.blockingIssues ? result.blockingIssues.length : 0
          };
        }
      }
    );
    props.setProperty(SYSTEM_REFERENCE.props.lastSchemaStatus, schemaGate.schemaStatus);
    props.setProperty(SYSTEM_REFERENCE.props.lastConfigStatus, schemaGate.configStatus);
    mergeStageCounters_(runCtx, 'schema_gate', {
      warningCount: schemaGate.warnings.length,
      blockingIssueCount: schemaGate.blockingIssues.length,
      schemaStatus: schemaGate.schemaStatus,
      configStatus: schemaGate.configStatus
    });
    runCtx.warningCount += schemaGate.warnings.length;
    if (!schemaGate.ok) {
      runCtx.outcome = RUN_OUTCOMES.blockedSchema;
      runCtx.errorCode = RUN_OUTCOMES.blockedSchema;
      const message = schemaGate.blockingIssues.join(' | ');
      updateDailyHomeSummary_(ss, {
        status: 'BLOCKED',
        runTimestamp: new Date(),
        profileId: profile.profileId,
        checklistRows: 0,
        noReserveRiskRows: 0,
        complianceIssues: 0,
        unknownLocationsQueued: 0,
        nextStep: 'Fix schema/config issues, then run Daily Update again.'
      });
      appendHealthEvent_(ss, 'SCHEMA_BLOCK', 'ERROR', profile.profileId, message);
      finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
      if (!silent) {
        ui.alert('Daily update blocked due to schema/config guardrails.\n\n' + message);
      }
      return { ok: false, reason: RUN_OUTCOMES.blockedSchema, schemaGate: schemaGate };
    }

    const locationSync = runWithStageTiming_(
      runCtx,
      'location_sync',
      function() {
        return syncLocationRolesForProfile_(ss, profile.profileId, { source: source || 'runDailyUpdate' });
      },
      {
        ss: ss,
        logStart: true,
        logEnd: true,
        buildEndDetails: function(result) {
          const details = {
            synced_rows: result && typeof result.rowCount === 'number' ? result.rowCount : 0,
            skipped_write: result && result.skipped === true,
            signature_changed: result && result.signatureChanged === true,
            rows_written: result && typeof result.rowsWritten === 'number' ? result.rowsWritten : 0,
            checkbox_rebuild_performed: result && result.checkboxRebuildPerformed === true,
            named_ranges_updated_count: result && typeof result.namedRangesUpdatedCount === 'number' ? result.namedRangesUpdatedCount : 0
          };
          if (result && result.expectedSignature) {
            details.expected_signature = String(result.expectedSignature).slice(0, 12);
          }
          if (result && result.existingSignature) {
            details.existing_signature = String(result.existingSignature).slice(0, 12);
          }
          if (result && result.stepDurationsMs) {
            const stepMetrics = summarizeStepDurations_(result.stepDurationsMs);
            const keys = Object.keys(stepMetrics);
            for (let i = 0; i < keys.length; i++) {
              details[keys[i]] = stepMetrics[keys[i]];
            }
          }
          return details;
        }
      }
    );
    if (locationSync) {
      mergeStageCounters_(runCtx, 'location_sync', {
        rowsTotal: locationSync.rowCount || 0,
        rowsWritten: locationSync.rowsWritten || 0,
        rowsChanged: locationSync.rowsWritten || 0,
        checkboxRebuildPerformed: locationSync.checkboxRebuildPerformed === true,
        namedRangesUpdatedCount: locationSync.namedRangesUpdatedCount || 0
      });
    }

    preflight = runWithStageTiming_(
      runCtx,
      'preflight',
      function() {
        return runRestockPreflight_(ss, profile);
      },
      {
        ss: ss,
        logStart: true,
        logEnd: true,
        buildEndDetails: function(result) {
          return {
            eligible_rows: result && typeof result.eligibleRows === 'number' ? result.eligibleRows : 0,
            pick_rows: result && typeof result.pickRows === 'number' ? result.pickRows : 0,
            reserve_rows: result && typeof result.reserveRows === 'number' ? result.reserveRows : 0,
            unknown_locations: result && typeof result.unknownLocationCount === 'number' ? result.unknownLocationCount : 0,
            true_unmapped: result && typeof result.trueUnmappedCount === 'number' ? result.trueUnmappedCount : 0,
            mapped_ignore: result && typeof result.mappedIgnoreCount === 'number' ? result.mappedIgnoreCount : 0,
            resolved_closed: result && typeof result.resolvedClosedCount === 'number' ? result.resolvedClosedCount : 0,
            queue_inserted: result && typeof result.queueInsertedCount === 'number' ? result.queueInsertedCount : 0,
            queue_updated: result && typeof result.queueUpdatedCount === 'number' ? result.queueUpdatedCount : 0,
            license_distinct: result && typeof result.licenseDistinctCount === 'number' ? result.licenseDistinctCount : 0,
            dominant_license: result && result.dominantLicense ? result.dominantLicense : '',
            blocked: result && result.blocked === true
          };
        }
      }
    );
    if (preflight) {
      mergeStageCounters_(runCtx, 'preflight', {
        rowsTotal: preflight.eligibleRows || 0,
        pickRows: preflight.pickRows || 0,
        reserveRows: preflight.reserveRows || 0,
        trueUnmappedCount: preflight.trueUnmappedCount || preflight.unknownLocationCount || 0,
        mappedIgnoreCount: preflight.mappedIgnoreCount || 0,
        resolvedClosedCount: preflight.resolvedClosedCount || 0
      });
      runCtx.queueHealth.trueUnmappedCount = preflight.trueUnmappedCount || preflight.unknownLocationCount || 0;
      runCtx.queueHealth.mappedIgnoreCount = preflight.mappedIgnoreCount || 0;
      runCtx.queueHealth.resolvedClosedCount = preflight.resolvedClosedCount || 0;
      runCtx.queueHealth.unknownLocationsCsv = (preflight.unknownLocationNames || []).join('|');
      appendHealthEvent_(
        ss,
        'QUEUE_HEALTH',
        'INFO',
        profile.profileId,
        formatDiagnosticDetail_({
          run_id: runCtx.runId,
          source: runCtx.source,
          stage: 'preflight',
          true_unmapped: runCtx.queueHealth.trueUnmappedCount,
          mapped_ignore: runCtx.queueHealth.mappedIgnoreCount,
          resolved_closed: runCtx.queueHealth.resolvedClosedCount
        })
      );
      if ((preflight.licenseDistinctCount || 0) > 1) {
        appendHealthEvent_(
          ss,
          'MIXED_LICENSE',
          'WARN',
          profile.profileId,
          formatDiagnosticDetail_({
            run_id: runCtx.runId,
            source: runCtx.source,
            stage: 'preflight',
            license_distinct: preflight.licenseDistinctCount || 0,
            dominant_license: preflight.dominantLicense || ''
          })
        );
      }
    }
    if (preflight.blocked) {
      runCtx.outcome = RUN_OUTCOMES.blockedPreflight;
      runCtx.errorCode = RUN_OUTCOMES.blockedPreflight;
      updateDailyHomeSummary_(ss, {
        status: 'BLOCKED',
        runTimestamp: new Date(),
        profileId: profile.profileId,
        checklistRows: 0,
        noReserveRiskRows: 0,
        complianceIssues: 0,
        unknownLocationsQueued: preflight.unknownLocationCount,
        nextStep: 'Fix location mappings in System_Reference, then run Daily Update again.'
      });
      if (!silent) {
        ui.alert(
          'Daily update blocked.\n\n' +
          'Profile: ' + preflight.profileId + '\n' +
          'Eligible rows: ' + preflight.eligibleRows + '\n' +
          'Pick rows: ' + preflight.pickRows + '\n' +
          'Reserve rows: ' + preflight.reserveRows + '\n' +
          'Unknown locations: ' + preflight.unknownLocationCount + '\n\n' +
          'Fix location mappings first.'
        );
      }
      finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
      return { ok: false, reason: RUN_OUTCOMES.blockedPreflight, preflight: preflight };
    }

    if (includeChecklist) {
      if (!silent) {
        ss.toast('Refreshing restock list...', 'Restock Daily Update', 5);
      }
      checklistResult = runWithStageTiming_(
        runCtx,
        'checklist',
        function() {
          return refreshChecklist({
            silent: true,
            skipPreflight: true,
            runSignature: signature,
            diagnostics: {
              runCtx: runCtx,
              stage: 'checklist'
            }
          });
        },
        {
          ss: ss,
          logStart: true,
          logEnd: true,
          buildEndDetails: function(result) {
            const details = {
              data_rows: result && typeof result.dataRowCount === 'number' ? result.dataRowCount : 0,
              ok: result && result.ok === true
            };
            if (result && result.diagnostics && result.diagnostics.stepDurationsMs) {
              const stepMetrics = summarizeStepDurations_(result.diagnostics.stepDurationsMs);
              const keys = Object.keys(stepMetrics);
              for (let i = 0; i < keys.length; i++) {
                details[keys[i]] = stepMetrics[keys[i]];
              }
            }
            return details;
          }
        }
      );
      if (!checklistResult || checklistResult.ok !== true) {
        runCtx.outcome = RUN_OUTCOMES.failedChecklist;
        runCtx.errorCode = RUN_OUTCOMES.failedChecklist;
        updateDailyHomeSummary_(ss, {
          status: 'FAILED',
          runTimestamp: new Date(),
          profileId: profile.profileId,
          checklistRows: 0,
          noReserveRiskRows: 0,
          complianceIssues: 0,
          unknownLocationsQueued: preflight.unknownLocationCount,
          nextStep: 'Checklist refresh failed. Check import and location mappings, then retry.'
        });
        if (!silent) {
          ui.alert('Daily update stopped: checklist refresh did not produce rows.');
        }
        finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
        return { ok: false, reason: RUN_OUTCOMES.failedChecklist, preflight: preflight, checklist: checklistResult };
      }
      runCtx.checklistRows = checklistResult.dataRowCount || 0;
    }

    if (includeCompliance) {
      if (!silent) {
        ss.toast('Running compliance audit...', 'Restock Daily Update', 5);
      }
      complianceResult = runWithStageTiming_(
        runCtx,
        'compliance',
        function() {
          return runComplianceCheck({
            silent: true,
            source: source || 'runDailyUpdate',
            diagnostics: {
              runCtx: runCtx,
              stage: 'compliance'
            }
          });
        },
        {
          ss: ss,
          logStart: true,
          logEnd: true,
          buildEndDetails: function(result) {
            const summary = (result && result.summary) ? result.summary : {};
            const details = {
              ok: result && result.ok === true,
              total_rows_scanned: summary.totalRowsScanned || 0,
              processed_rows_scanned: summary.processedRowsScanned || 0,
              flagged_rows: summary.flaggedRowsCount || 0,
              warning_count: result && result.warnings ? result.warnings.length : 0
            };
            if (result && result.diagnostics && result.diagnostics.stepDurationsMs) {
              const stepMetrics = summarizeStepDurations_(result.diagnostics.stepDurationsMs);
              const keys = Object.keys(stepMetrics);
              for (let i = 0; i < keys.length; i++) {
                details[keys[i]] = stepMetrics[keys[i]];
              }
            }
            return details;
          }
        }
      );
      if (!complianceResult || complianceResult.ok !== true) {
        runCtx.outcome = RUN_OUTCOMES.failedCompliance;
        runCtx.errorCode = RUN_OUTCOMES.failedCompliance;
        updateDailyHomeSummary_(ss, {
          status: 'FAILED',
          runTimestamp: new Date(),
          profileId: profile.profileId,
          checklistRows: runCtx.checklistRows,
          noReserveRiskRows: 0,
          complianceIssues: 0,
          unknownLocationsQueued: preflight.unknownLocationCount,
          nextStep: 'Compliance stage failed. Check configuration and retry.'
        });
        if (!silent) {
          ui.alert('Daily update stopped: compliance stage failed.');
        }
        finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
        return { ok: false, reason: RUN_OUTCOMES.failedCompliance, preflight: preflight, checklist: checklistResult, compliance: complianceResult };
      }
      runCtx.complianceFlagged = complianceResult.summary ? (complianceResult.summary.flaggedRowsCount || 0) : 0;
      runCtx.warningCount += (complianceResult.warnings || []).length;
    }

    const checklistRows = runCtx.checklistRows || 0;
    const flagged = runCtx.complianceFlagged || 0;
    if (!silent) {
      ss.toast('Finalizing outputs...', 'Restock Daily Update', 5);
    }
    const noReserveRisk = runWithStageTiming_(
      runCtx,
      'finalize',
      function() {
        SpreadsheetApp.flush();
        return getNoReserveRiskCount_(ss);
      },
      {
        ss: ss,
        logStart: true,
        logEnd: true,
        buildEndDetails: function(result) {
          return {
            no_reserve_rows: typeof result === 'number' ? result : 0
          };
        }
      }
    );
    runCtx.noReserveRows = noReserveRisk;
    mergeStageCounters_(runCtx, 'finalize', {
      noReserveRows: noReserveRisk
    });
    const nextStep = flagged > 0
      ? 'Open Compliance Alerts and resolve flagged compliance issues first.'
      : (noReserveRisk > 0
        ? 'Review Backstock Alerts, then execute Restock List pulls.'
        : 'Open Restock List and execute pulls.');
    updateDailyHomeSummary_(ss, {
      status: 'COMPLETE',
      runTimestamp: new Date(),
      profileId: profile.profileId,
      checklistRows: checklistRows,
      noReserveRiskRows: noReserveRisk,
      complianceIssues: flagged,
      unknownLocationsQueued: preflight.unknownLocationCount,
      nextStep: nextStep
    });

    runCtx.outcome = RUN_OUTCOMES.success;
    runCtx.errorCode = '';

    const perfThreshold = getPerfWarnThresholdMs_(profile.profileId);
    const currentDurationMs = Math.max(0, Date.now() - runCtx.startedMs);
    if (currentDurationMs > perfThreshold) {
      runCtx.warningCount++;
      runCtx.perfWarn = true;
      appendHealthEvent_(
        ss,
        'PERF_WARN',
        'WARN',
        profile.profileId,
        formatDiagnosticDetail_({
          run_id: runCtx.runId,
          source: runCtx.source,
          stage: 'pipeline',
          duration_ms: currentDurationMs,
          threshold_ms: perfThreshold
        })
      );
    }

    if (!silent) {
      const destination = flagged > 0
        ? getSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.outputSheetName)
        : getSheetByCompatName_(ss, 'Restock List');
      if (destination) {
        ss.setActiveSheet(destination);
      }
      ui.alert(
        'Daily update complete.\n\n' +
        'Profile: ' + profile.profileId + '\n' +
        'Checklist rows: ' + checklistRows + '\n' +
        'Backstock Alerts rows: ' + noReserveRisk + '\n' +
        'Compliance flagged: ' + flagged + '\n' +
        'Unknown locations queued: ' + preflight.unknownLocationCount
      );
    }

    if (signature) {
      props.setProperty(SYSTEM_REFERENCE.props.lastImportRunTs, String(Date.now()));
    }
    logRunStageEvent_(ss, runCtx, 'RUN_COMPLETE', 'INFO', 'pipeline', {
      outcome: RUN_OUTCOMES.success,
      checklist_rows: checklistRows,
      no_reserve_rows: noReserveRisk,
      compliance_flagged: flagged,
      warning_count: runCtx.warningCount
    });
    finalizeRunContext_(ss, runCtx, { persistSuccessSignature: true });

    return {
      ok: true,
      profile: profile,
      preflight: preflight,
      checklist: checklistResult,
      compliance: complianceResult
    };
  } catch (error) {
    Logger.log('runDailyUpdate failed: ' + error);
    runCtx.outcome = RUN_OUTCOMES.failedException;
    runCtx.errorCode = RUN_OUTCOMES.failedException;
    updateDailyHomeSummary_(ss, {
      status: 'FAILED',
      runTimestamp: new Date(),
      profileId: runCtx.profileId || '',
      checklistRows: 0,
      noReserveRiskRows: 0,
      complianceIssues: 0,
      unknownLocationsQueued: 0,
      nextStep: 'Run failed. Use Restock -> Run Daily Update after checking import and permissions.'
    });
    if (!silent) {
      ui.alert('Daily update failed.\n\n' + error);
    }
    logRunStageEvent_(ss, runCtx, 'RUN_EXCEPTION', 'ERROR', 'pipeline', {
      error: String(error)
    });
    finalizeRunContext_(ss, runCtx, { persistSuccessSignature: false });
    return { ok: false, reason: RUN_OUTCOMES.failedException, error: String(error) };
  } finally {
    if (lock) {
      try {
        lock.releaseLock();
      } catch (releaseError) {
        Logger.log('Failed to release document lock: ' + releaseError);
      }
    }
  }
}

function getNoReserveRiskCount_(ss) {
  const sheet = getSheetByCompatName_(ss, 'Backstock Alerts');
  if (!sheet) return 0;
  const startRow = 7;
  const lastRow = Math.max(startRow, sheet.getLastRow());
  const rowCount = Math.max(0, lastRow - startRow + 1);
  if (rowCount === 0) return 0;
  const values = sheet.getRange(startRow, 1, rowCount, 1).getDisplayValues();
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const cell = String(values[i][0] || '').trim();
    if (!cell) break;
    count++;
  }
  return count;
}

function validateRunSchemaGate_(ss, options) {
  const opts = options || {};
  const includeChecklist = opts.includeChecklist !== false;
  const includeCompliance = opts.includeCompliance !== false;
  const result = {
    ok: true,
    blockingIssues: [],
    warnings: [],
    schemaStatus: 'OK',
    configStatus: includeCompliance ? 'OK' : 'SKIPPED'
  };

  const rawSheet = ss.getSheetByName('Treez Valuation (Raw)');
  if (!rawSheet) {
    result.blockingIssues.push('Raw sheet "Treez Valuation (Raw)" is missing.');
  } else {
    const headerRow = CONFIG.rawDataStartRow;
    const lastCol = rawSheet.getLastColumn();
    if (lastCol < 1 || rawSheet.getLastRow() < headerRow) {
      result.blockingIssues.push('Raw sheet header row is missing or empty.');
    } else {
      const headerValues = rawSheet.getRange(headerRow, 1, 1, lastCol).getDisplayValues()[0];

      if (includeChecklist) {
        const checklistCheck = validateChecklistSchema_(headerValues);
        result.warnings = result.warnings.concat(checklistCheck.warnings);
        if (!checklistCheck.ok) {
          result.blockingIssues.push('Checklist schema mismatch: ' + checklistCheck.missing.join(' | '));
        }
      }

      if (includeCompliance) {
        const complianceCheck = validateComplianceSchema_(ss, headerValues);
        result.warnings = result.warnings.concat(complianceCheck.warnings);
        result.configStatus = complianceCheck.configStatus;
        if (!complianceCheck.ok) {
          result.blockingIssues.push('Compliance schema mismatch: ' + complianceCheck.blockingIssues.join(' | '));
        }
      }
    }
  }

  result.ok = result.blockingIssues.length === 0;
  if (!result.ok) {
    result.schemaStatus = 'BLOCKED';
  } else if (result.warnings.length > 0) {
    result.schemaStatus = 'WARN';
  } else {
    result.schemaStatus = 'OK';
  }
  return result;
}

function validateChecklistSchema_(headerValues) {
  const result = {
    ok: true,
    missing: [],
    warnings: []
  };

  for (let i = 0; i < CHECKLIST_SCHEMA_CONTRACT.length; i++) {
    const item = CHECKLIST_SCHEMA_CONTRACT[i];
    const actual = String(headerValues[item.index - 1] || '').trim();
    if (!headerMatchesAnyAlias_(actual, item.aliases)) {
      result.missing.push('col ' + item.index + ' expected [' + item.aliases.join(', ') + '] but found "' + actual + '"');
    }
  }

  result.ok = result.missing.length === 0;
  return result;
}

function validateComplianceSchema_(ss, headerValues) {
  const cfgWarnings = [];
  const cfg = readComplianceConfig_(ss, cfgWarnings);
  const resolveWarnings = [];
  const columns = resolveComplianceColumns_(headerValues, cfg.aliases, resolveWarnings);
  const blockingIssues = [];

  const hasProcessedPath = columns.status >= 0 || columns.location >= 0;
  if (!hasProcessedPath) blockingIssues.push('Status/Location columns not resolved');
  if (columns.qty_on_hand < 0) blockingIssues.push('Qty On Hand column not resolved');
  if (columns.expiration < 0) blockingIssues.push('Expiration column not resolved');
  if (columns.thc.length === 0) blockingIssues.push('No THC column resolved');

  const warnings = cfgWarnings.concat(resolveWarnings);
  return {
    ok: blockingIssues.length === 0,
    blockingIssues: blockingIssues,
    warnings: warnings,
    configStatus: cfgWarnings.length > 0 ? 'WARN' : 'OK'
  };
}

function headerMatchesAnyAlias_(value, aliases) {
  const normalized = normalizeHeader_(value);
  if (!normalized) return false;
  for (let i = 0; i < aliases.length; i++) {
    const token = normalizeHeader_(aliases[i]);
    if (!token) continue;
    if (normalized === token) return true;
  }
  return false;
}

function runRestockPreflight_(ss, activeProfile) {
  const rawSheet = ss.getSheetByName('Treez Valuation (Raw)');
  const settingsSheet = ss.getSheetByName('Restock Settings');
  const profileId = activeProfile && activeProfile.profileId ? activeProfile.profileId : 'UNKNOWN';

  const result = {
    profileId: profileId,
    eligibleRows: 0,
    pickRows: 0,
    reserveRows: 0,
    unknownLocationCount: 0,
    trueUnmappedCount: 0,
    mappedIgnoreCount: 0,
    resolvedClosedCount: 0,
    queueInsertedCount: 0,
    queueUpdatedCount: 0,
    unknownLocationNames: [],
    unknownLocationMap: {},
    licenseDistinctCount: 0,
    dominantLicense: '',
    blocked: false
  };

  if (!rawSheet || !settingsSheet) {
    return result;
  }

  const lastRow = rawSheet.getLastRow();
  if (lastRow < CONFIG.rawDataStartRow + 1) {
    return result;
  }

  const rowCount = lastRow - CONFIG.rawDataStartRow;
  const requiredColCount = Math.max(
    CONFIG.treezColIndex.receivingLicense,
    CONFIG.treezColIndex.inventoryType,
    CONFIG.treezColIndex.productType,
    CONFIG.treezColIndex.available,
    CONFIG.treezColIndex.location
  );
  const data = rawSheet.getRange(CONFIG.rawDataStartRow + 1, 1, rowCount, requiredColCount).getValues();
  const roleMap = getLocationRoleMapFromSettings_(settingsSheet);
  const allowedTypes = new Set(CONFIG.allowedProductTypes.map(t => t.toUpperCase()));
  const licenseCounts = {};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const inventoryType = String(row[CONFIG.treezColIndex.inventoryType - 1] || '').toUpperCase().trim();
    const productType = String(row[CONFIG.treezColIndex.productType - 1] || '').toUpperCase().trim();
    const available = parseFloat(row[CONFIG.treezColIndex.available - 1] || 0);
    if (inventoryType !== 'ADULT' || !(available > 0) || !allowedTypes.has(productType)) {
      continue;
    }

    result.eligibleRows++;
    const receivingLicense = normalizeToken_(row[CONFIG.treezColIndex.receivingLicense - 1]);
    if (receivingLicense) {
      licenseCounts[receivingLicense] = (licenseCounts[receivingLicense] || 0) + 1;
    }
    const location = String(row[CONFIG.treezColIndex.location - 1] || '').toUpperCase().trim();
    const role = roleMap[location];

    if (role === 'PICK SHELF') {
      result.pickRows++;
    } else if (role === 'RESERVE') {
      result.reserveRows++;
    } else if (role === 'IGNORE') {
      // Explicitly mapped staging/hold locations are expected and should not be treated as unknown.
      result.mappedIgnoreCount++;
      continue;
    } else {
      result.trueUnmappedCount++;
      if (!result.unknownLocationMap[location]) {
        result.unknownLocationMap[location] = 0;
      }
      result.unknownLocationMap[location]++;
    }
  }

  const queueAppend = appendLocationReviewQueue_(ss, profileId, result.unknownLocationMap);
  const queueClose = closeResolvedLocationQueueItems_(ss, profileId, roleMap);
  result.queueInsertedCount = queueAppend.insertedCount || 0;
  result.queueUpdatedCount = queueAppend.updatedCount || 0;
  result.resolvedClosedCount = queueClose.closedCount || 0;
  const licenses = Object.keys(licenseCounts).sort((a, b) => licenseCounts[b] - licenseCounts[a]);
  result.licenseDistinctCount = licenses.length;
  result.dominantLicense = licenses.length > 0 ? licenses[0] : '';
  result.unknownLocationNames = Object.keys(result.unknownLocationMap).sort();
  result.unknownLocationCount = result.trueUnmappedCount;
  result.blocked = result.eligibleRows > 0 && result.pickRows > 0 && result.reserveRows === 0;
  return result;
}

function getLocationRoleMapFromSettings_(settingsSheet) {
  const map = {};
  const startRow = parseInt(settingsSheet.getRange('N1').getValue(), 10) || 5;
  const endRow = parseInt(settingsSheet.getRange('N2').getValue(), 10) || (startRow - 1);
  if (endRow < startRow) {
    return map;
  }

  const rows = settingsSheet.getRange(startRow, 1, endRow - startRow + 1, 3).getValues();
  for (let i = 0; i < rows.length; i++) {
    const locationName = String(rows[i][0] || '').toUpperCase().trim();
    if (!locationName) continue;
    const role = String(rows[i][1] || 'IGNORE').toUpperCase().trim();
    const include = parseBooleanWithFallback_(rows[i][2], false);
    if (!include || role === 'IGNORE') {
      map[locationName] = 'IGNORE';
    } else if (role === 'PICK SHELF' || role === 'RESERVE') {
      map[locationName] = role;
    } else {
      map[locationName] = 'IGNORE';
    }
  }
  return map;
}

function appendLocationReviewQueue_(ss, profileId, unknownLocationMap) {
  const locationCounts = unknownLocationMap || {};
  const unknownLocations = Object.keys(locationCounts).filter(k => k);
  if (unknownLocations.length === 0) {
    return {
      insertedCount: 0,
      updatedCount: 0
    };
  }

  const sheet = getSystemReferenceSheet_(ss);
  const lastRow = Math.max(2, sheet.getLastRow());
  const existing = sheet.getRange(2, 14, lastRow - 1, 8).getValues();
  const closedStatuses = { MAPPED: true, IGNORED: true, CLOSED: true };
  const openMap = {};
  for (let i = 0; i < existing.length; i++) {
    const p = String(existing[i][1] || '').toUpperCase().trim();
    const loc = String(existing[i][2] || '').toUpperCase().trim();
    const status = String(existing[i][4] || '').toUpperCase().trim();
    if (!p || !loc || closedStatuses[status]) continue;

    const key = p + '|' + loc;
    openMap[key] = {
      rowNumber: i + 2,
      seenCount: parseInt(existing[i][6], 10) || 0,
      firstSeen: existing[i][5]
    };
  }

  const rowsToAppend = [];
  let updatedCount = 0;
  const runTs = new Date();
  const profileToken = String(profileId || '').toUpperCase().trim();
  for (let i = 0; i < unknownLocations.length; i++) {
    const loc = String(unknownLocations[i] || '').toUpperCase().trim();
    if (!loc) continue;

    const count = parseInt(locationCounts[loc], 10);
    const seenIncrement = isNaN(count) || count < 1 ? 1 : count;
    const key = profileToken + '|' + loc;
    const existingOpen = openMap[key];
    if (existingOpen) {
      const nextCount = existingOpen.seenCount + seenIncrement;
      if (!existingOpen.firstSeen) {
        sheet.getRange(existingOpen.rowNumber, 19).setValue(runTs); // first_seen_ts
      }
      sheet.getRange(existingOpen.rowNumber, 20).setValue(nextCount); // seen_count
      sheet.getRange(existingOpen.rowNumber, 21).setValue(runTs); // last_seen_ts
      updatedCount++;
      continue;
    }

    rowsToAppend.push([
      runTs, // run_ts
      profileToken,
      loc,
      inferSuggestedRoleForLocation_(loc),
      'NEW',
      runTs, // first_seen_ts
      seenIncrement,
      runTs // last_seen_ts
    ]);
  }

  if (rowsToAppend.length > 0) {
    const appendStart = sheet.getLastRow() + 1;
    sheet.getRange(appendStart, 14, rowsToAppend.length, 8).setValues(rowsToAppend);
  }
  return {
    insertedCount: rowsToAppend.length,
    updatedCount: updatedCount
  };
}

function closeResolvedLocationQueueItems_(ss, profileId, roleMap) {
  const profileToken = String(profileId || '').toUpperCase().trim();
  if (!profileToken || !roleMap) {
    return {
      closedCount: 0,
      mappedCount: 0,
      ignoredCount: 0
    };
  }

  const sheet = getSystemReferenceSheet_(ss);
  const lastRow = Math.max(2, sheet.getLastRow());
  if (lastRow < 2) {
    return {
      closedCount: 0,
      mappedCount: 0,
      ignoredCount: 0
    };
  }

  const rows = sheet.getRange(2, 14, lastRow - 1, 8).getValues();
  const now = new Date();
  let closedCount = 0;
  let mappedCount = 0;
  let ignoredCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const rowProfile = String(rows[i][1] || '').toUpperCase().trim();
    const location = String(rows[i][2] || '').toUpperCase().trim();
    const status = String(rows[i][4] || '').toUpperCase().trim();
    if (rowProfile !== profileToken) continue;
    if (!location) continue;
    if (status && status !== 'NEW' && status !== 'OPEN') continue;

    const mappedRole = String(roleMap[location] || '').toUpperCase().trim();
    if (!mappedRole) continue;

    const resolvedStatus = mappedRole === 'IGNORE' ? 'IGNORED' : 'MAPPED';
    sheet.getRange(rowNumber, 17).setValue(mappedRole); // suggested_role
    sheet.getRange(rowNumber, 18).setValue(resolvedStatus); // status
    sheet.getRange(rowNumber, 21).setValue(now); // last_seen_ts
    closedCount++;
    if (resolvedStatus === 'MAPPED') {
      mappedCount++;
    } else {
      ignoredCount++;
    }
  }
  return {
    closedCount: closedCount,
    mappedCount: mappedCount,
    ignoredCount: ignoredCount
  };
}

function inferSuggestedRoleForLocation_(locationName) {
  const loc = String(locationName || '').toUpperCase().trim();
  if (loc === 'SALES FLOOR') return 'PICK SHELF';
  if (SYSTEM_REFERENCE.ignoreSuggestRegex.test(loc)) return 'IGNORE';
  return 'RESERVE';
}

function installAutoRun() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'handleSpreadsheetChange') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('handleSpreadsheetChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();

  ui.alert('Auto-run installed. Imports to the raw tab will trigger Daily Update when signature changes.');
}

function disableAutoRun() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'handleSpreadsheetChange') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  ui.alert('Auto-run disabled. Removed triggers: ' + removed);
}

function handleSpreadsheetChange(e) {
  try {
    if (!e || !e.changeType) return;
    const changeType = String(e.changeType || '').toUpperCase();
    const allowedTypes = {
      OTHER: true,
      INSERT_ROW: true,
      INSERT_GRID: true
    };
    if (!allowedTypes[changeType]) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const signature = computeRawImportSignature_(ss);
    if (!signature) return;
    const profile = resolveActiveStoreProfile_(ss, {
      allowOverride: true,
      useRawData: true,
      signature: signature
    });
    if (!profile.autoRunEnabled) return;

    const props = PropertiesService.getDocumentProperties();
    const previousSignature = props.getProperty(SYSTEM_REFERENCE.props.lastSuccessSignature) || '';
    const previousTs = parseInt(props.getProperty(SYSTEM_REFERENCE.props.lastImportRunTs) || '0', 10);
    const nowTs = Date.now();
    if (signature === previousSignature) {
      // Keep duplicate attempts lightweight; lock/outcome logging still occurs when run is entered manually.
      return;
    }

    // Short throttle for clustered change events.
    if ((nowTs - previousTs) < 5000) {
      return;
    }

    props.setProperty(SYSTEM_REFERENCE.props.lastImportRunTs, String(nowTs));

    runDailyUpdate_({
      includeChecklist: true,
      includeCompliance: true,
      silent: true,
      source: 'auto_trigger',
      signature: signature
    });
  } catch (error) {
    Logger.log('handleSpreadsheetChange failed: ' + error);
  }
}

function computeRawImportSignature_(ss) {
  const rawSheet = ss.getSheetByName('Treez Valuation (Raw)');
  if (!rawSheet) return '';

  const dataStartRow = CONFIG.rawDataStartRow + 1;
  const lastRow = rawSheet.getLastRow();
  const lastCol = rawSheet.getLastColumn();
  if (lastRow < dataStartRow || lastCol < 2) return '';

  const rowCount = lastRow - dataStartRow + 1;
  const firstDate = rawSheet.getRange(dataStartRow, 1).getDisplayValue();
  const firstTime = rawSheet.getRange(dataStartRow, 2).getDisplayValue();
  const profilePart = getQuickLicenseSignatureToken_(rawSheet, dataStartRow, lastRow, lastCol);

  return [rowCount, firstDate, firstTime, profilePart, lastCol].join('|');
}

function getQuickLicenseSignatureToken_(rawSheet, dataStartRow, lastRow, lastCol) {
  if (!rawSheet || lastRow < dataStartRow || lastCol < 1) return '';

  const headerRow = CONFIG.rawDataStartRow;
  const headers = rawSheet.getRange(headerRow, 1, 1, lastCol).getDisplayValues()[0];
  let receivingLicenseCol = -1;
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader_(headers[i]) === 'receivinglicense') {
      receivingLicenseCol = i + 1;
      break;
    }
  }
  if (receivingLicenseCol < 1) return '';

  const sampleRowCount = Math.min(50, lastRow - dataStartRow + 1);
  if (sampleRowCount < 1) return '';

  const values = rawSheet.getRange(dataStartRow, receivingLicenseCol, sampleRowCount, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    const token = normalizeToken_(values[i][0]);
    if (token) {
      return token;
    }
  }
  return '';
}

// ============================================================================
// REFRESH CHECKLIST - Run after each import
// ============================================================================

/**
 * Dynamically sets up the Restock Checklist based on actual data rows.
 * Run this after importing new Treez data to:
 * - Apply stocking rules to match products to Target/Warning/Critical values
 * - Add checkboxes and dropdowns for exactly the rows that have data
 * - Apply borders and formatting to the data area
 * - Hide empty rows below the data
 * 
 * Can be run manually or triggered automatically.
 */
function refreshChecklist(options) {
  const opts = options || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheet = getSheetByCompatName_(ss, 'Restock List');
  const settingsSheet = ss.getSheetByName('Restock Settings');
  const docProps = PropertiesService.getDocumentProperties();
  const diagnostics = opts.diagnostics || null;
  const stepDurations = {};
  const metrics = {
    rowsScanned: 0,
    dataRows: 0,
    clearRange: 0,
    previousRows: 0,
    rulesShortcutApplied: false,
    rowsChanged: 0
  };
  
  if (!sheet) {
    emitDiagnosticsCheckpoint_(ss, diagnostics, 'CHECKLIST_ABORT', 'ERROR', {
      reason: 'MISSING_CHECKLIST_SHEET'
    });
    if (!opts.silent) {
      ui.alert('Restock List tab not found. Run main() first.');
    }
    return {
      ok: false,
      reason: 'MISSING_CHECKLIST_SHEET',
      diagnostics: {
        stepDurationsMs: stepDurations,
        metrics: metrics
      }
    };
  }

  ensureDailyHomeTab_(ss);
  ensureChecklistViewConfig_(ss);
  ensureNoReserveRiskTab_(ss);
  emitDiagnosticsCheckpoint_(ss, diagnostics, 'CHECKLIST_PROGRESS', 'INFO', {
    phase: 'start',
    skip_preflight: opts.skipPreflight === true
  });

  const rawSignature = String(opts.runSignature || computeRawImportSignature_(ss) || '');
  const rulesSignature = computeStockingRulesSignature_(settingsSheet);
  const previousRawSignature = docProps.getProperty(SYSTEM_REFERENCE.props.lastChecklistRawSignature) || '';
  const previousRulesSignature = docProps.getProperty(SYSTEM_REFERENCE.props.lastChecklistRulesSignature) || '';
  const rulesShortcutApplied =
    opts.forceReapplyRules !== true &&
    !!rawSignature &&
    rawSignature === previousRawSignature &&
    !!rulesSignature &&
    rulesSignature === previousRulesSignature;
  metrics.rulesShortcutApplied = rulesShortcutApplied;

  let preflight = null;
  let activeProfile = null;
  if (!opts.skipPreflight) {
    activeProfile = runTimedStep_(stepDurations, 'preflight_profile_resolve', function() {
      return resolveActiveStoreProfile_(ss, {
        allowOverride: true,
        useRawData: true,
        signature: rawSignature
      });
    });
    runTimedStep_(stepDurations, 'preflight_location_sync', function() {
      return syncLocationRolesForProfile_(ss, activeProfile.profileId, { source: 'refreshChecklist' });
    });
    preflight = runTimedStep_(stepDurations, 'preflight_check', function() {
      return runRestockPreflight_(ss, activeProfile);
    });

    if (preflight.blocked) {
      emitDiagnosticsCheckpoint_(ss, diagnostics, 'CHECKLIST_ABORT', 'WARN', {
        reason: 'PREFLIGHT_BLOCKED',
        profile_id: preflight.profileId,
        eligible_rows: preflight.eligibleRows,
        pick_rows: preflight.pickRows,
        reserve_rows: preflight.reserveRows,
        unknown_locations: preflight.unknownLocationCount
      });
      if (!opts.silent) {
        ui.alert(
          'Checklist run blocked.\n\n' +
          'Profile: ' + preflight.profileId + '\n' +
          'Eligible rows: ' + preflight.eligibleRows + '\n' +
          'Pick rows: ' + preflight.pickRows + '\n' +
          'Reserve rows: ' + preflight.reserveRows + '\n' +
          'Unknown locations: ' + preflight.unknownLocationCount + '\n\n' +
          'Reason: reserve coverage is effectively zero. Update location mappings in System_Reference.'
        );
      }
      return {
        ok: false,
        reason: 'PREFLIGHT_BLOCKED',
        preflight: preflight,
        diagnostics: {
          stepDurationsMs: stepDurations,
          metrics: metrics
        }
      };
    }
  }
  
  // Apply stocking rules first (populates Target/Warning/Critical in Engine)
  Logger.log('Applying stocking rules...');
  if (rulesShortcutApplied) {
    runTimedStep_(stepDurations, 'apply_stocking_rules', function() {
      // Steady-state shortcut: rules + import signature unchanged, so keep previous rule output.
      return;
    });
  } else {
    runTimedStep_(stepDurations, 'apply_stocking_rules', function() {
      applyStockingRules();
    });
    runTimedStep_(stepDurations, 'post_rules_flush', function() {
      SpreadsheetApp.flush();
    });
    if (rawSignature) {
      docProps.setProperty(SYSTEM_REFERENCE.props.lastChecklistRawSignature, rawSignature);
    }
    if (rulesSignature) {
      docProps.setProperty(SYSTEM_REFERENCE.props.lastChecklistRulesSignature, rulesSignature);
    }
  }
  emitDiagnosticsCheckpoint_(ss, diagnostics, 'CHECKLIST_PROGRESS', 'INFO', {
    phase: 'stocking_rules_complete',
    apply_stocking_rules_ms: stepDurations.apply_stocking_rules || 0,
    post_rules_flush_ms: stepDurations.post_rules_flush || 0,
    rules_shortcut_applied: rulesShortcutApplied
  });
  
  const dataStartRow = 3;
  const headerRow = 2;
  
  // Count actual data rows by checking column A (Urgency) in a bounded range.
  const lastUsedRow = runTimedStep_(stepDurations, 'resolve_last_used_row', function() {
    return Math.max(dataStartRow, sheet.getLastRow());
  });
  const rowsToScan = Math.max(0, lastUsedRow - dataStartRow + 1);
  metrics.rowsScanned = rowsToScan;
  const urgencyCol = runTimedStep_(stepDurations, 'read_urgency_column', function() {
    return rowsToScan > 0
      ? sheet.getRange(dataStartRow, 1, rowsToScan, 1).getDisplayValues()
      : [];
  });
  const dataRowCount = runTimedStep_(stepDurations, 'count_data_rows', function() {
    let count = 0;
    for (let i = 0; i < urgencyCol.length; i++) {
      if (urgencyCol[i][0] === '' || urgencyCol[i][0] === null) break;
      count++;
    }
    return count;
  });
  metrics.dataRows = dataRowCount;
  metrics.rowsTotal = rowsToScan;
  emitDiagnosticsCheckpoint_(ss, diagnostics, 'CHECKLIST_PROGRESS', 'INFO', {
    phase: 'row_count_complete',
    rows_scanned: rowsToScan,
    data_rows: dataRowCount
  });
  
  if (dataRowCount === 0) {
    emitDiagnosticsCheckpoint_(ss, diagnostics, 'CHECKLIST_ABORT', 'WARN', {
      reason: 'NO_CHECKLIST_ROWS',
      rows_scanned: rowsToScan
    });
    if (!opts.silent) {
      ui.alert(
        'No data found in Restock List.\n\n' +
        'Make sure you:\n' +
        '1. Imported CSV to "Treez Valuation (Raw)" tab\n' +
        '2. Raw header row is 6 and data starts at row 7\n' +
        '3. Location mappings are synced for the active store profile'
      );
    }
    return {
      ok: false,
      reason: 'NO_CHECKLIST_ROWS',
      preflight: preflight,
      diagnostics: {
        stepDurationsMs: stepDurations,
        metrics: metrics
      }
    };
  }
  
  Logger.log('Found ' + dataRowCount + ' products needing restock');
  const lastChecklistRowsProp = docProps.getProperty(SYSTEM_REFERENCE.props.lastChecklistRows);
  const previousRows = parseInt(lastChecklistRowsProp || '0', 10);
  const previousRowsSafe = isNaN(previousRows) ? 0 : previousRows;
  const hasPriorState = lastChecklistRowsProp !== null;
  const structuralRefreshNeeded = !hasPriorState || previousRowsSafe !== dataRowCount || opts.forceChecklistStructure === true;
  metrics.previousRows = previousRowsSafe;
  metrics.structuralRefresh = structuralRefreshNeeded;

  // Reset checkbox values every run; only rebuild validation/formatting when structure changes.
  const clearRange = Math.max(200, dataRowCount, previousRowsSafe);
  metrics.clearRange = clearRange;
  runTimedStep_(stepDurations, 'reset_done_column', function() {
    sheet.getRange(dataStartRow, 15, clearRange, 1).clearContent(); // Clear checkbox values
  });

  if (structuralRefreshNeeded) {
    runTimedStep_(stepDurations, 'clear_validation_ranges', function() {
      sheet.getRange(dataStartRow, 14, clearRange, 1).clearDataValidations(); // Status column
      sheet.getRange(dataStartRow, 15, clearRange, 1).clearDataValidations(); // Done column (removes checkboxes)
    });
    
    // Add data validation for Restock Status column (exactly dataRowCount rows)
    runTimedStep_(stepDurations, 'apply_validation_controls', function() {
      const statusValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.restockStatusOptions, true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(dataStartRow, 14, dataRowCount, 1).setDataValidation(statusValidation);
      
      // Add checkboxes for Done column (exactly dataRowCount rows)
      sheet.getRange(dataStartRow, 15, dataRowCount, 1).insertCheckboxes();
    });
    
    runTimedStep_(stepDurations, 'apply_grid_formatting', function() {
      // Apply full grid borders to all data cells
      const numCols = CONFIG.checklistColumns.length;
      const dataRange = sheet.getRange(dataStartRow, 1, dataRowCount, numCols);
      
      // Full grid - borders around every cell
      dataRange.setBorder(true, true, true, true, true, true, 
        CONFIG.colors.border, SpreadsheetApp.BorderStyle.SOLID);
      
      // Thicker borders between column groups for visual separation
      const borderRows = dataRowCount + 1; // header + data
      
      // Border after Identity (col 6)
      sheet.getRange(headerRow, 6, borderRows, 1).setBorder(null, null, null, true, null, null, CONFIG.colors.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      
      // Border after Stock (col 9)
      sheet.getRange(headerRow, 9, borderRows, 1).setBorder(null, null, null, true, null, null, CONFIG.colors.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      
      // Border after Pull Plan (col 12)
      sheet.getRange(headerRow, 12, borderRows, 1).setBorder(null, null, null, true, null, null, CONFIG.colors.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      
      // Border after Execution (col 16)
      sheet.getRange(headerRow, 16, borderRows, 1).setBorder(null, null, null, true, null, null, CONFIG.colors.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      
      // Set column alignments in batches to reduce API calls.
      const dataEndRow = dataStartRow + dataRowCount - 1;
      const leftAlignCols = [2, 3, 4, 5, 6, 11, 12, 16];
      const centerAlignCols = [1, 7, 8, 9, 10, 13, 14, 15, 17, 18];
      const leftRanges = leftAlignCols.map(col => {
        const letter = columnToLetter_(col);
        return letter + dataStartRow + ':' + letter + dataEndRow;
      });
      const centerRanges = centerAlignCols.map(col => {
        const letter = columnToLetter_(col);
        return letter + dataStartRow + ':' + letter + dataEndRow;
      });
      sheet.getRangeList(leftRanges).setHorizontalAlignment('left');
      sheet.getRangeList(centerRanges).setHorizontalAlignment('center');
    });
    
    runTimedStep_(stepDurations, 'update_row_visibility', function() {
      // Update row visibility with diff logic to avoid expensive full show/hide cycles.
      const lastMaxRow = sheet.getMaxRows();

      if (!hasPriorState) {
        if (lastMaxRow > dataStartRow) {
          sheet.showRows(dataStartRow, lastMaxRow - dataStartRow + 1);
        }
        const firstEmptyRow = dataStartRow + dataRowCount;
        const rowsToHide = lastMaxRow - firstEmptyRow + 1;
        if (rowsToHide > 0 && firstEmptyRow <= lastMaxRow) {
          sheet.hideRows(firstEmptyRow, rowsToHide);
        }
      } else if (previousRowsSafe !== dataRowCount) {
        const prevFirstEmpty = dataStartRow + previousRowsSafe;
        const newFirstEmpty = dataStartRow + dataRowCount;
        if (newFirstEmpty > prevFirstEmpty) {
          const rowsToShow = Math.min(lastMaxRow, newFirstEmpty - 1) - prevFirstEmpty + 1;
          if (rowsToShow > 0 && prevFirstEmpty <= lastMaxRow) {
            sheet.showRows(prevFirstEmpty, rowsToShow);
          }
        } else {
          const rowsToHide = Math.min(lastMaxRow, prevFirstEmpty - 1) - newFirstEmpty + 1;
          if (rowsToHide > 0 && newFirstEmpty <= lastMaxRow) {
            sheet.hideRows(newFirstEmpty, rowsToHide);
          }
        }
      }
    });
  }
  runTimedStep_(stepDurations, 'persist_last_row_count', function() {
    docProps.setProperty(SYSTEM_REFERENCE.props.lastChecklistRows, String(dataRowCount));
  });
  metrics.rowsChanged = dataRowCount;
  
  Logger.log('Checklist refreshed: ' + dataRowCount + ' rows active');
  const detail = {
    data_rows: dataRowCount,
    rows_scanned: metrics.rowsScanned,
    clear_range: clearRange,
    previous_rows: previousRowsSafe,
    structural_refresh: structuralRefreshNeeded,
    rules_shortcut_applied: metrics.rulesShortcutApplied === true
  };
  const stepMetrics = summarizeStepDurations_(stepDurations);
  const stepKeys = Object.keys(stepMetrics);
  for (let i = 0; i < stepKeys.length; i++) {
    detail[stepKeys[i]] = stepMetrics[stepKeys[i]];
  }
  emitDiagnosticsCheckpoint_(ss, diagnostics, 'CHECKLIST_DETAIL', 'INFO', detail);
  if (!opts.silent) {
    ui.alert('Checklist refreshed!\n\n' + dataRowCount + ' products ready for restock.');
  }
  return {
    ok: true,
    dataRowCount: dataRowCount,
    preflight: preflight,
    profileId: activeProfile ? activeProfile.profileId : '',
    diagnostics: {
      stepDurationsMs: stepDurations,
      metrics: metrics
    }
  };
}

/**
 * Creates a custom menu for easy access to restock functions
 */
function onOpen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const storedMode = getStoredWorkspaceModeSafe_();
  migrateLegacyTabNames_(ss);
  addRestockMenu_(storedMode);

  // Keep initialization best-effort so menu creation is never blocked.
  try {
    ensureDailyHomeTab_(ss);
    ensureNoReserveRiskTab_(ss);
    ensureSystemDiagnosticsTab_(ss);
    ensureAIDiagnosticsTab_(ss);
    ensureChecklistViewConfig_(ss);
    refreshDailyHomeHealthFromState_(ss);
    applyWorkspaceView_(ss, storedMode, { silent: true, persist: false });
  } catch (error) {
    Logger.log('onOpen post-menu setup warning: ' + error);
  }
}

function getStoredWorkspaceModeSafe_() {
  try {
    const docProps = PropertiesService.getDocumentProperties();
    return parseEnumWithFallback_(
      docProps.getProperty(SYSTEM_REFERENCE.props.uiMode) || 'STANDARD',
      CONFIG.workspaceModes,
      'STANDARD'
    );
  } catch (error) {
    Logger.log('Workspace mode unavailable in current context: ' + error);
    return 'STANDARD';
  }
}

function addRestockMenu_(storedMode) {
  const ui = SpreadsheetApp.getUi();
  const checklistViewMenu = ui.createMenu('Checklist View')
    .addItem('Priority Order', 'setChecklistViewPriority')
    .addItem('Location Wave', 'setChecklistViewLocationWave');
  const workspaceMenu = ui.createMenu('Workspace View')
    .addItem('Standard User', 'setStandardUserView')
    .addItem('Manager', 'setManagerView');

  const menu = ui.createMenu('Restock')
    .addItem('Open Home', 'openDailyHome')
    .addSeparator()
    .addItem('Run Daily Update', 'runDailyUpdate')
    .addSeparator()
    .addItem('Run Checklist Only', 'runChecklistOnly')
    .addItem('Run Compliance Only', 'runComplianceOnly')
    .addSubMenu(checklistViewMenu)
    .addSubMenu(workspaceMenu)
    .addSeparator()
    .addItem('Install Auto-Run', 'installAutoRun')
    .addItem('Disable Auto-Run', 'disableAutoRun')
    .addSeparator()
    .addItem('Clear Compliance Output', 'clearComplianceOutput')
    .addSeparator()
    .addItem('Clear Import Data', 'clearImportData')
    .addItem('Reset to Defaults', 'main');

  if (storedMode === 'MANAGER') {
    menu
      .addSeparator()
      .addItem('Run System Check', 'runSystemCheck')
      .addItem('Open Diagnostics', 'openDiagnostics')
      .addItem('Open AI Diagnostics', 'openAIDiagnostics')
      .addItem('Generate AI Perf Packet', 'generateAIPerfPacket');
  }

  menu.addToUi();
}

function repairRestockMenu() {
  onOpen();
  SpreadsheetApp.getUi().alert(
    'Restock menu refresh attempted.\n\n' +
    'If it is still missing:\n' +
    '1. Reload the spreadsheet tab.\n' +
    '2. In Apps Script, run main() once and approve permissions.\n' +
    '3. Reload the spreadsheet again.'
  );
}

function setStandardUserView() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mode = applyWorkspaceView_(ss, 'STANDARD', { silent: false, persist: true });
  onOpen();
  SpreadsheetApp.getUi().alert('Workspace view set to ' + mode + '.');
}

function setManagerView() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mode = applyWorkspaceView_(ss, 'MANAGER', { silent: false, persist: true });
  onOpen();
  SpreadsheetApp.getUi().alert('Workspace view set to ' + mode + '.');
}

function applyWorkspaceView_(ss, mode, options) {
  const opts = options || {};
  const targetMode = parseEnumWithFallback_(mode, CONFIG.workspaceModes, 'STANDARD');
  const showForStandard = {
    'Home': true,
    'Start Here': true,
    'Treez Valuation (Raw)': true,
    'Restock List': true,
    'Backstock Alerts': true,
    'Compliance Alerts': true
  };
  const managerOnlySheets = {
    'Restock Settings': true,
    'Data Watchlist': true,
    'Compliance Config': true,
    'Compliance History': true,
    'System_Reference': true,
    'System_Diagnostics': true,
    'AI_Diagnostics': true
  };
  const alwaysHidden = {
    'Restock Engine (Internal)': true
  };

  const activeSheet = ss.getActiveSheet();
  if (targetMode === 'STANDARD' && activeSheet && !showForStandard[preferredTabName_(activeSheet.getName())]) {
    const homeSheet = getSheetByCompatName_(ss, 'Home');
    if (homeSheet) {
      ss.setActiveSheet(homeSheet);
    }
  }

  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const name = preferredTabName_(sheet.getName());

    if (alwaysHidden[name]) {
      sheet.hideSheet();
      continue;
    }

    if (targetMode === 'STANDARD') {
      if (managerOnlySheets[name]) {
        sheet.hideSheet();
      } else {
        sheet.showSheet();
      }
    } else {
      if (managerOnlySheets[name] || showForStandard[name]) {
        sheet.showSheet();
      }
    }
  }

  if (opts.persist !== false) {
    PropertiesService.getDocumentProperties().setProperty(SYSTEM_REFERENCE.props.uiMode, targetMode);
  }
  return targetMode;
}

function openDiagnostics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSystemDiagnosticsTab_(ss);
  const sheet = ss.getSheetByName(DIAGNOSTICS.sheetName);
  if (sheet) {
    ss.setActiveSheet(sheet);
  }
}

function openAIDiagnostics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureAIDiagnosticsTab_(ss);
  const sheet = ss.getSheetByName(AI_DIAGNOSTICS.sheetName);
  if (sheet) {
    sheet.showSheet();
    ss.setActiveSheet(sheet);
  }
}

function generateAIPerfPacket() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureAIDiagnosticsTab_(ss);
  const sheet = ss.getSheetByName(AI_DIAGNOSTICS.sheetName);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) {
    ui.alert('AI diagnostics tab not found.');
    return { ok: false, reason: 'MISSING_AI_DIAGNOSTICS' };
  }

  const summaryRows = readAITableRows_(sheet, AI_DIAGNOSTICS.runSummaryStartCol, AI_DIAGNOSTICS.runSummaryHeaders.length);
  if (summaryRows.length === 0) {
    ui.alert('No AI diagnostics runs available yet.');
    return { ok: false, reason: 'NO_RUNS' };
  }
  const latest = summaryRows[summaryRows.length - 1];

  const queueRows = readAITableRows_(sheet, AI_DIAGNOSTICS.queueHealthStartCol, AI_DIAGNOSTICS.queueHealthHeaders.length);
  let latestQueue = null;
  if (queueRows.length > 0) {
    latestQueue = queueRows[queueRows.length - 1];
  }

  const stageRows = readAITableRows_(sheet, AI_DIAGNOSTICS.stageStepsStartCol, AI_DIAGNOSTICS.stageStepHeaders.length);
  const latestRunId = String(latest[0] || '').trim();
  const latestRunSteps = [];
  for (let i = 0; i < stageRows.length; i++) {
    const row = stageRows[i];
    if (String(row[0] || '').trim() !== latestRunId) continue;
    const stepName = String(row[4] || '').trim();
    if (!stepName || stepName === '__unaccounted__') continue;
    latestRunSteps.push({
      stage: String(row[3] || ''),
      step: stepName,
      durationMs: parseInt(row[5], 10) || 0
    });
  }
  latestRunSteps.sort(function(a, b) {
    return b.durationMs - a.durationMs;
  });

  const hotspotRows = sheet.getRange(2, AI_DIAGNOSTICS.hotspotsStartCol, 5, AI_DIAGNOSTICS.hotspotsHeaders.length).getDisplayValues();
  const hotspotLines = [];
  for (let i = 0; i < hotspotRows.length; i++) {
    const row = hotspotRows[i];
    if (!String(row[0] || '').trim()) continue;
    hotspotLines.push((i + 1) + '. ' + row[0] + ' :: ' + row[1] + ' | avg=' + row[2] + 'ms | max=' + row[3] + 'ms | n=' + row[4]);
  }

  const packetLines = [];
  packetLines.push('AI PERF PACKET');
  packetLines.push('Run ID: ' + latest[0]);
  packetLines.push('Profile: ' + latest[5] + ' | Source: ' + latest[4]);
  packetLines.push('Outcome: ' + latest[7] + ' | Duration: ' + latest[3] + ' ms | Perf Warn: ' + latest[10]);
  packetLines.push('Signature: ' + latest[6]);
  packetLines.push('Stage totals (ms): profile_resolve=' + latest[17] + ', schema_gate=' + latest[18] + ', location_sync=' + latest[19] + ', preflight=' + latest[20] + ', checklist=' + latest[21] + ', compliance=' + latest[22] + ', finalize=' + latest[23] + ', other=' + latest[24]);
  packetLines.push('Counts: checklist_rows=' + latest[11] + ', no_reserve_rows=' + latest[12] + ', compliance_flagged=' + latest[13]);
  if (latestQueue) {
    packetLines.push('Queue health: true_unmapped=' + latestQueue[3] + ', mapped_ignore=' + latestQueue[4] + ', resolved_closed=' + latestQueue[5] + ', open_queue=' + latestQueue[6]);
    if (String(latestQueue[7] || '').trim()) {
      packetLines.push('Unknown locations: ' + latestQueue[7]);
    }
  }
  packetLines.push('Top stage/step timings (latest run):');
  if (latestRunSteps.length === 0) {
    packetLines.push('1. No step-level rows for latest run.');
  } else {
    const maxSteps = Math.min(5, latestRunSteps.length);
    for (let i = 0; i < maxSteps; i++) {
      const item = latestRunSteps[i];
      packetLines.push((i + 1) + '. ' + item.stage + ' :: ' + item.step + ' = ' + item.durationMs + 'ms');
    }
  }
  packetLines.push('Top hotspots (last 30 runs):');
  if (hotspotLines.length === 0) {
    packetLines.push('1. No hotspot data yet.');
  } else {
    for (let i = 0; i < hotspotLines.length; i++) {
      packetLines.push(hotspotLines[i]);
    }
  }

  const packetText = packetLines.join('\n');
  const packetCell = sheet.getRange(AI_DIAGNOSTICS.perfPacketCell);
  packetCell.setValue(packetText);
  packetCell.setWrap(true);
  sheet.showSheet();
  ss.setActiveSheet(sheet);

  ui.alert('AI Perf Packet generated in ' + AI_DIAGNOSTICS.sheetName + '!' + AI_DIAGNOSTICS.perfPacketCell + '.');
  return {
    ok: true,
    runId: latest[0],
    profileId: latest[5]
  };
}

function runSystemCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  ensureDailyHomeTab_(ss);
  ensureSystemDiagnosticsTab_(ss);
  ensureAIDiagnosticsTab_(ss);

  const checks = [];
  const triggerStatus = getTriggerStatus_(ss);
  checks.push('Trigger: ' + triggerStatus);

  const settingsSheet = ss.getSheetByName('Restock Settings');
  let configIntegrity = 'OK';
  if (!settingsSheet) {
    configIntegrity = 'MISSING_RESTOCK_SETTINGS';
  } else {
    const n1 = parseInt(settingsSheet.getRange('N1').getValue(), 10);
    const n2 = parseInt(settingsSheet.getRange('N2').getValue(), 10);
    const n3 = parseInt(settingsSheet.getRange('N3').getValue(), 10);
    const n4 = parseInt(settingsSheet.getRange('N4').getValue(), 10);
    if (isNaN(n1) || isNaN(n2) || isNaN(n3) || isNaN(n4) || n1 < 1 || n3 < 1) {
      configIntegrity = 'METADATA_INVALID';
    }
  }
  checks.push('Config integrity: ' + configIntegrity);

  const schemaGate = validateRunSchemaGate_(ss, {
    includeChecklist: true,
    includeCompliance: true
  });
  const schemaLine = schemaGate.ok
    ? 'Schema: OK'
    : 'Schema: BLOCKED - ' + schemaGate.blockingIssues.join(' | ');
  checks.push(schemaLine);

  let diagnosticsWritable = 'OK';
  try {
    const systemSheet = getSystemDiagnosticsSheet_(ss);
    const aiSheet = getAIDiagnosticsSheet_(ss);
    systemSheet.getRange('A1').getDisplayValue();
    aiSheet.getRange('A1').getDisplayValue();
  } catch (diagError) {
    diagnosticsWritable = 'ERROR_' + String(diagError);
  }
  checks.push('Diagnostics writable: ' + diagnosticsWritable);

  const props = PropertiesService.getDocumentProperties();
  props.setProperty(SYSTEM_REFERENCE.props.lastSchemaStatus, schemaGate.schemaStatus);
  props.setProperty(SYSTEM_REFERENCE.props.lastConfigStatus, configIntegrity === 'OK' ? schemaGate.configStatus : 'BLOCKED');
  updateDailyHomeHealth_(ss, {
    triggerStatus: triggerStatus,
    lastOutcome: props.getProperty(SYSTEM_REFERENCE.props.lastRunOutcome) || 'NONE',
    lastRunDurationMs: parseInt(props.getProperty(SYSTEM_REFERENCE.props.lastRunDurationMs) || '0', 10) || 0,
    configValidity: props.getProperty(SYSTEM_REFERENCE.props.lastConfigStatus) || 'UNKNOWN',
    schemaStatus: props.getProperty(SYSTEM_REFERENCE.props.lastSchemaStatus) || 'UNKNOWN',
    unknownQueueOpen: countOpenUnknownLocationQueue_(ss)
  });

  const diagnosticsOk = diagnosticsWritable === 'OK';
  const severity = (!schemaGate.ok || configIntegrity !== 'OK' || !diagnosticsOk) ? 'ERROR' : (triggerStatus === 'ACTIVE' ? 'INFO' : 'WARN');
  appendHealthEvent_(ss, 'SYSTEM_CHECK', severity, '', checks.join(' ; '));

  ui.alert('System Check\n\n' + checks.join('\n'));
  return {
    ok: schemaGate.ok && configIntegrity === 'OK' && diagnosticsWritable === 'OK',
    triggerStatus: triggerStatus,
    configIntegrity: configIntegrity,
    diagnosticsWritable: diagnosticsWritable,
    schemaGate: schemaGate
  };
}

/**
 * Clears import data from both the raw Treez data tab and the checklist.
 * Use this to prepare for a fresh import without rebuilding the entire system.
 */
function clearImportData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getDocumentProperties();
  
  // Clear Treez Valuation (Raw) - data starts at row 7
  const rawSheet = ss.getSheetByName('Treez Valuation (Raw)');
  if (rawSheet) {
    const lastRow = rawSheet.getLastRow();
    if (lastRow >= 7) {
      rawSheet.getRange(7, 1, lastRow - 6, rawSheet.getLastColumn()).clearContent();
    }
  }
  
  // Clear Restock List - data starts at row 3
  const checklistSheet = getSheetByCompatName_(ss, 'Restock List');
  if (checklistSheet) {
    const previousRows = parseInt(props.getProperty(SYSTEM_REFERENCE.props.lastChecklistRows) || '0', 10);
    const clearRows = Math.max(200, isNaN(previousRows) ? 0 : previousRows);

    // Clear manual entry columns (Pull, Status values, Done checkboxes, Notes)
    checklistSheet.getRange(3, 13, clearRows, 1).clearContent();  // Pull
    checklistSheet.getRange(3, 14, clearRows, 1).clearContent();  // Status
    checklistSheet.getRange(3, 15, clearRows, 1).clearDataValidations(); // Remove checkbox validation
    checklistSheet.getRange(3, 15, clearRows, 1).clearContent();  // Clear Done values
    checklistSheet.getRange(3, 16, clearRows, 1).clearContent();  // Notes
    
    // Show all hidden rows
    const maxRows = checklistSheet.getMaxRows();
    if (maxRows > 2) {
      checklistSheet.showRows(3, maxRows - 2);
    }
  }

  props.deleteProperty(SYSTEM_REFERENCE.props.lastImportSignature);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastImportRunTs);
  props.deleteProperty(SYSTEM_REFERENCE.props.complianceHighlightRows);
  props.deleteProperty(SYSTEM_REFERENCE.props.complianceHighlightHash);
  props.deleteProperty(SYSTEM_REFERENCE.props.complianceSnapshotHash);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastChecklistRows);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastChecklistRawSignature);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastChecklistRulesSignature);
  props.deleteProperty(SYSTEM_REFERENCE.props.runInProgress);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastSuccessSignature);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastRunId);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastRunOutcome);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastRunDurationMs);
  props.deleteProperty(SYSTEM_REFERENCE.props.profileCacheSignature);
  props.deleteProperty(SYSTEM_REFERENCE.props.profileCacheProfileId);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastSchemaStatus);
  props.deleteProperty(SYSTEM_REFERENCE.props.lastConfigStatus);
  resetDailyHomeSummary_(ss);
  resetDailyHomeHealth_(ss);
  
  SpreadsheetApp.getUi().alert('Import data cleared!\n\nYou can now import a fresh Treez CSV to the "Treez Valuation (Raw)" tab.');
}

// ============================================================================
// TAB CREATION
// ============================================================================

/**
 * Create all tabs in the correct order
 */
function createAllTabs(ss) {
  // Delete any existing sheets except the first one
  const sheets = ss.getSheets();
  
  // Create tabs in reverse order (they get inserted at position 0)
  for (let i = CONFIG.tabs.length - 1; i >= 0; i--) {
    const tabName = CONFIG.tabs[i];
    let sheet = getSheetByCompatName_(ss, tabName);
    if (!sheet) {
      sheet = ensureSheetByCompatName_(ss, tabName, 0);
    } else if (sheet.getName() !== tabName && !ss.getSheetByName(tabName)) {
      sheet.setName(tabName);
    }
  }
  
  // Delete the default "Sheet1" if it exists
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }
  
  // Reorder tabs
  for (let i = 0; i < CONFIG.tabs.length; i++) {
    const sheet = getSheetByCompatName_(ss, CONFIG.tabs[i]);
    if (sheet) {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(i + 1);
    }
  }
}

// ============================================================================
// DAILY HOME TAB
// ============================================================================

function setupDailyHomeTab(ss) {
  const sheet = ensureSheetByCompatName_(ss, 'Home');
  sheet.clear();

  sheet.getRange('A1').setValue('VAULT RESTOCK HOME').setFontSize(18).setFontWeight('bold');
  sheet.getRange('A2').setValue('One primary action: Restock -> Run Daily Update');
  sheet.getRange('A2').setBackground(CONFIG.colors.instructionBg);

  sheet.getRange('A4').setValue('Today Workflow').setFontSize(13).setFontWeight('bold');
  const workflow = [
    ['1. Import Treez CSV into "Treez Valuation (Raw)" at A6'],
    ['2. Run Restock -> Run Daily Update'],
    ['3. Review "Backstock Alerts" first'],
    ['4. Work "Restock List"'],
    ['5. Resolve "Compliance Alerts" issues']
  ];
  sheet.getRange(5, 1, workflow.length, 1).setValues(workflow);

  sheet.getRange('A11').setValue('Last Run Snapshot').setFontSize(13).setFontWeight('bold');
  const labels = [
    ['Run Status'],
    ['Last Run Timestamp'],
    ['Active Profile'],
    ['Checklist Rows'],
    ['Backstock Alerts Rows'],
    ['Compliance Issues'],
    ['Unknown Locations Queued'],
    ['Next Step']
  ];
  sheet.getRange(12, 1, labels.length, 1).setValues(labels).setFontWeight('bold');
  resetDailyHomeSummary_(ss);

  sheet.getRange('A22').setValue('Quick Open').setFontSize(13).setFontWeight('bold');
  const quickOpenRows = [
    ['Restock List', buildSheetLinkFormula_(ss, 'Restock List', 'Open Restock List')],
    ['Backstock Alerts', buildSheetLinkFormula_(ss, 'Backstock Alerts', 'Open Backstock Alerts')],
    ['Compliance Alerts', buildSheetLinkFormula_(ss, 'Compliance Alerts', 'Open Compliance Alerts')],
    ['Raw Import', buildSheetLinkFormula_(ss, 'Treez Valuation (Raw)', 'Open Raw Import')],
    ['Diagnostics (Manager)', buildSheetLinkFormula_(ss, DIAGNOSTICS.sheetName, 'Open Diagnostics')]
  ];
  sheet.getRange(23, 1, quickOpenRows.length, 2).setValues(quickOpenRows);

  sheet.getRange('A28').setValue('Checklist View Mode').setFontSize(13).setFontWeight('bold');
  sheet.getRange('A29').setFormula(`=IFERROR('Restock Settings'!L2,"PRIORITY")`);
  sheet.getRange('B29').setFormula(`=IF(A29="LOCATION_WAVE","Grouped by First Pull From","Sorted by Urgency")`);

  sheet.getRange('A32').setValue('System Health (Manager)').setFontSize(13).setFontWeight('bold');
  const healthLabels = [
    ['Trigger Status'],
    ['Last Outcome'],
    ['Last Run Duration (ms)'],
    ['Config Validity'],
    ['Schema Status'],
    ['Unknown Queue Open']
  ];
  sheet.getRange(33, 1, healthLabels.length, 1).setValues(healthLabels).setFontWeight('bold');

  sheet.getRange('A40').setValue('Trust and Escalation').setFontSize(12).setFontWeight('bold');
  const trustLines = [
    ['Decision transparency: checklist and compliance outputs are generated from current import data, active profile mapping, and configured rules.'],
    ['Manager authority: managers can override operational execution decisions and update profile/location configuration when reality changes.'],
    ['Escalation location: if a run is blocked or fails, open Diagnostics and follow Manager Runbooks from docs/managers and docs/runbooks.']
  ];
  sheet.getRange(41, 1, trustLines.length, 1).setValues(trustLines).setWrap(true);

  sheet.setColumnWidth(1, 270);
  sheet.setColumnWidth(2, 420);
  sheet.setFrozenRows(3);
  resetDailyHomeHealth_(ss);
}

function updateDailyHomeSummary_(ss, payload) {
  const sheet = getSheetByCompatName_(ss, 'Home');
  if (!sheet) return;

  const data = payload || {};
  const status = String(data.status || 'READY').toUpperCase();
  const values = [
    [status],
    [data.runTimestamp || new Date()],
    [data.profileId || ''],
    [data.checklistRows || 0],
    [data.noReserveRiskRows || 0],
    [data.complianceIssues || 0],
    [data.unknownLocationsQueued || 0],
    [data.nextStep || 'Run Restock -> Run Daily Update']
  ];
  sheet.getRange(12, 2, values.length, 1).setValues(values);
  sheet.getRange('B13').setNumberFormat('yyyy-mm-dd hh:mm:ss');

  // Status color cue for immediate readability.
  const statusCell = sheet.getRange('B12');
  if (status === 'COMPLETE') {
    statusCell.setBackground('#d9ead3');
  } else if (status === 'BLOCKED' || status === 'FAILED') {
    statusCell.setBackground('#f4cccc');
  } else {
    statusCell.setBackground('#fff2cc');
  }
}

function resetDailyHomeSummary_(ss) {
  updateDailyHomeSummary_(ss, {
    status: 'READY',
    runTimestamp: '',
    profileId: '',
    checklistRows: 0,
    noReserveRiskRows: 0,
    complianceIssues: 0,
    unknownLocationsQueued: 0,
    nextStep: 'Import CSV, then run Restock -> Run Daily Update'
  });
}

function updateDailyHomeHealth_(ss, payload) {
  const sheet = getSheetByCompatName_(ss, 'Home');
  if (!sheet) return;

  const data = payload || {};
  const values = [
    [data.triggerStatus || 'UNKNOWN'],
    [data.lastOutcome || 'NONE'],
    [data.lastRunDurationMs || 0],
    [data.configValidity || 'UNKNOWN'],
    [data.schemaStatus || 'UNKNOWN'],
    [data.unknownQueueOpen || 0]
  ];
  sheet.getRange(33, 2, values.length, 1).setValues(values);

  const outcomeCell = sheet.getRange('B34');
  const outcome = String(values[1][0] || '').toUpperCase();
  if (outcome === RUN_OUTCOMES.success) {
    outcomeCell.setBackground('#d9ead3');
  } else if (outcome.indexOf('BLOCKED') >= 0 || outcome.indexOf('FAILED') >= 0) {
    outcomeCell.setBackground('#f4cccc');
  } else {
    outcomeCell.setBackground('#fff2cc');
  }
}

function resetDailyHomeHealth_(ss) {
  updateDailyHomeHealth_(ss, {
    triggerStatus: 'UNKNOWN',
    lastOutcome: 'NONE',
    lastRunDurationMs: 0,
    configValidity: 'UNKNOWN',
    schemaStatus: 'UNKNOWN',
    unknownQueueOpen: 0
  });
}

function refreshDailyHomeHealthFromState_(ss) {
  const props = PropertiesService.getDocumentProperties();
  updateDailyHomeHealth_(ss, {
    triggerStatus: getTriggerStatus_(ss),
    lastOutcome: props.getProperty(SYSTEM_REFERENCE.props.lastRunOutcome) || 'NONE',
    lastRunDurationMs: parseInt(props.getProperty(SYSTEM_REFERENCE.props.lastRunDurationMs) || '0', 10) || 0,
    configValidity: props.getProperty(SYSTEM_REFERENCE.props.lastConfigStatus) || 'UNKNOWN',
    schemaStatus: props.getProperty(SYSTEM_REFERENCE.props.lastSchemaStatus) || 'UNKNOWN',
    unknownQueueOpen: countOpenUnknownLocationQueue_(ss)
  });
}

function buildSheetLinkFormula_(ss, sheetName, label) {
  const sheet = getSheetByCompatName_(ss, sheetName);
  if (!sheet) return label;
  return '=HYPERLINK("#gid=' + sheet.getSheetId() + '","' + label + '")';
}

function openDailyHome() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureDailyHomeTab_(ss);
  const sheet = getSheetByCompatName_(ss, 'Home');
  if (sheet) {
    ss.setActiveSheet(sheet);
  }
}

// ============================================================================
// INSTRUCTIONS TAB
// ============================================================================

function setupInstructionsTab(ss) {
  const sheet = ensureSheetByCompatName_(ss, 'Start Here');
  sheet.clear();
  
  const instructions = [
    ['VAULT RESTOCK SYSTEM - START HERE'],
    [''],
    ['OVERVIEW'],
    ['This spreadsheet helps State of Mind vault staff manage daily restocking by:'],
    ['- Analyzing the Treez Inventory Valuation export'],
    ['- Identifying products that need restocking on the sales floor'],
    ['- Calculating how many units to pull from backstock'],
    ['- Showing exactly which bins/shelves to pull from (oldest inventory first)'],
    ['- Decision transparency: output is based on current import data, active profile mapping, and configured rules.'],
    ['- Manager authority: managers can override execution decisions and update mapping/configuration when needed.'],
    ['- Escalation location: use Restock -> Open Diagnostics and manager runbooks for blocked or failed runs.'],
    [''],
    ['HOW TO USE (DAILY WORKFLOW)'],
    [''],
    ['Step 1: Export from Treez'],
    ['  - Run the Inventory Valuation report in Treez'],
    ['  - Export as CSV'],
    [''],
    ['Step 2: Import into this sheet'],
    ['  - Go to the "Treez Valuation (Raw)" tab'],
    ['  - Click on cell A6'],
    ['  - Use File -> Import -> Upload, choose your CSV'],
    ['  - Select "Replace data at selected cell"'],
    [''],
    ['Step 3: Run Daily Update'],
    ['  - Go to "Home" for run summary and quick links'],
    ['  - Click Restock -> Run Daily Update from the menu bar'],
    ['  - Wait for checklist and compliance confirmation'],
    [''],
    ['Step 4: Check Backstock Alerts'],
    ['  - Go to the "Backstock Alerts" tab first'],
    ['  - Prioritize immediate reorder/transfer decisions for critical zero-reserve items'],
    [''],
    ['Step 5: Work the Restock List'],
    ['  - Go to the "Restock List" tab'],
    ['  - Work Critical (red) items first, then Soon (amber), then Low (green)'],
    ['  - For each item:'],
    ['    - Check "First Pull From" for location and quantity'],
    ['    - Pull units and bring to sales floor'],
    ['    - Enter actual units pulled in "Pull" column'],
    ['    - Check "Done" when complete'],
    [''],
    ['MENU OPTIONS'],
    [''],
    ['Restock -> Run Daily Update - Run full checklist + compliance pipeline'],
    ['Restock -> Run Checklist Only - Refresh staff checklist only'],
    ['Restock -> Run Compliance Only - Re-run compliance report only'],
    ['Restock -> Checklist View -> Priority Order - Sort checklist by urgency'],
    ['Restock -> Checklist View -> Location Wave - Group checklist by First Pull From'],
    ['Restock -> Install Auto-Run - Enable trigger after CSV imports'],
    ['Restock -> Disable Auto-Run - Disable trigger'],
    ['Manager mode: Restock -> Run System Check - Validate trigger/config/schema/diagnostics'],
    ['Manager mode: Restock -> Open Diagnostics - Open run + health logs'],
    ['Restock -> Clear Import Data - Clear old data before fresh import'],
    ['Restock -> Reset to Defaults - Rebuild entire system (rarely needed)'],
    [''],
    ['URGENCY COLORS'],
    ['- RED = Critical (0-2 on shelf) - Restock immediately'],
    ['- AMBER = Soon (3-4 on shelf) - Restock today'],
    ['- GREEN = Low (5-6 on shelf) - Restock when convenient'],
    [''],
    ['NOTE: Some columns are hidden by default for a cleaner view.'],
    ['Right-click column headers to unhide if needed.'],
    [''],
    ['QUESTIONS?'],
    ['Contact your manager or system administrator.']
  ];
  
  sheet.getRange(1, 1, instructions.length, 1).setValues(instructions);
  
  // Format title
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  const sectionHeaders = {
    'OVERVIEW': true,
    'HOW TO USE (DAILY WORKFLOW)': true,
    'MENU OPTIONS': true,
    'URGENCY COLORS': true,
    'QUESTIONS?': true
  };
  for (let row = 1; row <= instructions.length; row++) {
    const text = String(instructions[row - 1][0] || '');
    if (sectionHeaders[text]) {
      sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold');
    }
  }
  
  sheet.setColumnWidth(1, 600);
}

// ============================================================================
// TREEZ VALUATION (RAW) TAB
// ============================================================================

function setupTreezValuationTab(ss) {
  const sheet = ss.getSheetByName('Treez Valuation (Raw)');
  sheet.clear();
  
  // Import instructions (rows 1-5)
  const instructions = [
    ['TREEZ VALUATION IMPORT'],
    [''],
    ['Instructions:'],
    ['1. Export the Inventory Valuation report from Treez as a CSV'],
    ['2. Click on cell A6 below, then use File -> Import -> Upload'],
    ['3. Choose "Replace data at selected cell" in the import options'],
    ['4. After import, go to "Home" then run Restock -> Run Daily Update'],
    ['']
  ];
  
  sheet.getRange(1, 1, instructions.length, 1).setValues(instructions);
  
  // Format instruction area
  sheet.getRange('A1').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A1:A5').setBackground(CONFIG.colors.instructionBg);
  
  // Add column headers in row 6
  const headerRow = CONFIG.rawDataStartRow;
  sheet.getRange(headerRow, 1, 1, CONFIG.treezColumns.length).setValues([CONFIG.treezColumns]);
  
  // Format header row
  const headerRange = sheet.getRange(headerRow, 1, 1, CONFIG.treezColumns.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(CONFIG.colors.header);
  headerRange.setBorder(true, true, true, true, true, true);
  
  // Freeze header row
  sheet.setFrozenRows(headerRow);
  
  // Set reasonable column widths
  for (let i = 1; i <= CONFIG.treezColumns.length; i++) {
    sheet.setColumnWidth(i, 100);
  }
  // Make Product Name wider
  sheet.setColumnWidth(13, 300);
  // Make Brand wider
  sheet.setColumnWidth(12, 150);
}

// ============================================================================
// SYSTEM REFERENCE TAB + STORE PROFILE HELPERS
// ============================================================================

function setupSystemReferenceTab(ss) {
  const sheet = ss.getSheetByName(SYSTEM_REFERENCE.sheetName);
  sheet.clear();

  sheet.getRange('A1:F1').setValues([SYSTEM_REFERENCE.storeProfilesHeaders]);
  sheet.getRange('H1:L1').setValues([SYSTEM_REFERENCE.locationProfileHeaders]);
  sheet.getRange('N1:U1').setValues([SYSTEM_REFERENCE.locationReviewHeaders]);
  sheet.getRange('A1:F1').setFontWeight('bold').setBackground(CONFIG.colors.header);
  sheet.getRange('H1:L1').setFontWeight('bold').setBackground(CONFIG.colors.header);
  sheet.getRange('N1:U1').setFontWeight('bold').setBackground(CONFIG.colors.header);

  sheet.getRange(2, 1, SYSTEM_REFERENCE.storeProfilesRows.length, 6).setValues(SYSTEM_REFERENCE.storeProfilesRows);

  const locationRows = buildDefaultLocationProfileRows_();
  if (locationRows.length > 0) {
    sheet.getRange(2, 8, locationRows.length, 5).setValues(locationRows);
  }

  sheet.getRange('A12').setValue('Notes').setFontWeight('bold');
  sheet.getRange('A13').setValue('Set profile_override=TRUE on exactly one profile to force workbook store mode.');
  sheet.getRange('A14').setValue('If no override is set, profile auto-detect uses dominant Receiving License in raw data.');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 85);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(8, 95);
  sheet.setColumnWidth(9, 170);
  sheet.setColumnWidth(10, 95);
  sheet.setColumnWidth(11, 120);
  sheet.setColumnWidth(12, 320);
  sheet.setColumnWidth(14, 170);
  sheet.setColumnWidth(15, 95);
  sheet.setColumnWidth(16, 170);
  sheet.setColumnWidth(17, 120);
  sheet.setColumnWidth(18, 95);
  sheet.setColumnWidth(19, 170);
  sheet.setColumnWidth(20, 85);
  sheet.setColumnWidth(21, 170);
  sheet.setFrozenRows(1);
}

function setupSystemDiagnosticsTab(ss) {
  const sheet = ss.getSheetByName(DIAGNOSTICS.sheetName);
  if (!sheet) return;
  sheet.clear();

  sheet.getRange(1, 1, 1, DIAGNOSTICS.runJournalHeaders.length).setValues([DIAGNOSTICS.runJournalHeaders]);
  sheet.getRange(1, 14, 1, DIAGNOSTICS.healthEventHeaders.length).setValues([DIAGNOSTICS.healthEventHeaders]);
  sheet.getRange(1, 1, 1, DIAGNOSTICS.runJournalHeaders.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  sheet.getRange(1, 14, 1, DIAGNOSTICS.healthEventHeaders.length).setFontWeight('bold').setBackground(CONFIG.colors.header);

  sheet.getRange('A2').setValue('Run journal is append-only. Do not edit rows manually.');
  sheet.getRange('N2').setValue('Health events capture guardrail, performance, stage, and progress signals.');
  sheet.getRange('A2').setFontColor('#666666');
  sheet.getRange('N2').setFontColor('#666666');

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 165);
  sheet.setColumnWidth(3, 165);
  sheet.setColumnWidth(4, 105);
  sheet.setColumnWidth(5, 115);
  sheet.setColumnWidth(6, 95);
  sheet.setColumnWidth(7, 240);
  sheet.setColumnWidth(8, 170);
  sheet.setColumnWidth(9, 190);
  sheet.setColumnWidth(10, 95);
  sheet.setColumnWidth(11, 110);
  sheet.setColumnWidth(12, 125);
  sheet.setColumnWidth(13, 130);
  sheet.setColumnWidth(14, 170);
  sheet.setColumnWidth(15, 130);
  sheet.setColumnWidth(16, 90);
  sheet.setColumnWidth(17, 95);
  sheet.setColumnWidth(18, 520);
  sheet.setFrozenRows(1);
}

function getAIDiagnosticsSheet_(ss) {
  let sheet = ss.getSheetByName(AI_DIAGNOSTICS.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(AI_DIAGNOSTICS.sheetName);
    setupAIDiagnosticsTab(ss);
    sheet = ss.getSheetByName(AI_DIAGNOSTICS.sheetName);
  }
  return sheet;
}

function setupAIDiagnosticsTab(ss) {
  const sheet = ss.getSheetByName(AI_DIAGNOSTICS.sheetName);
  if (!sheet) return;
  sheet.clear();

  sheet.getRange(1, AI_DIAGNOSTICS.runSummaryStartCol, 1, AI_DIAGNOSTICS.runSummaryHeaders.length)
    .setValues([AI_DIAGNOSTICS.runSummaryHeaders])
    .setFontWeight('bold')
    .setBackground(CONFIG.colors.header);
  sheet.getRange(1, AI_DIAGNOSTICS.stageStepsStartCol, 1, AI_DIAGNOSTICS.stageStepHeaders.length)
    .setValues([AI_DIAGNOSTICS.stageStepHeaders])
    .setFontWeight('bold')
    .setBackground(CONFIG.colors.header);
  sheet.getRange(1, AI_DIAGNOSTICS.queueHealthStartCol, 1, AI_DIAGNOSTICS.queueHealthHeaders.length)
    .setValues([AI_DIAGNOSTICS.queueHealthHeaders])
    .setFontWeight('bold')
    .setBackground(CONFIG.colors.header);
  sheet.getRange(1, AI_DIAGNOSTICS.hotspotsStartCol, 1, AI_DIAGNOSTICS.hotspotsHeaders.length)
    .setValues([AI_DIAGNOSTICS.hotspotsHeaders])
    .setFontWeight('bold')
    .setBackground(CONFIG.colors.header);

  const stageStart = columnToLetter_(AI_DIAGNOSTICS.stageStepsStartCol);
  const stageEnd = columnToLetter_(AI_DIAGNOSTICS.stageStepsStartCol + AI_DIAGNOSTICS.stageStepHeaders.length - 1);
  sheet.getRange(2, AI_DIAGNOSTICS.hotspotsStartCol).setFormula(
    '=IFERROR(QUERY(' + stageStart + '2:' + stageEnd + ',"select Col4,Col5,avg(Col6),max(Col6),count(Col6) where Col1 is not null and Col6 > 0 group by Col4,Col5 order by avg(Col6) desc limit 15",0),{"","","","",""})'
  );

  sheet.getRange('BJ22').setValue('AI Perf Packet (copy this block)').setFontWeight('bold');
  sheet.getRange(AI_DIAGNOSTICS.perfPacketCell).setValue('Run "Restock -> Generate AI Perf Packet".');
  sheet.getRange(AI_DIAGNOSTICS.perfPacketCell).setWrap(true);

  const runSummaryWidths = [180, 160, 160, 105, 105, 95, 220, 150, 165, 95, 80, 105, 120, 120, 120, 120, 120, 115, 110, 120, 105, 105, 115, 95, 95];
  for (let i = 0; i < runSummaryWidths.length; i++) {
    sheet.setColumnWidth(AI_DIAGNOSTICS.runSummaryStartCol + i, runSummaryWidths[i]);
  }
  for (let i = 0; i < AI_DIAGNOSTICS.stageStepHeaders.length; i++) {
    let width = i < 6 ? 120 : 105;
    if (i === 3 || i === 4) width = 130; // stage + step
    if (i === 17) width = 360; // detail_json
    sheet.setColumnWidth(AI_DIAGNOSTICS.stageStepsStartCol + i, width);
  }
  for (let i = 0; i < AI_DIAGNOSTICS.queueHealthHeaders.length; i++) {
    sheet.setColumnWidth(AI_DIAGNOSTICS.queueHealthStartCol + i, i === 7 ? 260 : 120);
  }
  for (let i = 0; i < AI_DIAGNOSTICS.hotspotsHeaders.length; i++) {
    sheet.setColumnWidth(AI_DIAGNOSTICS.hotspotsStartCol + i, 140);
  }
  sheet.setColumnWidth(columnToNumber_('BJ'), 540);
  sheet.setFrozenRows(1);
}

function columnToNumber_(letters) {
  const text = String(letters || '').toUpperCase().trim();
  if (!text) return 1;
  let out = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 65 || code > 90) continue;
    out = (out * 26) + (code - 64);
  }
  return Math.max(1, out);
}

function safeJson_(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value || '');
  }
}

function truncateText_(value, maxLen) {
  const text = String(value || '');
  const limit = Math.max(1, parseInt(maxLen, 10) || 0);
  if (!limit || text.length <= limit) return text;
  return text.slice(0, limit - 14) + '...[truncated]';
}

function readAITableRows_(sheet, startCol, width) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, startCol, lastRow - 1, width).getValues();
  const rows = [];
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === '') continue;
    rows.push(values[i]);
  }
  return rows;
}

function getAITableLastDataRow_(sheet, startCol) {
  if (!sheet) return 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const values = sheet.getRange(2, startCol, lastRow - 1, 1).getDisplayValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0] || '').trim() !== '') {
      return i + 2;
    }
  }
  return 1;
}

function writeAITableRows_(sheet, startCol, width, rows) {
  const lastDataRow = getAITableLastDataRow_(sheet, startCol);
  const clearRows = Math.max(rows.length, Math.max(0, lastDataRow - 1));
  if (clearRows > 0) {
    sheet.getRange(2, startCol, clearRows, width).clearContent();
  }
  if (rows.length > 0) {
    sheet.getRange(2, startCol, rows.length, width).setValues(rows);
  }
}

function sortStageNamesForSummary_(stageDurations) {
  const order = {
    profile_resolve: 1,
    schema_gate: 2,
    location_sync: 3,
    preflight: 4,
    checklist: 5,
    compliance: 6,
    finalize: 7
  };
  return Object.keys(stageDurations || {}).sort(function(a, b) {
    const rankA = order[a] || 99;
    const rankB = order[b] || 99;
    if (rankA !== rankB) return rankA - rankB;
    return a < b ? -1 : (a > b ? 1 : 0);
  });
}

function buildAIDiagnosticsRows_(runCtx) {
  const stageDur = runCtx.stageDurations || {};
  const summaryRow = [
    runCtx.runId,
    runCtx.startedAt,
    runCtx.endedAt,
    runCtx.durationMs,
    runCtx.source,
    runCtx.profileId,
    runCtx.signature,
    runCtx.outcome,
    runCtx.errorCode,
    runCtx.warningCount,
    runCtx.perfWarn === true,
    runCtx.checklistRows,
    runCtx.noReserveRows,
    runCtx.complianceFlagged,
    runCtx.queueHealth.trueUnmappedCount || 0,
    runCtx.queueHealth.mappedIgnoreCount || 0,
    runCtx.queueHealth.resolvedClosedCount || 0,
    stageDur.profile_resolve || 0,
    stageDur.schema_gate || 0,
    stageDur.location_sync || 0,
    stageDur.preflight || 0,
    stageDur.checklist || 0,
    stageDur.compliance || 0,
    stageDur.finalize || 0,
    getStageOtherDurationMs_(runCtx)
  ];

  const stageRows = [];
  const stageNames = sortStageNamesForSummary_(stageDur);
  for (let i = 0; i < stageNames.length; i++) {
    const stageName = stageNames[i];
    const stageDurationMs = parseInt(stageDur[stageName], 10) || 0;
    const stepDur = runCtx.stageStepDurations[stageName] || {};
    const counters = runCtx.stageCounters[stageName] || {};
    const stepKeys = Object.keys(stepDur);
    let accounted = 0;

    for (let j = 0; j < stepKeys.length; j++) {
      const step = stepKeys[j];
      const durationMs = Math.max(0, parseInt(stepDur[step], 10) || 0);
      accounted += durationMs;
      stageRows.push([
        runCtx.runId,
        runCtx.profileId,
        runCtx.source,
        stageName,
        step,
        durationMs,
        stageDurationMs,
        0,
        counters.apiReadCalls || 0,
        counters.apiWriteCalls || 0,
        counters.rowsTotal || counters.dataRowsInRaw || counters.rowsScanned || 0,
        counters.rowsChanged || 0,
        counters.readStrategy || counters.strategy || '',
        counters.segmentCount || 0,
        counters.spanWidth || 0,
        counters.checkpointsLogged || counters.warningCount || 0,
        counters.requiredIndexCount || counters.requiredIndexes || 0,
        truncateText_(safeJson_(counters), 1800),
        runCtx.endedAt || new Date()
      ]);
    }

    const unaccounted = Math.max(0, stageDurationMs - accounted);
    stageRows.push([
      runCtx.runId,
      runCtx.profileId,
      runCtx.source,
      stageName,
      '__unaccounted__',
      unaccounted,
      stageDurationMs,
      unaccounted,
      counters.apiReadCalls || 0,
      counters.apiWriteCalls || 0,
      counters.rowsTotal || counters.dataRowsInRaw || counters.rowsScanned || 0,
      counters.rowsChanged || 0,
      counters.readStrategy || counters.strategy || '',
      counters.segmentCount || 0,
      counters.spanWidth || 0,
      0,
      0,
      'stage_duration_ms=' + stageDurationMs + '; accounted_ms=' + accounted,
      runCtx.endedAt || new Date()
    ]);
  }

  const queueRow = [
    runCtx.runId,
    runCtx.profileId,
    runCtx.source,
    runCtx.queueHealth.trueUnmappedCount || 0,
    runCtx.queueHealth.mappedIgnoreCount || 0,
    runCtx.queueHealth.resolvedClosedCount || 0,
    runCtx.queueHealth.openQueueCount || 0,
    runCtx.queueHealth.unknownLocationsCsv || '',
    runCtx.endedAt || new Date()
  ];

  return {
    runSummaryRow: summaryRow,
    stageRows: stageRows,
    queueRow: queueRow
  };
}

function pruneAIDiagnosticsRows_(runSummaryRows, stageRows, queueRows, maxRuns) {
  const keep = Math.max(1, parseInt(maxRuns, 10) || AI_DIAGNOSTICS.runRetention);
  if (runSummaryRows.length <= keep) {
    return {
      runSummaryRows: runSummaryRows,
      stageRows: stageRows,
      queueRows: queueRows
    };
  }

  const trimmedSummary = runSummaryRows.slice(runSummaryRows.length - keep);
  const keepMap = {};
  for (let i = 0; i < trimmedSummary.length; i++) {
    const runId = String(trimmedSummary[i][0] || '').trim();
    if (runId) keepMap[runId] = true;
  }

  const trimmedStage = [];
  for (let i = 0; i < stageRows.length; i++) {
    const runId = String(stageRows[i][0] || '').trim();
    if (!runId || !keepMap[runId]) continue;
    trimmedStage.push(stageRows[i]);
  }

  const trimmedQueue = [];
  for (let i = 0; i < queueRows.length; i++) {
    const runId = String(queueRows[i][0] || '').trim();
    if (!runId || !keepMap[runId]) continue;
    trimmedQueue.push(queueRows[i]);
  }

  return {
    runSummaryRows: trimmedSummary,
    stageRows: trimmedStage,
    queueRows: trimmedQueue
  };
}

function appendAIDiagnostics_(ss, runCtx) {
  const sheet = getAIDiagnosticsSheet_(ss);
  const built = buildAIDiagnosticsRows_(runCtx);

  const summaryRows = readAITableRows_(sheet, AI_DIAGNOSTICS.runSummaryStartCol, AI_DIAGNOSTICS.runSummaryHeaders.length);
  const stageRows = readAITableRows_(sheet, AI_DIAGNOSTICS.stageStepsStartCol, AI_DIAGNOSTICS.stageStepHeaders.length);
  const queueRows = readAITableRows_(sheet, AI_DIAGNOSTICS.queueHealthStartCol, AI_DIAGNOSTICS.queueHealthHeaders.length);

  summaryRows.push(built.runSummaryRow);
  for (let i = 0; i < built.stageRows.length; i++) {
    stageRows.push(built.stageRows[i]);
  }
  queueRows.push(built.queueRow);

  const pruned = pruneAIDiagnosticsRows_(summaryRows, stageRows, queueRows, AI_DIAGNOSTICS.runRetention);
  writeAITableRows_(sheet, AI_DIAGNOSTICS.runSummaryStartCol, AI_DIAGNOSTICS.runSummaryHeaders.length, pruned.runSummaryRows);
  writeAITableRows_(sheet, AI_DIAGNOSTICS.stageStepsStartCol, AI_DIAGNOSTICS.stageStepHeaders.length, pruned.stageRows);
  writeAITableRows_(sheet, AI_DIAGNOSTICS.queueHealthStartCol, AI_DIAGNOSTICS.queueHealthHeaders.length, pruned.queueRows);

  const packetCell = sheet.getRange(AI_DIAGNOSTICS.perfPacketCell);
  if (!packetCell.getValue()) {
    packetCell.setValue('Run "Restock -> Generate AI Perf Packet".');
  }
}

function buildDefaultLocationProfileRows_() {
  const rows = [];
  const seen = {};

  const add = (profileId, location, role, includeInEngine, notes) => {
    const key = profileId + '|' + String(location || '').toUpperCase().trim();
    const row = [profileId, location, role, includeInEngine === true, notes || ''];
    if (seen[key] === undefined) {
      seen[key] = rows.length;
      rows.push(row);
    } else {
      rows[seen[key]] = row;
    }
  };

  for (let i = 0; i < PROFILE_LOCATION_SEEDS.ALBANY.length; i++) {
    const row = PROFILE_LOCATION_SEEDS.ALBANY[i];
    add('ALBANY', row[0], row[1], row[2], row[3]);
  }

  for (let i = 0; i < LOCATION_ROLES_DATA.length; i++) {
    const row = LOCATION_ROLES_DATA[i];
    add('LATHAM', row[0], row[1], row[2], row[3]);
  }

  for (let i = 0; i < PROFILE_LOCATION_SEEDS.LATHAM_EXTRA.length; i++) {
    const row = PROFILE_LOCATION_SEEDS.LATHAM_EXTRA[i];
    add('LATHAM', row[0], row[1], row[2], row[3]);
  }

  rows.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    const rank = { 'PICK SHELF': 1, 'RESERVE': 2, 'IGNORE': 3 };
    const ra = rank[a[2]] || 9;
    const rb = rank[b[2]] || 9;
    if (ra !== rb) return ra - rb;
    return String(a[1]).localeCompare(String(b[1]));
  });

  return rows;
}

function getSystemReferenceSheet_(ss) {
  let sheet = ss.getSheetByName(SYSTEM_REFERENCE.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(SYSTEM_REFERENCE.sheetName);
    setupSystemReferenceTab(ss);
    sheet = ss.getSheetByName(SYSTEM_REFERENCE.sheetName);
  }
  return sheet;
}

function readStoreProfiles_(ss) {
  const sheet = getSystemReferenceSheet_(ss);
  const maxScanRows = 60;
  const data = sheet.getRange(2, 1, maxScanRows, 6).getValues();
  const profiles = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const profileId = String(row[0] || '').trim().toUpperCase();
    if (!profileId) continue;
    profiles.push({
      profileId: profileId,
      storeName: String(row[1] || '').trim(),
      receivingLicenseMatch: String(row[2] || '').trim(),
      isDefault: parseBooleanWithFallback_(row[3], false),
      autoRunEnabled: parseBooleanWithFallback_(row[4], true),
      profileOverride: parseBooleanWithFallback_(row[5], false)
    });
  }

  if (profiles.length === 0) {
    for (let i = 0; i < SYSTEM_REFERENCE.storeProfilesRows.length; i++) {
      const row = SYSTEM_REFERENCE.storeProfilesRows[i];
      profiles.push({
        profileId: row[0],
        storeName: row[1],
        receivingLicenseMatch: row[2],
        isDefault: row[3] === true,
        autoRunEnabled: row[4] === true,
        profileOverride: row[5] === true
      });
    }
  }
  return profiles;
}

function readLocationProfileMap_(ss) {
  const sheet = getSystemReferenceSheet_(ss);
  const maxScanRows = 1000;
  const data = sheet.getRange(2, 8, maxScanRows, 5).getValues();
  const rows = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const profileId = String(row[0] || '').trim().toUpperCase();
    const locationName = String(row[1] || '').trim();
    if (!profileId || !locationName) continue;

    rows.push({
      profileId: profileId,
      locationName: locationName,
      role: String(row[2] || 'IGNORE').toUpperCase().trim(),
      includeInEngine: parseBooleanWithFallback_(row[3], false),
      notes: String(row[4] || '')
    });
  }

  if (rows.length === 0) {
    const seeded = buildDefaultLocationProfileRows_();
    if (seeded.length > 0) {
      sheet.getRange(2, 8, seeded.length, 5).setValues(seeded);
      for (let i = 0; i < seeded.length; i++) {
        rows.push({
          profileId: String(seeded[i][0] || '').toUpperCase().trim(),
          locationName: String(seeded[i][1] || '').trim(),
          role: String(seeded[i][2] || 'IGNORE').toUpperCase().trim(),
          includeInEngine: seeded[i][3] === true,
          notes: String(seeded[i][4] || '')
        });
      }
    }
  }

  return rows;
}

function resolveActiveStoreProfile_(ss, options) {
  const opts = options || {};
  const profiles = readStoreProfiles_(ss);

  if (opts.allowOverride !== false) {
    const overrideProfile = profiles.find(p => p.profileOverride);
    if (overrideProfile) {
      return {
        profileId: overrideProfile.profileId,
        storeName: overrideProfile.storeName,
        source: 'override',
        receivingLicense: overrideProfile.receivingLicenseMatch,
        autoRunEnabled: overrideProfile.autoRunEnabled
      };
    }
  }

  if (opts.useRawData !== false) {
    const props = PropertiesService.getDocumentProperties();
    const signature = String(opts.signature || computeRawImportSignature_(ss) || '');
    const signatureLicense = getLicenseTokenFromSignature_(signature);
    const signatureMatch = resolveProfileByLicenseToken_(profiles, signatureLicense);
    if (signatureMatch) {
      if (signature) {
        props.setProperty(SYSTEM_REFERENCE.props.profileCacheSignature, signature);
        props.setProperty(SYSTEM_REFERENCE.props.profileCacheProfileId, signatureMatch.profileId);
      }
      return buildResolvedProfileResult_(signatureMatch, 'signature', signatureLicense);
    }

    const cachedSignature = props.getProperty(SYSTEM_REFERENCE.props.profileCacheSignature) || '';
    const cachedProfileId = props.getProperty(SYSTEM_REFERENCE.props.profileCacheProfileId) || '';
    if (signature && cachedSignature === signature && cachedProfileId) {
      const cachedProfile = profiles.find(p => p.profileId === cachedProfileId);
      if (cachedProfile) {
        return buildResolvedProfileResult_(cachedProfile, 'cache', cachedProfile.receivingLicenseMatch);
      }
    }

    const detected = detectProfileFromRaw_(ss, profiles, {
      preferredLicense: signatureLicense
    });
    if (detected) {
      if (signature) {
        props.setProperty(SYSTEM_REFERENCE.props.profileCacheSignature, signature);
        props.setProperty(SYSTEM_REFERENCE.props.profileCacheProfileId, detected.profileId);
      }
      return detected;
    }
  }

  const fallback = profiles.find(p => p.isDefault) || profiles[0] || {
    profileId: 'ALBANY',
    storeName: 'Albany',
    receivingLicenseMatch: SYSTEM_REFERENCE.storeProfilesRows[0][2],
    autoRunEnabled: true
  };

  return {
    profileId: fallback.profileId,
    storeName: fallback.storeName,
    source: 'default',
    receivingLicense: fallback.receivingLicenseMatch,
    autoRunEnabled: fallback.autoRunEnabled
  };
}

function buildResolvedProfileResult_(profileRow, source, receivingLicense) {
  if (!profileRow) return null;
  return {
    profileId: profileRow.profileId,
    storeName: profileRow.storeName,
    source: source || 'unknown',
    receivingLicense: receivingLicense || profileRow.receivingLicenseMatch,
    autoRunEnabled: profileRow.autoRunEnabled
  };
}

function resolveProfileByLicenseToken_(profiles, licenseToken) {
  const token = normalizeToken_(licenseToken);
  if (!token) return null;
  for (let i = 0; i < profiles.length; i++) {
    const expected = normalizeToken_(profiles[i].receivingLicenseMatch);
    if (expected && expected === token) {
      return profiles[i];
    }
  }
  return null;
}

function getLicenseTokenFromSignature_(signature) {
  const parts = String(signature || '').split('|');
  if (parts.length < 4) return '';
  return normalizeToken_(parts[3]);
}

function detectProfileFromRaw_(ss, profiles, options) {
  const opts = options || {};
  const preferredLicense = normalizeToken_(opts.preferredLicense);
  if (preferredLicense) {
    const preferredMatch = resolveProfileByLicenseToken_(profiles, preferredLicense);
    if (preferredMatch) {
      return buildResolvedProfileResult_(preferredMatch, 'signature_hint', preferredLicense);
    }
  }

  const rawSheet = ss.getSheetByName('Treez Valuation (Raw)');
  if (!rawSheet) return null;

  const headerRow = CONFIG.rawDataStartRow;
  const dataStartRow = headerRow + 1;
  const lastRow = rawSheet.getLastRow();
  const lastCol = rawSheet.getLastColumn();
  if (lastRow < dataStartRow || lastCol < 1) return null;

  const sampleLicense = getQuickLicenseSignatureToken_(rawSheet, dataStartRow, lastRow, lastCol);
  const sampleMatch = resolveProfileByLicenseToken_(profiles, sampleLicense);
  if (sampleMatch) {
    return buildResolvedProfileResult_(sampleMatch, 'detected_sample', sampleLicense);
  }

  const headers = rawSheet.getRange(headerRow, 1, 1, lastCol).getDisplayValues()[0];
  let receivingLicenseCol = -1;
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader_(headers[i]) === 'receivinglicense') {
      receivingLicenseCol = i + 1;
      break;
    }
  }
  if (receivingLicenseCol < 1) return null;

  const values = rawSheet.getRange(dataStartRow, receivingLicenseCol, lastRow - dataStartRow + 1, 1).getDisplayValues();
  const counts = {};
  for (let i = 0; i < values.length; i++) {
    const token = String(values[i][0] || '').trim();
    if (!token) continue;
    counts[token] = (counts[token] || 0) + 1;
  }

  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (sorted.length === 0) return null;
  const dominantLicense = sorted[0];

  const match = resolveProfileByLicenseToken_(profiles, dominantLicense);
  if (!match) return null;

  return buildResolvedProfileResult_(match, 'detected_dominant', dominantLicense);
}

function getLocationRolesForProfile_(ss, profileId) {
  const profileToken = String(profileId || '').toUpperCase().trim();
  let locationRows = readLocationProfileMap_(ss)
    .filter(r => r.profileId === profileToken)
    .map(r => [r.locationName, r.role, r.includeInEngine, r.notes]);
  const defaultRows = buildDefaultLocationProfileRows_()
    .filter(r => String(r[0] || '').toUpperCase().trim() === profileToken)
    .map(r => [r[1], r[2], r[3] === true, r[4] || '']);

  if (locationRows.length === 0) {
    locationRows = defaultRows;
  } else if (defaultRows.length > 0) {
    const seen = {};
    for (let i = 0; i < locationRows.length; i++) {
      const key = normalizeToken_(locationRows[i][0]);
      if (key) seen[key] = true;
    }
    for (let i = 0; i < defaultRows.length; i++) {
      const key = normalizeToken_(defaultRows[i][0]);
      if (!key || seen[key]) continue;
      locationRows.push(defaultRows[i]);
    }
  }

  return locationRows;
}

function syncLocationRolesForProfile_(ss, profileId, options) {
  const opts = options || {};
  const settingsSheet = ss.getSheetByName('Restock Settings');
  if (!settingsSheet) return { rowCount: 0 };
  const stepDurations = {};
  let rowsWritten = 0;
  let checkboxRebuildPerformed = false;
  let namedRangesUpdatedCount = 0;

  const locStart = runTimedStep_(stepDurations, 'read_loc_start', function() {
    return parseInt(settingsSheet.getRange('N1').getValue(), 10) || 5;
  });
  const previousLocEnd = runTimedStep_(stepDurations, 'read_loc_end', function() {
    return parseInt(settingsSheet.getRange('N2').getValue(), 10) || (locStart - 1);
  });
  const maxRows = SYSTEM_REFERENCE.settingsLocationCapacity;
  const profileRows = runTimedStep_(stepDurations, 'load_profile_rows', function() {
    return getLocationRolesForProfile_(ss, profileId).slice(0, maxRows).map(r => [
      String(r[0] || '').trim(),
      String(r[1] || 'IGNORE').toUpperCase().trim(),
      r[2] === true,
      String(r[3] || '')
    ]);
  });
  const expectedSignature = buildLocationRoleSignature_(profileId, profileRows);
  const existingRows = runTimedStep_(stepDurations, 'read_existing_rows', function() {
    return readSettingsLocationRows_(settingsSheet, locStart, maxRows);
  });
  const existingSignature = buildLocationRoleSignature_(profileId, existingRows);
  const shouldSkipWrite = !opts.force && expectedSignature === existingSignature;

  if (!shouldSkipWrite) {
    runTimedStep_(stepDurations, 'write_location_rows', function() {
      settingsSheet.getRange(locStart, 1, maxRows, 4).clearContent();
      if (profileRows.length > 0) {
        settingsSheet.getRange(locStart, 1, profileRows.length, 4).setValues(profileRows);
        rowsWritten = profileRows.length;
      }
    });

    runTimedStep_(stepDurations, 'apply_role_validation', function() {
      const roleValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.locationRoleOptions, true)
        .setAllowInvalid(false)
        .build();
      settingsSheet.getRange(locStart, 2, maxRows, 1).setDataValidation(roleValidation);
    });

    runTimedStep_(stepDurations, 'apply_include_checkboxes', function() {
      const previousRows = previousLocEnd >= locStart ? (previousLocEnd - locStart + 1) : 0;
      const checkboxRows = Math.max(1, profileRows.length, previousRows);
      const includeRange = settingsSheet.getRange(locStart, 3, checkboxRows, 1);
      let hasCheckboxValidation = false;
      const firstValidation = settingsSheet.getRange(locStart, 3).getDataValidation();
      if (firstValidation) {
        hasCheckboxValidation = firstValidation.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.CHECKBOX;
      }
      if (!hasCheckboxValidation) {
        includeRange.insertCheckboxes();
        checkboxRebuildPerformed = true;
      }
      // Column C values are already written in write_location_rows. Re-write only when
      // checkbox validation was rebuilt to avoid a costly duplicate write pass.
      if (profileRows.length > 0 && checkboxRebuildPerformed) {
        const includeValues = profileRows.map(r => [r[2] === true]);
        settingsSheet.getRange(locStart, 3, includeValues.length, 1).setValues(includeValues);
      }
    });
  }

  const nextLocEnd = profileRows.length > 0 ? (locStart + profileRows.length - 1) : (locStart - 1);
  runTimedStep_(stepDurations, 'write_metadata', function() {
    settingsSheet.getRange('N2').setValue(nextLocEnd);
    settingsSheet.getRange('N5').setValue(expectedSignature);
    settingsSheet.getRange('F2').setValue('Active Profile: ' + profileId);
  });
  const shouldUpdateNamedRanges = opts.updateNamedRanges === true && !shouldSkipWrite && previousLocEnd !== nextLocEnd;
  if (shouldUpdateNamedRanges) {
    runTimedStep_(stepDurations, 'update_named_ranges', function() {
      createNamedRanges(ss, { locationOnly: true });
      namedRangesUpdatedCount = 2; // LocationRoles + LocationRolesLookup
    });
  }
  return {
    rowCount: profileRows.length,
    skipped: shouldSkipWrite,
    signatureChanged: expectedSignature !== existingSignature,
    expectedSignature: expectedSignature,
    existingSignature: existingSignature,
    rowsWritten: rowsWritten,
    checkboxRebuildPerformed: checkboxRebuildPerformed,
    namedRangesUpdatedCount: namedRangesUpdatedCount,
    stepDurationsMs: stepDurations
  };
}

function readSettingsLocationRows_(settingsSheet, locStart, maxRows) {
  const rows = [];
  const values = settingsSheet.getRange(locStart, 1, maxRows, 3).getValues();
  for (let i = 0; i < values.length; i++) {
    const locationName = String(values[i][0] || '').trim();
    if (!locationName) continue;
    const role = String(values[i][1] || 'IGNORE').toUpperCase().trim();
    const includeInEngine = parseBooleanWithFallback_(values[i][2], false);
    rows.push([locationName, role, includeInEngine, '']);
  }
  return rows;
}

function buildLocationRoleSignature_(profileId, rows) {
  const rowTokens = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const location = normalizeToken_(row[0]);
    const role = normalizeToken_(row[1] || 'IGNORE');
    const include = row[2] === true ? '1' : '0';
    rowTokens.push(location + '|' + role + '|' + include);
  }
  rowTokens.sort();
  const payload = normalizeToken_(profileId) + '||' + rowTokens.join('\n');
  return computeTextHash_(payload);
}

function computeTextHash_(payload) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(payload || ''));
  let hex = '';
  for (let i = 0; i < digest.length; i++) {
    const byte = (digest[i] + 256) % 256;
    hex += ('0' + byte.toString(16)).slice(-2);
  }
  return hex;
}

// ============================================================================
// RESTOCK SETTINGS TAB
// ============================================================================

function setupRestockSettingsTab(ss) {
  const sheet = ss.getSheetByName('Restock Settings');
  sheet.clear();

  // ==================== LOCATION ROLES SECTION ====================
  let currentRow = 1;
  sheet.getRange(currentRow, 1).setValue('LOCATION ROLES');
  sheet.getRange(currentRow, 1).setFontSize(14).setFontWeight('bold').setBackground(CONFIG.colors.settingsHeader);
  currentRow++;

  const activeProfile = resolveActiveStoreProfile_(ss, { allowOverride: true, useRawData: true });
  sheet.getRange(currentRow, 1).setValue('Maps Treez location names to roles for the restock engine');
  sheet.getRange(currentRow, 6).setValue('Active Profile: ' + activeProfile.profileId).setFontWeight('bold');
  sheet.getRange(currentRow, 11).setValue('Checklist View Mode').setFontWeight('bold');
  sheet.getRange(currentRow, 12).setValue('PRIORITY');
  const sortModeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.checklistSortModes, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(currentRow, 12).setDataValidation(sortModeValidation);
  sheet.getRange(currentRow, 13).setValue('PRIORITY = urgency order | LOCATION_WAVE = grouped by First Pull From');
  currentRow += 2;

  const locHeaders = ['Location Name', 'Location Role', 'Include in Engine', 'Notes'];
  sheet.getRange(currentRow, 1, 1, locHeaders.length).setValues([locHeaders]);
  sheet.getRange(currentRow, 1, 1, locHeaders.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  currentRow++;

  const locDataStartRow = currentRow;
  const maxLocationRows = SYSTEM_REFERENCE.settingsLocationCapacity;
  const seededRows = getLocationRolesForProfile_(ss, activeProfile.profileId).slice(0, maxLocationRows);
  if (seededRows.length > 0) {
    sheet.getRange(locDataStartRow, 1, seededRows.length, 4).setValues(seededRows);
  }

  const locRoleValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.locationRoleOptions, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(locDataStartRow, 2, maxLocationRows, 1).setDataValidation(locRoleValidation);

  const includeRange = sheet.getRange(locDataStartRow, 3, maxLocationRows, 1);
  includeRange.insertCheckboxes();

  currentRow += maxLocationRows + 3;

  // ==================== STOCKING RULES SECTION ====================
  sheet.getRange(currentRow, 1).setValue('STOCKING RULES');
  sheet.getRange(currentRow, 1).setFontSize(14).setFontWeight('bold').setBackground(CONFIG.colors.settingsHeader);
  currentRow++;

  sheet.getRange(currentRow, 1).setValue('Create custom restock rules. Fill in optional filter criteria (Brand, Type, Size, Name Contains).');
  currentRow++;
  sheet.getRange(currentRow, 1).setValue('Rules are matched by SPECIFICITY: more criteria filled = higher priority. Default rule catches everything else.');
  currentRow += 2;

  const ruleHeaders = ['Rule Name', 'Brand', 'Product Type', 'Size', 'Name Contains',
                       'Target', 'Warning', 'Critical', 'Active'];
  sheet.getRange(currentRow, 1, 1, ruleHeaders.length).setValues([ruleHeaders]);
  sheet.getRange(currentRow, 1, 1, ruleHeaders.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  currentRow++;

  const ruleDataStartRow = currentRow;
  sheet.getRange(currentRow, 1, STOCKING_RULES_DATA.length, 9).setValues(STOCKING_RULES_DATA);

  const prodTypeOptions = [''].concat(CONFIG.allowedProductTypes);
  const prodTypeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(prodTypeOptions, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(currentRow, 3, STOCKING_RULES_DATA.length, 1).setDataValidation(prodTypeValidation);

  const activeRange = sheet.getRange(currentRow, 9, STOCKING_RULES_DATA.length, 1);
  activeRange.insertCheckboxes();

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 60);
  sheet.setColumnWidth(7, 60);
  sheet.setColumnWidth(8, 60);
  sheet.setColumnWidth(9, 55);
  sheet.setColumnWidth(11, 150);
  sheet.setColumnWidth(12, 130);
  sheet.setColumnWidth(13, 360);

  const defaultRuleRow = currentRow + STOCKING_RULES_DATA.length - 1;
  sheet.getRange(defaultRuleRow, 1, 1, 9).setBackground('#e8f5e9');
  sheet.getRange(currentRow - 1, 10).setValue('Matching Info').setFontWeight('bold').setFontStyle('italic');
  sheet.getRange(currentRow, 10).setValue('Fill in criteria. More filled = higher priority');
  sheet.getRange(defaultRuleRow, 10).setValue('Default catches all unmatched products');
  sheet.setColumnWidth(10, 280);

  // Row marker metadata used by formulas + dynamic named ranges.
  sheet.getRange('N1').setValue(locDataStartRow);
  sheet.getRange('N2').setValue(seededRows.length > 0 ? (locDataStartRow + seededRows.length - 1) : (locDataStartRow - 1));
  sheet.getRange('N3').setValue(ruleDataStartRow);
  sheet.getRange('N4').setValue(ruleDataStartRow + STOCKING_RULES_DATA.length - 1);
  sheet.hideColumns(14);
}
// ============================================================================
// RESTOCK ENGINE (INTERNAL) TAB
// ============================================================================

function setupRestockEngineTab(ss) {
  const sheet = ss.getSheetByName('Restock Engine (Internal)');
  sheet.clear();
  
  // This tab contains all the processing formulas
  // Layout:
  // Columns A-Z: Eligible Rows (filtered from raw data with location roles)
  // Columns AB onwards: Product Summary with rule matching and calculations
  
  // ==================== SECTION A: ELIGIBLE ROWS ====================
  
  // Headers for eligible rows section
  const eligibleHeaders = [
    'External ID', 'Brand', 'Product Name', 'Product Type', 'Subtype', 'Size',
    'Classification', 'Available', 'Location', 'Date Received', 'Inventory Barcodes',
    'Location Role', 'Is Pick Shelf', 'Is Reserve', 'Pack Style'
  ];
  
  sheet.getRange(1, 1, 1, eligibleHeaders.length).setValues([eligibleHeaders]);
  sheet.getRange(1, 1, 1, eligibleHeaders.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  
  // Main filter formula to pull eligible rows from Treez Valuation
  // This filters for: ADULT inventory type, allowed product types, Available > 0
  const rawSheet = "'Treez Valuation (Raw)'";
  const startRow = CONFIG.rawDataStartRow + 1; // Data starts after header
  
  // Build the FILTER formula
  // Column references updated December 2025 for new Treez format:
  // - AT = External ID (was AR/col 44, now col 46)
  // - AU = Inventory Type (was AS/col 45, now col 47)
  // - AI = Inventory Barcodes (was AG/col 33, now col 35)
  // - AR = Size (was AP/col 42, now col 44)
  const filterFormula = `=IFERROR(FILTER(
    {${rawSheet}!AT${startRow}:AT, ${rawSheet}!L${startRow}:L, ${rawSheet}!M${startRow}:M, ${rawSheet}!J${startRow}:J, ${rawSheet}!K${startRow}:K, ${rawSheet}!AR${startRow}:AR, ${rawSheet}!N${startRow}:N, ${rawSheet}!P${startRow}:P, ${rawSheet}!Y${startRow}:Y, ${rawSheet}!C${startRow}:C, ${rawSheet}!AI${startRow}:AI},
    (${rawSheet}!AU${startRow}:AU="ADULT") *
    (${rawSheet}!P${startRow}:P>0) *
    (REGEXMATCH(${rawSheet}!J${startRow}:J, "FLOWER|PREROLL|CARTRIDGE|EDIBLE|EXTRACT|BEVERAGE|TINCTURE|TOPICAL|PILL"))
  ), "")`;
  
  sheet.getRange(2, 1).setFormula(filterFormula);
  
  // Location Role lookup (column L = 12) using dynamic bounds from Restock Settings!N1:N2
  sheet.getRange(2, 12).setFormula(
    `=ARRAYFORMULA(IF(A2:A="","",IFERROR(VLOOKUP(I2:I,INDIRECT("'Restock Settings'!A"&'Restock Settings'!$N$1&":B"&'Restock Settings'!$N$2),2,FALSE),"IGNORE")))`
  );
  
  // Is Pick Shelf (column M = 13) - SIMPLIFIED
  sheet.getRange(2, 13).setFormula(
    `=ARRAYFORMULA(IF(A2:A="","",L2:L="PICK SHELF"))`
  );
  
  // Is Reserve (column N = 14) - SIMPLIFIED
  sheet.getRange(2, 14).setFormula(
    `=ARRAYFORMULA(IF(A2:A="","",L2:L="RESERVE"))`
  );
  
  // Pack Style detection (column O = 15) - DISABLED for MVP, always "Single"
  sheet.getRange(2, 15).setFormula(
    `=ARRAYFORMULA(IF(A2:A="","","Single"))`
  );
  
  // ==================== SECTION B: PRODUCT SUMMARY ====================
  // Starting at column Q (17)
  
  const summaryStartCol = 17;
  const summaryHeaders = [
    'External ID', 'Brand', 'Product Name', 'Product Type', 'Subtype', 'Size',
    'Classification', 'Pack Style', 'Pick Shelf Qty', 'Reserve Qty', 'Total Qty',
    'Oldest Reserve Date', 'All Barcodes', 'Unique Barcode Count', 'Primary Shelf Barcode',
    'Matched Rule', 'Target', 'Warning', 'Critical',
    'Needs Restock', 'Urgency', 'Shortfall', 'Recommended Pull Qty',
    'First Pull Location', 'First Pull Qty', 'First Pull Date', 'First Pull Barcode Match',
    'Then Pull Location', 'Then Pull Qty', 'Then Pull Date', 'Then Pull Barcode Match',
    'First Pull From', 'Then Pull From', 'Barcode Match'
  ];
  
  sheet.getRange(1, summaryStartCol, 1, summaryHeaders.length).setValues([summaryHeaders]);
  sheet.getRange(1, summaryStartCol, 1, summaryHeaders.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  
  // Unique External IDs (only from Pick Shelf or Reserve locations)
  // Use bounded range to avoid spill conflicts
  sheet.getRange(2, summaryStartCol).setFormula(
    `=IFERROR(UNIQUE(FILTER(A2:A5000, (M2:M5000=TRUE)+(N2:N5000=TRUE), A2:A5000<>"")),"")` 
  );
  
  // Product metadata lookups - SIMPLIFIED with VLOOKUP instead of MAP
  // Brand (col R = 18)
  sheet.getRange(2, summaryStartCol + 1).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",IFERROR(VLOOKUP(Q2:Q,{$A$2:$A$5000,$B$2:$B$5000},2,FALSE),"")))`
  );
  
  // Product Name (col S = 19)
  sheet.getRange(2, summaryStartCol + 2).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",IFERROR(VLOOKUP(Q2:Q,{$A$2:$A$5000,$C$2:$C$5000},2,FALSE),"")))`
  );
  
  // Product Type (col T = 20)
  sheet.getRange(2, summaryStartCol + 3).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",IFERROR(VLOOKUP(Q2:Q,{$A$2:$A$5000,$D$2:$D$5000},2,FALSE),"")))`
  );
  
  // Subtype (col U = 21)
  sheet.getRange(2, summaryStartCol + 4).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",IFERROR(VLOOKUP(Q2:Q,{$A$2:$A$5000,$E$2:$E$5000},2,FALSE),"")))`
  );
  
  // Size (col V = 22)
  sheet.getRange(2, summaryStartCol + 5).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",IFERROR(VLOOKUP(Q2:Q,{$A$2:$A$5000,$F$2:$F$5000},2,FALSE),"")))`
  );
  
  // Classification (col W = 23)
  sheet.getRange(2, summaryStartCol + 6).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",IFERROR(VLOOKUP(Q2:Q,{$A$2:$A$5000,$G$2:$G$5000},2,FALSE),"")))`
  );
  
  // Pack Style (col X = 24) - SIMPLIFIED, just return "Single" for MVP
  sheet.getRange(2, summaryStartCol + 7).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","","Single"))`
  );
  
  // Pick Shelf Qty (col Y = 25) - Keep MAP for aggregation (it works)
  sheet.getRange(2, summaryStartCol + 8).setFormula(
    `=IF(Q2="","",MAP(Q2:Q,LAMBDA(id,IF(id="","",SUMIFS($H$2:$H$5000,$A$2:$A$5000,id,$M$2:$M$5000,TRUE)))))`
  );
  
  // Reserve Qty (col Z = 26) - Keep MAP for aggregation (it works)
  sheet.getRange(2, summaryStartCol + 9).setFormula(
    `=IF(Q2="","",MAP(Q2:Q,LAMBDA(id,IF(id="","",SUMIFS($H$2:$H$5000,$A$2:$A$5000,id,$N$2:$N$5000,TRUE)))))`
  );
  
  // Total Qty (col AA = 27) - SIMPLIFIED
  sheet.getRange(2, summaryStartCol + 10).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",Y2:Y+Z2:Z))`
  );
  
  // Oldest Reserve Date (col AB = 28) - FIFO: Oldest inventory in reserve
  // TEXT() formats the serial number as readable date (M/D/YYYY)
  sheet.getRange(2, summaryStartCol + 11).setFormula(
    `=IF(Q2="","",MAP(Q2:Q,LAMBDA(id,IF(id="","",IFERROR(TEXT(MINIFS($J$2:$J$5000,$A$2:$A$5000,id,$N$2:$N$5000,TRUE),"M/D/YYYY"),"")))))`
  );
  
  // All Barcodes (col AC = 29) - DISABLED for MVP
  sheet.getRange(2, summaryStartCol + 12).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))` 
  );
  
  // Unique Barcode Count (col AD = 30) - DISABLED for MVP, return 1
  sheet.getRange(2, summaryStartCol + 13).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",1))`
  );
  
  // Primary Shelf Barcode (col AE = 31) - DISABLED for MVP
  sheet.getRange(2, summaryStartCol + 14).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))`
  );
  
  // ==================== RULE MATCHING (Script-Based) ====================
  // Columns AF-AI are populated by applyStockingRules() during Refresh Checklist
  // The script reads rules from Restock Settings and matches each product
  // based on specificity (more criteria = higher priority)
  // 
  // These columns are intentionally NOT formulas - they're written by script:
  // - AF = Matched Rule name
  // - AG = Target (from matched rule)
  // - AH = Warning (from matched rule)
  // - AI = Critical (from matched rule)
  //
  // Fill a range with default values to ensure ARRAYFORMULA in AJ/AK works
  // before first Refresh. Script will overwrite these values.
  const defaultRowCount = 500; // Pre-fill this many rows with defaults
  
  // Matched Rule (col AF = 32) - Populated by applyStockingRules()
  const defaultRuleNames = Array(defaultRowCount).fill(['(Run Refresh)']);
  sheet.getRange(2, summaryStartCol + 15, defaultRowCount, 1).setValues(defaultRuleNames);
  
  // Target (col AG = 33) - Default: 7, overwritten by script
  const defaultTargets = Array(defaultRowCount).fill([7]);
  sheet.getRange(2, summaryStartCol + 16, defaultRowCount, 1).setValues(defaultTargets);
  
  // Warning (col AH = 34) - Default: 4, overwritten by script
  const defaultWarnings = Array(defaultRowCount).fill([4]);
  sheet.getRange(2, summaryStartCol + 17, defaultRowCount, 1).setValues(defaultWarnings);
  
  // Critical (col AI = 35) - Default: 2, overwritten by script
  const defaultCriticals = Array(defaultRowCount).fill([2]);
  sheet.getRange(2, summaryStartCol + 18, defaultRowCount, 1).setValues(defaultCriticals);
  
  // ==================== RESTOCK CALCULATIONS - SIMPLIFIED ====================
  
  // Needs Restock (col AJ = 36) - Pick Shelf Qty (Y) < Target (AG)
  sheet.getRange(2, summaryStartCol + 19).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",Y2:Y<AG2:AG))`
  );
  
  // Urgency (col AK = 37) - Numbered prefix for correct alphabetical sorting
  // "1 - Critical" < "2 - Soon" < "3 - Low" sorts correctly
  sheet.getRange(2, summaryStartCol + 20).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",IF(Y2:Y<=AI2:AI,"1 - Critical",IF(Y2:Y<=AH2:AH,"2 - Soon","3 - Low"))))`
  );
  
  // Shortfall (col AL = 38)
  sheet.getRange(2, summaryStartCol + 21).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",MAX(0,AG2:AG-Y2:Y)))`
  );
  
  // Recommended Pull Qty (col AM = 39) - Pull enough to reach Target, but no more than Reserve
  // Uses Shortfall (Target - Pick Shelf Qty) to avoid over-stocking the floor
  // Formula: MIN(Shortfall, Reserve Qty) - pull only what's needed
  sheet.getRange(2, summaryStartCol + 22).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",MIN(AL2:AL,Z2:Z)))`
  );
  
  // ==================== PULL PLANNING - DISABLED FOR MVP ====================
  // All pull location formulas disabled - just show "Check backstock" message
  
  // First Pull Location (col AN = 40) - DISABLED
  sheet.getRange(2, summaryStartCol + 23).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))`
  );
  
  // First Pull Qty (col AO = 41) - DISABLED
  sheet.getRange(2, summaryStartCol + 24).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",0))`
  );
  
  // First Pull Date (col AP = 42) - DISABLED
  sheet.getRange(2, summaryStartCol + 25).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))`
  );
  
  // First Pull Barcode Match (col AQ = 43) - DISABLED
  sheet.getRange(2, summaryStartCol + 26).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))`
  );
  
  // Then Pull Location (col AR = 44) - DISABLED
  sheet.getRange(2, summaryStartCol + 27).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))`
  );
  
  // Then Pull Qty (col AS = 45) - DISABLED
  sheet.getRange(2, summaryStartCol + 28).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",0))`
  );
  
  // Then Pull Date (col AT = 46) - DISABLED
  sheet.getRange(2, summaryStartCol + 29).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))`
  );
  
  // Then Pull Barcode Match (col AU = 47) - DISABLED
  sheet.getRange(2, summaryStartCol + 30).setFormula(
    `=ARRAYFORMULA(IF(Q2:Q="","",""))`
  );
  
  // First Pull From formatted string (col AV = 48) - Shows first reserve location with qty
  // Format: "LOCATION_NAME (QTY)"
  sheet.getRange(2, summaryStartCol + 31).setFormula(
    `=IF(Q2="","",MAP(Q2:Q,LAMBDA(id,IF(id="","",IFERROR(INDEX(FILTER($I$2:$I$5000,($A$2:$A$5000=id)*($N$2:$N$5000=TRUE)),1)&" ("&INDEX(FILTER($H$2:$H$5000,($A$2:$A$5000=id)*($N$2:$N$5000=TRUE)),1)&")","No reserve")))))`
  );
  
  // Then Pull From formatted string (col AW = 49) - Shows SECOND reserve location with qty
  // Format: "LOCATION_NAME (QTY)" - empty if no second location exists
  sheet.getRange(2, summaryStartCol + 32).setFormula(
    `=IF(Q2="","",MAP(Q2:Q,LAMBDA(id,IF(id="","",IFERROR(INDEX(FILTER($I$2:$I$5000,($A$2:$A$5000=id)*($N$2:$N$5000=TRUE)),2)&" ("&INDEX(FILTER($H$2:$H$5000,($A$2:$A$5000=id)*($N$2:$N$5000=TRUE)),2)&")","")))))`
  );
  
  // Barcode Match QC (col AX = 50) - Checks if product has multiple different barcodes
  // Column K ($K$2:$K$5000) contains Inventory Barcodes from raw data
  // OK = all inventory rows have same barcode
  // CHECK = multiple different barcodes exist (staff should verify before pulling)
  sheet.getRange(2, summaryStartCol + 33).setFormula(
    `=IF(Q2="","",MAP(Q2:Q,LAMBDA(id,IF(id="","",IF(ROWS(UNIQUE(FILTER($K$2:$K$5000,($A$2:$A$5000=id)*($K$2:$K$5000<>""))))>1,"CHECK","OK")))))`
  );
  
  // Set column widths for eligible rows section (columns A-O)
  for (let i = 1; i <= 15; i++) {
    sheet.setColumnWidth(i, 100);
  }
  sheet.setColumnWidth(3, 200); // Product Name
  sheet.setColumnWidth(11, 120); // Barcodes
  
  // Set column widths for product summary section (columns Q onwards)
  for (let i = summaryStartCol; i <= summaryStartCol + 33; i++) {
    sheet.setColumnWidth(i, 100);
  }
  sheet.setColumnWidth(summaryStartCol + 2, 200);  // Product Name
  sheet.setColumnWidth(summaryStartCol + 12, 180); // All Barcodes
  sheet.setColumnWidth(summaryStartCol + 14, 150); // Primary Shelf Barcode
  sheet.setColumnWidth(summaryStartCol + 31, 200); // First Pull From
  sheet.setColumnWidth(summaryStartCol + 32, 200); // Then Pull From
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

// ============================================================================
// RESTOCK CHECKLIST TAB
// ============================================================================

function setupRestockChecklistTab(ss) {
  const sheet = ensureSheetByCompatName_(ss, 'Restock List');
  sheet.clear();
  
  // Header area - Row 1: Title + Dates (compact layout)
  sheet.getRange('A1').setValue('VAULT RESTOCK LIST');
  sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  // Valuation Date (with proper date/time formatting)
  sheet.getRange('D1').setValue('Valuation:');
  sheet.getRange('E1').setFormula(`=IFERROR(TEXT('Treez Valuation (Raw)'!A7,"M/D/YYYY")&" "&TEXT('Treez Valuation (Raw)'!B7,"h:mm AM/PM"),"No data imported")`);
  
  // Generated timestamp
  sheet.getRange('G1').setValue('Generated:');
  sheet.getRange('H1').setFormula('=NOW()');
  sheet.getRange('H1').setNumberFormat('M/D/YYYY h:mm AM/PM');

  // Checklist view mode (manager-controlled in Restock Settings)
  sheet.getRange('I1').setValue('View:');
  sheet.getRange('J1').setFormula(`=IFERROR('Restock Settings'!L2,"PRIORITY")`);
  sheet.getRange('K1').setFormula(`=IF(J1="LOCATION_WAVE","Grouped by First Pull From","Sorted by Urgency")`);
  
  // Column headers (row 2 - tight layout, no instructions/legend)
  const headerRow = 2;
  sheet.getRange(headerRow, 1, 1, CONFIG.checklistColumns.length).setValues([CONFIG.checklistColumns]);
  sheet.getRange(headerRow, 1, 1, CONFIG.checklistColumns.length)
    .setFontWeight('bold')
    .setBackground(CONFIG.colors.header)
    .setBorder(true, true, true, true, true, true)
    .setHorizontalAlignment('center');  // Center all headers
  
  // Thick bottom border under header row
  sheet.getRange(headerRow, 1, 1, CONFIG.checklistColumns.length)
    .setBorder(null, null, true, null, null, null, CONFIG.colors.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  
  // Data formulas (row 3+)
  const dataRow = 3;
  const engine = "'Restock Engine (Internal)'";
  
  // Filter to only show products that need restock, sorted by urgency
  // New column mappings from enhanced Engine:
  // - Urgency: AK (col 37)
  // - Brand: R, Product: S, Type: T, Size: V, Classification: W
  // - Pick Shelf Qty: Y, Reserve Qty: Z, Target: AG, Recommended Pull: AM
  // - First Pull From: AV, Then Pull From: AW
  // - Barcode Match QC: AX, Oldest Date: AB
  // - Needs Restock: AJ
  
  // Use FILTER + SORT with two modes:
  // - PRIORITY: urgency-first (default)
  // - LOCATION_WAVE: first pull location first, then urgency
  // Output: 12 formula columns, then 4 manual columns (13-16), then 2 more formula columns
  // CRITICAL: Only show products with Reserve Qty > 0 (must have backstock to pull)
  // Column mapping:
  //   Urgency=AK, Brand=R, Product=S, Type=T, Size=V, Classification=W
  //   Pick Shelf Qty=Y, Reserve Qty=Z, Target=AG (from matched rule), Recommended Pull=AM
  //   First Pull From=AV, Then Pull From=AW
  const mainQuery = `=IFERROR(
    IF('Restock Settings'!$L$2="LOCATION_WAVE",
      SORT(
        FILTER(
          {${engine}!AK2:AK5000, ${engine}!R2:R5000, ${engine}!S2:S5000, ${engine}!T2:T5000, ${engine}!V2:V5000, ${engine}!W2:W5000, ${engine}!Y2:Y5000, ${engine}!Z2:Z5000, ${engine}!AG2:AG5000, ${engine}!AM2:AM5000, ${engine}!AV2:AV5000, ${engine}!AW2:AW5000},
          ${engine}!AJ2:AJ5000=TRUE, ${engine}!Q2:Q5000<>"", ${engine}!Z2:Z5000>0
        ),
        11, TRUE, 1, TRUE, 3, TRUE
      ),
      SORT(
        FILTER(
          {${engine}!AK2:AK5000, ${engine}!R2:R5000, ${engine}!S2:S5000, ${engine}!T2:T5000, ${engine}!V2:V5000, ${engine}!W2:W5000, ${engine}!Y2:Y5000, ${engine}!Z2:Z5000, ${engine}!AG2:AG5000, ${engine}!AM2:AM5000, ${engine}!AV2:AV5000, ${engine}!AW2:AW5000},
          ${engine}!AJ2:AJ5000=TRUE, ${engine}!Q2:Q5000<>"", ${engine}!Z2:Z5000>0
        ),
        1, TRUE, 3, TRUE
      )
    ),
  "")`;
  
  sheet.getRange(dataRow, 1).setFormula(mainQuery);
  
  // QC columns at the end (columns 17-18)
  // These formulas only output for rows that have data (check column B)
  // Barcode Match (column 17) - lookup from Engine using Product Name as key
  sheet.getRange(dataRow, 17).setFormula(
    `=ARRAYFORMULA(IF(B3:B="","",IFERROR(VLOOKUP(C3:C,{${engine}!S$2:S,${engine}!AX$2:AX},2,FALSE),"")))`
  );
  
  // Oldest Backstock Date (column 18)
  sheet.getRange(dataRow, 18).setFormula(
    `=ARRAYFORMULA(IF(B3:B="","",IFERROR(VLOOKUP(C3:C,{${engine}!S$2:S,${engine}!AB$2:AB},2,FALSE),"")))`
  );
  
  // NOTE: Checkboxes and dropdowns are NOT pre-created here.
  // Run refreshChecklist() after each import to dynamically add them for actual data rows only.
  
  // Set column widths - optimized for portrait printing
  sheet.setColumnWidth(1, 75);   // Urgency
  sheet.setColumnWidth(2, 100);  // Brand (hidden)
  sheet.setColumnWidth(3, 300);  // Product
  sheet.setColumnWidth(4, 80);   // Type (hidden)
  sheet.setColumnWidth(5, 80);   // Size (hidden)
  sheet.setColumnWidth(6, 80);   // Classification (hidden)
  sheet.setColumnWidth(7, 30);   // Flr (Pick Shelf Qty)
  sheet.setColumnWidth(8, 30);   // Bck (Reserve Qty)
  sheet.setColumnWidth(9, 80);   // Target (hidden)
  sheet.setColumnWidth(10, 80);  // Recommended Pull (hidden)
  sheet.setColumnWidth(11, 130); // First Pull From
  sheet.setColumnWidth(12, 130); // Then Pull From
  sheet.setColumnWidth(13, 35);  // Pull (Units Pulled)
  sheet.setColumnWidth(14, 80);  // Status (hidden)
  sheet.setColumnWidth(15, 40);  // Done
  sheet.setColumnWidth(16, 100); // Notes
  sheet.setColumnWidth(17, 65);  // BC Match
  sheet.setColumnWidth(18, 100); // Oldest Date (hidden)
  
  // Hide columns by default (can be unhidden manually if needed)
  // Visible columns for portrait printing: Urgency, Product, Flr, Bck, First Pull From, Then Pull From, Pull, Done, Notes, BC Match
  sheet.hideColumns(2);   // Brand
  sheet.hideColumns(4);   // Type
  sheet.hideColumns(5);   // Size / Strength
  sheet.hideColumns(6);   // Classification
  sheet.hideColumns(9);   // Target Pick Qty
  sheet.hideColumns(10);  // Recommended Pull Qty
  sheet.hideColumns(14);  // Restock Status
  sheet.hideColumns(18);  // Oldest Backstock Date
  
  // Freeze header rows
  sheet.setFrozenRows(headerRow);
  
  // NOTE: Borders and row visibility are set dynamically by refreshChecklist()
}

// ============================================================================
// NO RESERVE RISK TAB
// ============================================================================

function setupNoReserveRiskTab(ss) {
  const sheet = ensureSheetByCompatName_(ss, 'Backstock Alerts');
  sheet.clear();

  sheet.getRange('A1').setValue('BACKSTOCK ALERTS').setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Products below target with zero reserve quantity. Use this list for reorder/transfer decisions and mapping audits.');

  sheet.getRange('A3').setValue('At-Risk Items').setFontWeight('bold');
  sheet.getRange('B3').setFormula('=IFERROR(COUNTA(A7:A),0)');
  sheet.getRange('D3').setValue('Critical').setFontWeight('bold');
  sheet.getRange('E3').setFormula('=COUNTIF(A7:A,"1 - Critical")');
  sheet.getRange('G3').setValue('Soon').setFontWeight('bold');
  sheet.getRange('H3').setFormula('=COUNTIF(A7:A,"2 - Soon")');
  sheet.getRange('J3').setValue('Low').setFontWeight('bold');
  sheet.getRange('K3').setFormula('=COUNTIF(A7:A,"3 - Low")');

  const headers = [
    'Urgency',
    'Brand',
    'Product',
    'Type',
    'Size / Strength',
    'Flr',
    'Reserve',
    'Target',
    'Shortfall',
    'SKU / External ID',
    'Suggested Action'
  ];
  const headerRow = 6;
  sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(headerRow, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground(CONFIG.colors.header)
    .setBorder(true, true, true, true, true, true);

  const engine = "'Restock Engine (Internal)'";
  const formula = `=IFERROR(
    SORT(
      FILTER(
        {${engine}!AK2:AK5000, ${engine}!R2:R5000, ${engine}!S2:S5000, ${engine}!T2:T5000, ${engine}!V2:V5000, ${engine}!Y2:Y5000, ${engine}!Z2:Z5000, ${engine}!AG2:AG5000, ${engine}!AL2:AL5000, ${engine}!Q2:Q5000, IF(${engine}!Q2:Q5000<>"","REORDER / TRANSFER / CHECK MAPPING","")},
        ${engine}!AJ2:AJ5000=TRUE, ${engine}!Q2:Q5000<>"", ${engine}!Z2:Z5000<=0
      ),
      1, TRUE, 9, FALSE, 3, TRUE
    ),
  "")`;
  sheet.getRange(7, 1).setFormula(formula);

  const widths = [85, 120, 320, 90, 110, 50, 70, 60, 70, 170, 250];
  for (let i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(headerRow, 1, 2, headers.length).createFilter();
  sheet.setFrozenRows(headerRow);

  // Conditional formatting by urgency for at-risk rows.
  const riskRange = sheet.getRange(7, 1, 500, headers.length);
  const rules = [];
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A7="1 - Critical"')
      .setBackground(CONFIG.colors.critical)
      .setRanges([riskRange])
      .build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A7="2 - Soon"')
      .setBackground(CONFIG.colors.soon)
      .setRanges([riskRange])
      .build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A7="3 - Low"')
      .setBackground(CONFIG.colors.low)
      .setRanges([riskRange])
      .build()
  );
  sheet.setConditionalFormatRules(rules);
}

// ============================================================================
// DATA EXCEPTIONS TAB
// ============================================================================

function setupDataExceptionsTab(ss) {
  const sheet = ensureSheetByCompatName_(ss, 'Data Watchlist');
  sheet.clear();
  
  // Header
  sheet.getRange('A1').setValue('DATA WATCHLIST');
  sheet.getRange('A1').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('Rows from Treez Valuation that were excluded from processing');
  
  // Column headers
  const headerRow = 4;
  const headers = ['Brand', 'Product Name', 'Product Type', 'Location', 'Size', 'Available', 'Inventory Type', 'Reason'];
  sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(headerRow, 1, 1, headers.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  
  // Formula to capture exceptions
  const rawSheet = "'Treez Valuation (Raw)'";
  const startRow = CONFIG.rawDataStartRow + 1;
  
  // Exception types:
  // 1. Unknown location (not in Location Roles)
  // 2. Non-ADULT inventory type
  // 3. MERCH product type
  // 4. Zero available
  
  // Column references updated December 2025 for new Treez format:
  // - AR = Size (was AP/col 42, now col 44)
  // - AU = Inventory Type (was AS/col 45, now col 47)
  const exceptionFormula = `=IFERROR(QUERY(
    {${rawSheet}!L${startRow}:L, ${rawSheet}!M${startRow}:M, ${rawSheet}!J${startRow}:J, ${rawSheet}!Y${startRow}:Y, ${rawSheet}!AR${startRow}:AR, ${rawSheet}!P${startRow}:P, ${rawSheet}!AU${startRow}:AU,
     IF(ISERROR(VLOOKUP(${rawSheet}!Y${startRow}:Y,INDIRECT("'Restock Settings'!A"&'Restock Settings'!$N$1&":B"&'Restock Settings'!$N$2),2,FALSE)),"UNKNOWN_LOCATION",
       IF(${rawSheet}!AU${startRow}:AU<>"ADULT","NON_ADULT_INVENTORY",
         IF(${rawSheet}!J${startRow}:J="MERCH","MERCH_EXCLUDED",
           IF(${rawSheet}!P${startRow}:P<=0,"ZERO_AVAILABLE","OK"))))},
    "SELECT * WHERE Col8 <> 'OK' AND Col8 <> '' AND Col1 <> ''",
    0
  ), "")`;
  
  sheet.getRange(headerRow + 1, 1).setFormula(exceptionFormula);
  
  // Set column widths
  sheet.setColumnWidth(1, 120);  // Brand
  sheet.setColumnWidth(2, 280);  // Product Name
  sheet.setColumnWidth(3, 100);  // Product Type
  sheet.setColumnWidth(4, 150);  // Location
  sheet.setColumnWidth(5, 80);   // Size
  sheet.setColumnWidth(6, 80);   // Available
  sheet.setColumnWidth(7, 100);  // Inventory Type
  sheet.setColumnWidth(8, 180);  // Reason
  
  // Freeze header
  sheet.setFrozenRows(headerRow);
}

// ============================================================================
// COMPLIANCE TABS
// ============================================================================

function setupComplianceConfigTab(ss) {
  const sheet = ss.getSheetByName(COMPLIANCE_DEFAULTS.configSheetName);
  sheet.clear();

  sheet.getRange('A1:B1').setValues([['Setting', 'Value']]);
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground(CONFIG.colors.header);

  const settings = [
    ['raw_sheet_name', COMPLIANCE_DEFAULTS.rawSheetName],
    ['header_row', COMPLIANCE_DEFAULTS.headerRow],
    ['data_start_row', COMPLIANCE_DEFAULTS.dataStartRow],
    ['processed_logic_mode', COMPLIANCE_DEFAULTS.processedLogicMode],
    ['require_qty_gt_zero', COMPLIANCE_DEFAULTS.requireQtyGtZero],
    ['product_type_scope', COMPLIANCE_DEFAULTS.productTypeScope]
  ];
  sheet.getRange(2, 1, settings.length, 2).setValues(settings);

  const logicValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['STATUS', 'LOCATION', 'EITHER'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('B5').setDataValidation(logicValidation);

  const typeScopeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['ALL', 'CANNABIS_ONLY'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('B7').setDataValidation(typeScopeValidation);

  const qtyCell = sheet.getRange('B6');
  qtyCell.insertCheckboxes();
  qtyCell.setValue(true);

  sheet.getRange('F1:G1').setValues([['canonical_field', 'alias_header']]);
  sheet.getRange('F1:G1').setFontWeight('bold').setBackground(CONFIG.colors.header);

  const aliasRows = [];
  for (let i = 0; i < COMPLIANCE_DEFAULTS.canonicalFields.length; i++) {
    const canonical = COMPLIANCE_DEFAULTS.canonicalFields[i];
    const aliases = COMPLIANCE_DEFAULTS.aliases[canonical] || [];
    for (let j = 0; j < aliases.length; j++) {
      aliasRows.push([canonical, aliases[j]]);
    }
  }
  if (aliasRows.length > 0) {
    sheet.getRange(2, 6, aliasRows.length, 2).setValues(aliasRows);
  }

  sheet.getRange('J1').setValue('processed_status_allowlist').setFontWeight('bold').setBackground(CONFIG.colors.header);
  sheet.getRange('K1').setValue('excluded_locations').setFontWeight('bold').setBackground(CONFIG.colors.header);
  sheet.getRange('L1').setValue('cannabis_types_allowlist').setFontWeight('bold').setBackground(CONFIG.colors.header);
  sheet.getRange('M1').setValue('missing_tokens').setFontWeight('bold').setBackground(CONFIG.colors.header);

  sheet.getRange(2, 10, COMPLIANCE_DEFAULTS.processedStatusAllowlist.length, 1)
    .setValues(COMPLIANCE_DEFAULTS.processedStatusAllowlist.map(v => [v]));
  sheet.getRange(2, 11, COMPLIANCE_DEFAULTS.excludedLocations.length, 1)
    .setValues(COMPLIANCE_DEFAULTS.excludedLocations.map(v => [v]));
  sheet.getRange(2, 12, COMPLIANCE_DEFAULTS.cannabisProductTypes.length, 1)
    .setValues(COMPLIANCE_DEFAULTS.cannabisProductTypes.map(v => [v]));
  sheet.getRange(2, 13, COMPLIANCE_DEFAULTS.missingTokens.length, 1)
    .setValues(COMPLIANCE_DEFAULTS.missingTokens.map(v => [v]));

  sheet.getRange('A9').setValue('Config Notes').setFontWeight('bold');
  sheet.getRange('A10').setValue('Update values/lists here to tune compliance behavior without code changes.');
  sheet.getRange('A11').setValue('Aliases are matched by normalized header text with fuzzy fallback.');

  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 240);
  sheet.setColumnWidth(10, 190);
  sheet.setColumnWidth(11, 190);
  sheet.setColumnWidth(12, 190);
  sheet.setColumnWidth(13, 140);
  sheet.setFrozenRows(1);
}

function setupMissingComplianceTab(ss) {
  const sheet = ensureSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.outputSheetName);
  sheet.clear();

  sheet.getRange('A1').setValue('COMPLIANCE ALERTS').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('Use Restock -> Run Daily Update or Run Compliance Only to generate this report.');
  sheet.setColumnWidth(1, 120);
}

function setupComplianceLogTab(ss) {
  const sheet = ensureSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.logSheetName);
  sheet.clear();

  const headers = [
    'Timestamp',
    'Total Rows Scanned',
    'Processed Rows',
    'Flagged Rows',
    'Missing THC',
    'Missing Expiration',
    'Missing Both',
    'Warnings'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(8, 520);
}

// ============================================================================
// FORMATTING
// ============================================================================

function applyAllFormatting(ss) {
  applyChecklistConditionalFormatting(ss);
}

function applyChecklistConditionalFormatting(ss) {
  const sheet = getSheetByCompatName_(ss, 'Restock List');
  if (!sheet) return;
  const dataStartRow = 3;
  const numCols = CONFIG.checklistColumns.length;
  // Use large range - formula-based rules only highlight rows with matching data
  const maxRows = 500;
  
  // Clear existing conditional formatting
  sheet.clearConditionalFormatRules();
  
  const rules = [];
  
  // Rule 1: Critical urgency - red background (numbered prefix for sort)
  const criticalRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$A3="1 - Critical"')
    .setBackground(CONFIG.colors.critical)
    .setRanges([sheet.getRange(dataStartRow, 1, maxRows, numCols)])
    .build();
  rules.push(criticalRule);
  
  // Rule 2: Soon urgency - amber background  
  const soonRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$A3="2 - Soon"')
    .setBackground(CONFIG.colors.soon)
    .setRanges([sheet.getRange(dataStartRow, 1, maxRows, numCols)])
    .build();
  rules.push(soonRule);
  
  // Rule 3: Low urgency - green background
  const lowRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$A3="3 - Low"')
    .setBackground(CONFIG.colors.low)
    .setRanges([sheet.getRange(dataStartRow, 1, maxRows, numCols)])
    .build();
  rules.push(lowRule);
  
  // Rule 4: Zebra striping - subtle alternating rows (lower priority than urgency)
  // Only applies to rows that don't have urgency colors
  const zebraRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(MOD(ROW(),2)=1,$A3<>"")')
    .setBackground('#f8f9fa')  // Very light grey
    .setRanges([sheet.getRange(dataStartRow, 1, maxRows, numCols)])
    .build();
  rules.push(zebraRule);
  
  // Rule 5: Done = TRUE - grey text (higher priority, will override urgency colors for text)
  const doneRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$O3=TRUE')
    .setFontColor(CONFIG.colors.doneText)
    .setRanges([sheet.getRange(dataStartRow, 1, maxRows, numCols)])
    .build();
  rules.push(doneRule);
  
  // Rule 6: Done = TRUE on Product column - strikethrough
  const strikethroughRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$O3=TRUE')
    .setStrikethrough(true)
    .setRanges([sheet.getRange(dataStartRow, 3, maxRows, 1)]) // Product column only
    .build();
  rules.push(strikethroughRule);
  
  sheet.setConditionalFormatRules(rules);
}

// ============================================================================
// NAMED RANGES
// ============================================================================

function buildNamedRangeMap_(ss) {
  const map = {};
  const ranges = ss.getNamedRanges();
  for (let i = 0; i < ranges.length; i++) {
    map[ranges[i].getName()] = ranges[i];
  }
  return map;
}

function setOrUpdateNamedRange_(ss, namedRangeMap, name, range) {
  const existing = namedRangeMap[name];
  if (existing) {
    const existingRange = existing.getRange();
    const unchanged =
      existingRange.getSheet().getSheetId() === range.getSheet().getSheetId() &&
      existingRange.getRow() === range.getRow() &&
      existingRange.getColumn() === range.getColumn() &&
      existingRange.getNumRows() === range.getNumRows() &&
      existingRange.getNumColumns() === range.getNumColumns();
    if (!unchanged) {
      existing.setRange(range);
    }
  } else {
    ss.setNamedRange(name, range);
  }
}

function createNamedRanges(ss, options) {
  const opts = options || {};
  const locationOnly = opts.locationOnly === true;
  const namedRangeMap = buildNamedRangeMap_(ss);

  // Location Roles + Stocking Rules ranges (dynamic via metadata cells N1:N4)
  const settingsSheet = ss.getSheetByName('Restock Settings');
  const locStart = parseInt(settingsSheet.getRange('N1').getValue(), 10) || 5;
  const locEndRaw = parseInt(settingsSheet.getRange('N2').getValue(), 10) || locStart;
  const locEnd = Math.max(locStart, locEndRaw);
  const rulesStart = parseInt(settingsSheet.getRange('N3').getValue(), 10) || 63;
  const rulesEndRaw = parseInt(settingsSheet.getRange('N4').getValue(), 10) || (rulesStart + STOCKING_RULES_DATA.length - 1);
  const rulesEnd = Math.max(rulesStart, rulesEndRaw);

  setOrUpdateNamedRange_(ss, namedRangeMap, 'LocationRoles', settingsSheet.getRange(locStart, 1, locEnd - locStart + 1, 4));
  setOrUpdateNamedRange_(ss, namedRangeMap, 'LocationRolesLookup', settingsSheet.getRange(locStart, 1, locEnd - locStart + 1, 2));

  if (locationOnly) return;

  setOrUpdateNamedRange_(ss, namedRangeMap, 'StockingRules', settingsSheet.getRange(rulesStart, 1, rulesEnd - rulesStart + 1, 9));

  // Treez raw data range
  const rawSheet = ss.getSheetByName('Treez Valuation (Raw)');
  setOrUpdateNamedRange_(
    ss,
    namedRangeMap,
    'TreezData',
    rawSheet.getRange(CONFIG.rawDataStartRow, 1, 10000 - CONFIG.rawDataStartRow + 1, CONFIG.treezColumns.length)
  );
}

// ============================================================================
// PROTECTIONS
// ============================================================================

function setupProtections(ss) {
  // Hide and protect the Engine tab
  const engineSheet = ss.getSheetByName('Restock Engine (Internal)');

  // Note: Full protection requires the user to set up protections manually.
  engineSheet.hideSheet();

  const systemRefSheet = ss.getSheetByName(SYSTEM_REFERENCE.sheetName);
  if (systemRefSheet) {
    systemRefSheet.hideSheet();
  }
  const diagnosticsSheet = ss.getSheetByName(DIAGNOSTICS.sheetName);
  if (diagnosticsSheet) {
    diagnosticsSheet.hideSheet();
  }
  const aiDiagnosticsSheet = ss.getSheetByName(AI_DIAGNOSTICS.sheetName);
  if (aiDiagnosticsSheet) {
    aiDiagnosticsSheet.hideSheet();
  }

  // Add a warning row to Settings tab near the Stocking Rules section.
  const settingsSheet = ss.getSheetByName('Restock Settings');
  const warnRow = Math.max(2, (parseInt(settingsSheet.getRange('N3').getValue(), 10) || 63) - 2);
  settingsSheet.getRange(warnRow, 1).setValue('CAUTION: Changes below affect restock calculations. Contact system admin before modifying.');
  settingsSheet.getRange(warnRow, 1).setFontWeight('bold').setFontColor('#cc0000');
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Manually run to show the hidden Engine tab for debugging
 */
function showEngineTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const engineSheet = ss.getSheetByName('Restock Engine (Internal)');
  engineSheet.showSheet();
}

/**
 * Manually run to hide the Engine tab again
 */
function hideEngineTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const engineSheet = ss.getSheetByName('Restock Engine (Internal)');
  engineSheet.hideSheet();
}

/**
 * Reset the checklist manual columns (Pull, Status, Done, Notes)
 */
function resetChecklistManualColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheetByCompatName_(ss, 'Restock List');
  if (!sheet) return;
  const props = PropertiesService.getDocumentProperties();
  const previousRows = parseInt(props.getProperty(SYSTEM_REFERENCE.props.lastChecklistRows) || '0', 10);
  const clearRows = Math.max(200, isNaN(previousRows) ? 0 : previousRows);
  
  // Clear Pull (col 13)
  sheet.getRange(3, 13, clearRows, 1).clearContent();
  
  // Reset Status to empty (col 14)
  sheet.getRange(3, 14, clearRows, 1).clearContent();
  
  // Uncheck Done (col 15)
  sheet.getRange(3, 15, clearRows, 1).uncheck();
  
  // Clear Notes (col 16)
  sheet.getRange(3, 16, clearRows, 1).clearContent();
  
  SpreadsheetApp.getUi().alert('Manual columns have been reset.');
}

// ============================================================================
// COMPLIANCE AUDIT ENGINE
// ============================================================================

function runComplianceCheck(options) {
  const opts = options || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  const warnings = [];
  const diagnostics = opts.diagnostics || null;
  const stepDurations = {};
  const diagMetrics = {
    dataRowsInRaw: 0,
    requiredIndexCount: 0,
    checkpointsLogged: 0,
    progressEnabled: false,
    apiReadCalls: 0,
    apiWriteCalls: 0,
    rowsHighlighted: 0,
    rowsCleared: 0,
    rowsChanged: 0,
    highlightRepaintSkipped: false,
    outputWriteSkipped: false,
    readStrategy: '',
    segmentCount: 0,
    spanWidth: 0
  };

  try {
    const cfg = runTimedStep_(stepDurations, 'read_config', function() {
      return readComplianceConfig_(ss, warnings);
    });
    const outputSheet = runTimedStep_(stepDurations, 'resolve_output_sheet', function() {
      return getSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.outputSheetName) || ensureSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.outputSheetName);
    });
    const rawSheet = runTimedStep_(stepDurations, 'resolve_raw_sheet', function() {
      return ss.getSheetByName(cfg.rawSheetName);
    });

    const summary = {
      runTimestamp: new Date(),
      totalRowsScanned: 0,
      processedRowsScanned: 0,
      missingThcCount: 0,
      missingExpCount: 0,
      missingBothCount: 0,
      flaggedRowsCount: 0
    };

    if (!rawSheet) {
      addWarning_(warnings, 'Raw sheet not found: ' + cfg.rawSheetName);
      clearStoredComplianceHighlightRows_();
      runTimedStep_(stepDurations, 'write_output', function() {
        const writeStats = writeComplianceOutput_(outputSheet, summary, [], warnings);
        diagMetrics.apiWriteCalls += writeStats.writeCalls || 0;
        diagMetrics.rowsChanged += writeStats.rowsWritten || 0;
      });
      props.setProperty(SYSTEM_REFERENCE.props.complianceSnapshotHash, buildComplianceSnapshotHash_(summary, [], warnings));
      runTimedStep_(stepDurations, 'append_log', function() {
        appendComplianceLog_(ss, summary, warnings);
        diagMetrics.apiWriteCalls += 1;
      });
      emitDiagnosticsCheckpoint_(ss, diagnostics, 'COMPLIANCE_ABORT', 'WARN', {
        reason: 'RAW_SHEET_MISSING',
        raw_sheet_name: cfg.rawSheetName
      });
      if (!opts.silent) {
        ui.alert('Compliance check completed with warnings.\n\nRaw sheet was not found.');
      }
      return {
        ok: false,
        summary: summary,
        warnings: warnings,
        reason: 'RAW_SHEET_MISSING',
        diagnostics: {
          stepDurationsMs: stepDurations,
          metrics: diagMetrics
        }
      };
    }

    const dimensions = runTimedStep_(stepDurations, 'read_raw_dimensions', function() {
      return {
        lastRow: rawSheet.getLastRow(),
        lastCol: rawSheet.getLastColumn()
      };
    });
    diagMetrics.apiReadCalls += 2;
    const lastRow = dimensions.lastRow;
    const lastCol = dimensions.lastCol;
    if (lastRow < cfg.headerRow || lastCol < 1 || lastRow < cfg.dataStartRow) {
      addWarning_(warnings, 'Raw sheet has no data rows to scan.');
      runTimedStep_(stepDurations, 'clear_highlights', function() {
        const cleared = clearTrackedComplianceHighlights_(rawSheet, lastCol);
        diagMetrics.rowsCleared += cleared.rowsAffected || 0;
        diagMetrics.apiWriteCalls += cleared.writeCalls || 0;
      });
      clearStoredComplianceHighlightRows_();
      runTimedStep_(stepDurations, 'write_output', function() {
        const writeStats = writeComplianceOutput_(outputSheet, summary, [], warnings);
        diagMetrics.apiWriteCalls += writeStats.writeCalls || 0;
        diagMetrics.rowsChanged += writeStats.rowsWritten || 0;
      });
      props.setProperty(SYSTEM_REFERENCE.props.complianceSnapshotHash, buildComplianceSnapshotHash_(summary, [], warnings));
      runTimedStep_(stepDurations, 'append_log', function() {
        appendComplianceLog_(ss, summary, warnings);
        diagMetrics.apiWriteCalls += 1;
      });
      emitDiagnosticsCheckpoint_(ss, diagnostics, 'COMPLIANCE_ABORT', 'INFO', {
        reason: 'NO_DATA_ROWS',
        last_row: lastRow,
        last_col: lastCol,
        header_row: cfg.headerRow,
        data_start_row: cfg.dataStartRow
      });
      if (!opts.silent) {
        ui.alert('Compliance check completed.\n\nNo raw data rows were found.');
      }
      return {
        ok: true,
        summary: summary,
        warnings: warnings,
        reason: 'NO_DATA_ROWS',
        diagnostics: {
          stepDurationsMs: stepDurations,
          metrics: diagMetrics
        }
      };
    }

    const headerValues = runTimedStep_(stepDurations, 'read_headers', function() {
      return rawSheet.getRange(cfg.headerRow, 1, 1, lastCol).getDisplayValues()[0];
    });
    diagMetrics.apiReadCalls += 1;
    const columns = runTimedStep_(stepDurations, 'resolve_columns', function() {
      return resolveComplianceColumns_(headerValues, cfg.aliases, warnings);
    });

    const hasStatusColumn = columns.status >= 0;
    const hasLocationColumn = columns.location >= 0;

    if (!hasStatusColumn && !hasLocationColumn) {
      addWarning_(warnings, 'No Status or Location column found. Processed rows cannot be determined.');
    } else if (cfg.processedLogicMode === 'STATUS' && !hasStatusColumn && hasLocationColumn) {
      addWarning_(warnings, 'processed_logic_mode=STATUS but Status column is missing. Falling back to Location.');
    } else if (cfg.processedLogicMode === 'LOCATION' && !hasLocationColumn && hasStatusColumn) {
      addWarning_(warnings, 'processed_logic_mode=LOCATION but Location column is missing. Falling back to Status.');
    }

    if (columns.expiration < 0) {
      addWarning_(warnings, 'No expiration column matched aliases. Expiration will be treated as missing.');
    }
    if (columns.thc.length === 0) {
      addWarning_(warnings, 'No THC columns matched aliases. THC will be treated as missing.');
    }
    if (cfg.requireQtyGtZero && columns.qty_on_hand < 0) {
      addWarning_(warnings, 'qty_on_hand column not found. qty > 0 filter will be skipped.');
    }
    if (cfg.productTypeScope === 'CANNABIS_ONLY' && columns.product_type < 0) {
      addWarning_(warnings, 'product_type column not found. cannabis-only scope filter will be skipped.');
    }

    const dataRowCount = lastRow - cfg.dataStartRow + 1;
    diagMetrics.dataRowsInRaw = dataRowCount;
    diagMetrics.rowsTotal = dataRowCount;
    const requiredIndexes = runTimedStep_(stepDurations, 'resolve_required_indexes', function() {
      return collectComplianceColumnIndexes_(columns);
    });
    diagMetrics.requiredIndexCount = requiredIndexes.length;
    emitDiagnosticsCheckpoint_(ss, diagnostics, 'COMPLIANCE_PROGRESS', 'INFO', {
      phase: 'scan_setup',
      data_rows_in_raw: dataRowCount,
      required_indexes: requiredIndexes.length
    });
    const columnData = runTimedStep_(stepDurations, 'read_column_data', function() {
      return readComplianceColumnData_(rawSheet, cfg.dataStartRow, dataRowCount, requiredIndexes);
    });
    const columnReadMeta = columnData.__meta || {};
    diagMetrics.readStrategy = columnReadMeta.strategy || '';
    diagMetrics.segmentCount = columnReadMeta.segmentCount || 0;
    diagMetrics.spanWidth = columnReadMeta.spanWidth || 0;
    diagMetrics.apiReadCalls += columnReadMeta.apiReadCalls || 0;
    emitDiagnosticsCheckpoint_(ss, diagnostics, 'COMPLIANCE_PROGRESS', 'INFO', {
      phase: 'column_data_ready',
      read_column_data_ms: stepDurations.read_column_data || 0,
      read_strategy: columnReadMeta.strategy || 'unknown',
      segment_count: columnReadMeta.segmentCount || 0,
      span_width: columnReadMeta.spanWidth || 0
    });

    const flaggedRows = [];
    const flaggedSourceRows = [];
    const progressInterval = Math.max(500, DIAGNOSTICS.progressRowInterval || 2500);
    const progressMinIntervalMs = Math.max(1000, DIAGNOSTICS.progressMinIntervalMs || 4000);
    const progressMaxEvents = Math.max(1, DIAGNOSTICS.progressMaxEvents || 12);
    diagMetrics.progressEnabled = diagnostics && diagnostics.runCtx && dataRowCount >= progressInterval;
    let nextProgressRow = progressInterval;
    let lastProgressTs = Date.now();
    let lastProgressRowLogged = 0;
    const scanStartedMs = Date.now();
    const maybeEmitProgress = function(scannedRows, force) {
      if (!diagMetrics.progressEnabled) return;
      if (diagMetrics.checkpointsLogged >= progressMaxEvents && !force) return;
      const crossedBoundary = scannedRows >= nextProgressRow || scannedRows === dataRowCount || force;
      if (!crossedBoundary) return;

      while (nextProgressRow <= scannedRows) {
        nextProgressRow += progressInterval;
      }
      const now = Date.now();
      const enoughTimeElapsed = (now - lastProgressTs) >= progressMinIntervalMs || scannedRows === dataRowCount || force;
      if (!enoughTimeElapsed && !force) return;

      diagMetrics.checkpointsLogged++;
      lastProgressTs = now;
      lastProgressRowLogged = scannedRows;
      emitDiagnosticsCheckpoint_(ss, diagnostics, 'COMPLIANCE_PROGRESS', 'INFO', {
        rows_scanned: scannedRows,
        rows_total: dataRowCount,
        non_empty_rows: summary.totalRowsScanned,
        processed_rows: summary.processedRowsScanned,
        flagged_rows: flaggedRows.length,
        elapsed_ms: now - scanStartedMs
      });
    };

    runTimedStep_(stepDurations, 'scan_rows', function() {
      for (let i = 0; i < dataRowCount; i++) {
        maybeEmitProgress(i + 1, false);
        const sourceRow = cfg.dataStartRow + i;

        if (isRowEmptyByIndexes_(columnData, i, requiredIndexes)) {
          continue;
        }

        summary.totalRowsScanned++;

        const statusText = getDisplayByColumnData_(columnData, i, columns.status);
        const locationText = getDisplayByColumnData_(columnData, i, columns.location);

        const statusMatch = hasStatusColumn && cfg.processedStatusSet.has(normalizeToken_(statusText));
        const locationMatch = hasLocationColumn && !isExcludedLocation_(locationText, cfg.excludedLocationTokens);
        const isProcessed = isProcessedRow_(
          cfg.processedLogicMode,
          hasStatusColumn,
          hasLocationColumn,
          statusMatch,
          locationMatch
        );

        if (!isProcessed) {
          continue;
        }

        if (cfg.requireQtyGtZero && columns.qty_on_hand >= 0) {
          const qty = parseNumeric_(
            getRawByColumnData_(columnData, i, columns.qty_on_hand),
            getDisplayByColumnData_(columnData, i, columns.qty_on_hand)
          );
          if (isNaN(qty) || qty <= 0) {
            continue;
          }
        }

        if (cfg.productTypeScope === 'CANNABIS_ONLY' && columns.product_type >= 0) {
          const productTypeToken = normalizeToken_(getDisplayByColumnData_(columnData, i, columns.product_type));
          if (!cfg.cannabisTypeSet.has(productTypeToken)) {
            continue;
          }
        }

        summary.processedRowsScanned++;

        let hasThc = false;
        for (let j = 0; j < columns.thc.length; j++) {
          const thcCol = columns.thc[j];
          if (isMeaningfulThc_(
            getRawByColumnData_(columnData, i, thcCol),
            getDisplayByColumnData_(columnData, i, thcCol),
            cfg.missingTokenSet
          )) {
            hasThc = true;
            break;
          }
        }

        let hasExpiration = false;
        if (columns.expiration >= 0) {
          hasExpiration = isValidExpiration_(
            getRawByColumnData_(columnData, i, columns.expiration),
            getDisplayByColumnData_(columnData, i, columns.expiration),
            cfg.missingTokenSet
          );
        }

        const missingThc = !hasThc;
        const missingExp = !hasExpiration;

        if (!missingThc && !missingExp) {
          continue;
        }

        if (missingThc) summary.missingThcCount++;
        if (missingExp) summary.missingExpCount++;
        if (missingThc && missingExp) summary.missingBothCount++;

        const flag = missingThc && missingExp ? 'MISSING_BOTH' : (missingThc ? 'MISSING_THC' : 'MISSING_EXP');
        const thcValues = buildThcValuesStringFromColumnData_(headerValues, columnData, i, columns.thc);

        flaggedRows.push([
          sourceRow,
          getDisplayByColumnData_(columnData, i, columns.product_name),
          getDisplayByColumnData_(columnData, i, columns.brand_vendor),
          getDisplayByColumnData_(columnData, i, columns.sku_item_id),
          getDisplayByColumnData_(columnData, i, columns.batch_lot),
          getDisplayByColumnData_(columnData, i, columns.product_type),
          locationText,
          statusText,
          getDisplayByColumnData_(columnData, i, columns.qty_on_hand),
          thcValues,
          getDisplayByColumnData_(columnData, i, columns.expiration),
          flag
        ]);
        flaggedSourceRows.push(sourceRow);
      }
      if (diagMetrics.progressEnabled && lastProgressRowLogged < dataRowCount) {
        maybeEmitProgress(dataRowCount, true);
      }
    });

    summary.flaggedRowsCount = flaggedRows.length;
    const nextHighlightRows = dedupeSortedNumericRows_(flaggedSourceRows);
    const nextHighlightHash = computeTextHash_(nextHighlightRows.join(','));
    const previousHighlightHash = props.getProperty(SYSTEM_REFERENCE.props.complianceHighlightHash) || '';
    const highlightUnchanged = nextHighlightHash === previousHighlightHash;
    runTimedStep_(stepDurations, 'apply_highlights', function() {
      if (highlightUnchanged) {
        diagMetrics.highlightRepaintSkipped = true;
        return;
      }
      const cleared = clearTrackedComplianceHighlights_(rawSheet, lastCol);
      const painted = highlightComplianceRows_(rawSheet, nextHighlightRows, lastCol);
      storeComplianceHighlightRows_(nextHighlightRows);
      props.setProperty(SYSTEM_REFERENCE.props.complianceHighlightHash, nextHighlightHash);
      diagMetrics.rowsCleared += cleared.rowsAffected || 0;
      diagMetrics.rowsHighlighted += painted.rowsAffected || 0;
      diagMetrics.apiWriteCalls += (cleared.writeCalls || 0) + (painted.writeCalls || 0);
    });
    diagMetrics.rowsChanged = diagMetrics.rowsCleared + diagMetrics.rowsHighlighted;

    const snapshotHash = buildComplianceSnapshotHash_(summary, flaggedRows, warnings);
    const previousSnapshotHash = props.getProperty(SYSTEM_REFERENCE.props.complianceSnapshotHash) || '';
    const snapshotUnchanged = snapshotHash === previousSnapshotHash;
    runTimedStep_(stepDurations, 'write_output', function() {
      if (snapshotUnchanged) {
        diagMetrics.outputWriteSkipped = true;
        return;
      }
      const writeStats = writeComplianceOutput_(outputSheet, summary, flaggedRows, warnings);
      props.setProperty(SYSTEM_REFERENCE.props.complianceSnapshotHash, snapshotHash);
      diagMetrics.apiWriteCalls += writeStats.writeCalls || 0;
      diagMetrics.rowsChanged += writeStats.rowsWritten || 0;
    });
    runTimedStep_(stepDurations, 'append_log', function() {
      appendComplianceLog_(ss, summary, warnings);
      diagMetrics.apiWriteCalls += 1;
    });

    const complianceDetail = {
      total_rows_scanned: summary.totalRowsScanned,
      processed_rows_scanned: summary.processedRowsScanned,
      flagged_rows: summary.flaggedRowsCount,
      missing_thc: summary.missingThcCount,
      missing_exp: summary.missingExpCount,
      missing_both: summary.missingBothCount,
      warnings: warnings.length,
      data_rows_in_raw: diagMetrics.dataRowsInRaw,
      required_indexes: diagMetrics.requiredIndexCount,
      checkpoints_logged: diagMetrics.checkpointsLogged
    };
    complianceDetail.read_strategy = columnReadMeta.strategy || 'unknown';
    complianceDetail.segment_count = columnReadMeta.segmentCount || 0;
    complianceDetail.span_width = columnReadMeta.spanWidth || 0;
    complianceDetail.api_read_calls = diagMetrics.apiReadCalls;
    complianceDetail.api_write_calls = diagMetrics.apiWriteCalls;
    complianceDetail.rows_changed = diagMetrics.rowsChanged;
    complianceDetail.rows_cleared = diagMetrics.rowsCleared;
    complianceDetail.rows_highlighted = diagMetrics.rowsHighlighted;
    complianceDetail.highlight_repaint_skipped = diagMetrics.highlightRepaintSkipped;
    complianceDetail.output_write_skipped = diagMetrics.outputWriteSkipped;
    const stepMetrics = summarizeStepDurations_(stepDurations);
    const stepKeys = Object.keys(stepMetrics);
    for (let i = 0; i < stepKeys.length; i++) {
      complianceDetail[stepKeys[i]] = stepMetrics[stepKeys[i]];
    }
    emitDiagnosticsCheckpoint_(ss, diagnostics, 'COMPLIANCE_DETAIL', 'INFO', complianceDetail);

    if (!opts.silent) {
      ui.alert(
        'Compliance check complete.\n\n' +
        'Processed rows scanned: ' + summary.processedRowsScanned + '\n' +
        'Flagged rows: ' + summary.flaggedRowsCount + '\n' +
        'Missing THC: ' + summary.missingThcCount + '\n' +
        'Missing Expiration: ' + summary.missingExpCount + '\n' +
        'Missing Both: ' + summary.missingBothCount
      );
    }
    return {
      ok: true,
      summary: summary,
      warnings: warnings,
      diagnostics: {
        stepDurationsMs: stepDurations,
        metrics: diagMetrics
      }
    };
  } catch (error) {
    Logger.log('Compliance check failed: ' + error);
    emitDiagnosticsCheckpoint_(ss, diagnostics, 'COMPLIANCE_FAIL', 'ERROR', {
      error: String(error)
    });
    if (!opts.silent) {
      ui.alert('Compliance check failed.\n\n' + error);
    }
    return {
      ok: false,
      reason: 'EXCEPTION',
      error: String(error),
      warnings: warnings,
      diagnostics: {
        stepDurationsMs: stepDurations,
        metrics: diagMetrics
      }
    };
  }
}

function clearComplianceOutput() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const warnings = [];

  const outputSheet = getSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.outputSheetName);
  if (outputSheet) {
    setupMissingComplianceTab(ss);
  }

  const cfg = readComplianceConfig_(ss, warnings);
  const rawSheet = ss.getSheetByName(cfg.rawSheetName);
  if (rawSheet) {
    clearTrackedComplianceHighlights_(rawSheet, rawSheet.getLastColumn());
  }
  clearStoredComplianceHighlightRows_();
  PropertiesService.getDocumentProperties().deleteProperty(SYSTEM_REFERENCE.props.complianceSnapshotHash);

  ui.alert('Compliance output cleared.');
}

function writeComplianceOutput_(sheet, summary, flaggedRows, warnings) {
  let writeCalls = 0;
  let rowsWritten = 0;
  sheet.clear();
  writeCalls++;

  sheet.getRange('A1').setValue('Compliance Audit Summary').setFontSize(14).setFontWeight('bold');
  writeCalls++;
  sheet.getRange('A2:B7').setValues([
    ['Run Timestamp', summary.runTimestamp],
    ['Total Rows Scanned', summary.totalRowsScanned],
    ['Processed Rows Scanned', summary.processedRowsScanned],
    ['Missing THC', summary.missingThcCount],
    ['Missing Expiration', summary.missingExpCount],
    ['Missing Both', summary.missingBothCount]
  ]);
  writeCalls++;
  sheet.getRange('A2:A7').setFontWeight('bold');
  writeCalls++;
  sheet.getRange('B2').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  writeCalls++;

  sheet.getRange('A8').setValue('Warnings').setFontWeight('bold');
  writeCalls++;
  sheet.getRange('B8').setValue(warnings.length ? warnings.join(' | ') : 'None');
  writeCalls++;

  const headerRow = 10;
  const headers = [
    'Source Row',
    'Product Name',
    'Brand/Vendor',
    'SKU / Item ID',
    'Batch/Lot',
    'Product Type',
    'Location',
    'Status',
    'Qty On Hand',
    'THC Value(s)',
    'Expiration Value',
    'Flags'
  ];

  sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
  writeCalls++;
  sheet.getRange(headerRow, 1, 1, headers.length).setFontWeight('bold').setBackground(CONFIG.colors.header);
  writeCalls++;

  if (flaggedRows.length > 0) {
    sheet.getRange(headerRow + 1, 1, flaggedRows.length, headers.length).setValues(flaggedRows);
    writeCalls++;
    rowsWritten += flaggedRows.length;
  } else {
    sheet.getRange(headerRow + 1, 1).setValue('No compliance issues found for current config.');
    writeCalls++;
    rowsWritten += 1;
  }

  const widths = [90, 300, 180, 170, 150, 110, 150, 120, 100, 320, 150, 140];
  for (let i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
    writeCalls++;
  }

  if (sheet.getFilter()) {
    sheet.getFilter().remove();
    writeCalls++;
  }
  const dataRows = Math.max(1, flaggedRows.length + 1);
  sheet.getRange(headerRow, 1, dataRows, headers.length).createFilter();
  writeCalls++;

  sheet.setFrozenRows(headerRow);
  writeCalls++;
  return {
    writeCalls: writeCalls,
    rowsWritten: rowsWritten
  };
}

function appendComplianceLog_(ss, summary, warnings) {
  let sheet = getSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.logSheetName);
  if (!sheet) {
    sheet = ensureSheetByCompatName_(ss, COMPLIANCE_DEFAULTS.logSheetName);
    setupComplianceLogTab(ss);
  }

  sheet.appendRow([
    summary.runTimestamp,
    summary.totalRowsScanned,
    summary.processedRowsScanned,
    summary.flaggedRowsCount,
    summary.missingThcCount,
    summary.missingExpCount,
    summary.missingBothCount,
    warnings.join(' | ')
  ]);
}

function clearComplianceHighlights_(rawSheet, dataStartRow, lastRow, lastCol) {
  if (!rawSheet || lastRow < dataStartRow || lastCol < 1) {
    return { rowsAffected: 0, writeCalls: 0 };
  }
  rawSheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, lastCol).setBackground('#ffffff');
  return { rowsAffected: Math.max(0, lastRow - dataStartRow + 1), writeCalls: 1 };
}

function highlightComplianceRows_(rawSheet, sourceRows, lastCol) {
  if (!rawSheet || sourceRows.length === 0 || lastCol < 1) {
    return { rowsAffected: 0, writeCalls: 0 };
  }
  return applyRowBackgrounds_(rawSheet, sourceRows, lastCol, CONFIG.colors.complianceFlag);
}

function clearTrackedComplianceHighlights_(rawSheet, lastCol) {
  if (!rawSheet || lastCol < 1) return { rowsAffected: 0, writeCalls: 0 };
  const rows = readStoredComplianceHighlightRows_();
  if (rows.length === 0) return { rowsAffected: 0, writeCalls: 0 };
  return applyRowBackgrounds_(rawSheet, rows, lastCol, '#ffffff');
}

function storeComplianceHighlightRows_(rows) {
  const props = PropertiesService.getDocumentProperties();
  const deduped = dedupeSortedNumericRows_(rows || []);
  if (deduped.length === 0) {
    props.deleteProperty(SYSTEM_REFERENCE.props.complianceHighlightRows);
    return;
  }
  props.setProperty(SYSTEM_REFERENCE.props.complianceHighlightRows, deduped.join(','));
}

function readStoredComplianceHighlightRows_() {
  const props = PropertiesService.getDocumentProperties();
  const raw = props.getProperty(SYSTEM_REFERENCE.props.complianceHighlightRows) || '';
  if (!raw) return [];
  return dedupeSortedNumericRows_(raw.split(',').map(v => parseInt(v, 10)));
}

function clearStoredComplianceHighlightRows_() {
  const props = PropertiesService.getDocumentProperties();
  props.deleteProperty(SYSTEM_REFERENCE.props.complianceHighlightRows);
  props.deleteProperty(SYSTEM_REFERENCE.props.complianceHighlightHash);
}

function dedupeSortedNumericRows_(rows) {
  const map = {};
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const value = parseInt(rows[i], 10);
    if (isNaN(value) || value < 1 || map[value]) continue;
    map[value] = true;
    out.push(value);
  }
  out.sort((a, b) => a - b);
  return out;
}

function buildComplianceSnapshotHash_(summary, flaggedRows, warnings) {
  const payload = {
    totalRowsScanned: summary && summary.totalRowsScanned ? summary.totalRowsScanned : 0,
    processedRowsScanned: summary && summary.processedRowsScanned ? summary.processedRowsScanned : 0,
    missingThcCount: summary && summary.missingThcCount ? summary.missingThcCount : 0,
    missingExpCount: summary && summary.missingExpCount ? summary.missingExpCount : 0,
    missingBothCount: summary && summary.missingBothCount ? summary.missingBothCount : 0,
    flaggedRowsCount: summary && summary.flaggedRowsCount ? summary.flaggedRowsCount : 0,
    warnings: warnings || [],
    flaggedRows: flaggedRows || []
  };
  return computeTextHash_(safeJson_(payload));
}

function applyRowBackgrounds_(sheet, rows, lastCol, color) {
  if (!sheet || rows.length === 0 || lastCol < 1) {
    return { rowsAffected: 0, writeCalls: 0 };
  }
  const endColLetter = columnToLetter_(lastCol);
  const uniqueRows = dedupeSortedNumericRows_(rows);
  const a1Ranges = uniqueRows.map(rowNum => 'A' + rowNum + ':' + endColLetter + rowNum);
  const chunkSize = 200;
  let writeCalls = 0;
  for (let i = 0; i < a1Ranges.length; i += chunkSize) {
    const chunk = a1Ranges.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      sheet.getRangeList(chunk).setBackground(color);
      writeCalls++;
    }
  }
  return {
    rowsAffected: uniqueRows.length,
    writeCalls: writeCalls
  };
}

function columnToLetter_(column) {
  let num = parseInt(column, 10);
  if (isNaN(num) || num < 1) return 'A';
  let result = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

function readComplianceConfig_(ss, warnings) {
  let sheet = ss.getSheetByName(COMPLIANCE_DEFAULTS.configSheetName);
  if (!sheet) {
    setupComplianceConfigTab(ss);
    sheet = ss.getSheetByName(COMPLIANCE_DEFAULTS.configSheetName);
    addWarning_(warnings, 'Compliance Config tab was missing and has been recreated with defaults.');
  }

  const cfg = {
    rawSheetName: COMPLIANCE_DEFAULTS.rawSheetName,
    headerRow: COMPLIANCE_DEFAULTS.headerRow,
    dataStartRow: COMPLIANCE_DEFAULTS.dataStartRow,
    processedLogicMode: COMPLIANCE_DEFAULTS.processedLogicMode,
    requireQtyGtZero: COMPLIANCE_DEFAULTS.requireQtyGtZero,
    productTypeScope: COMPLIANCE_DEFAULTS.productTypeScope,
    aliases: {},
    processedStatusAllowlist: COMPLIANCE_DEFAULTS.processedStatusAllowlist.slice(),
    excludedLocations: COMPLIANCE_DEFAULTS.excludedLocations.slice(),
    cannabisProductTypes: COMPLIANCE_DEFAULTS.cannabisProductTypes.slice(),
    missingTokens: COMPLIANCE_DEFAULTS.missingTokens.slice()
  };

  for (let i = 0; i < COMPLIANCE_DEFAULTS.canonicalFields.length; i++) {
    const canonical = COMPLIANCE_DEFAULTS.canonicalFields[i];
    cfg.aliases[canonical] = (COMPLIANCE_DEFAULTS.aliases[canonical] || []).slice();
  }

  if (sheet) {
    const rawSheetName = String(sheet.getRange('B2').getDisplayValue() || '').trim();
    if (rawSheetName) cfg.rawSheetName = rawSheetName;

    cfg.headerRow = parseIntWithFallback_(sheet.getRange('B3').getValue(), COMPLIANCE_DEFAULTS.headerRow);
    cfg.dataStartRow = parseIntWithFallback_(sheet.getRange('B4').getValue(), COMPLIANCE_DEFAULTS.dataStartRow);
    cfg.processedLogicMode = parseEnumWithFallback_(
      sheet.getRange('B5').getDisplayValue(),
      ['STATUS', 'LOCATION', 'EITHER'],
      COMPLIANCE_DEFAULTS.processedLogicMode
    );
    cfg.requireQtyGtZero = parseBooleanWithFallback_(sheet.getRange('B6').getValue(), COMPLIANCE_DEFAULTS.requireQtyGtZero);
    cfg.productTypeScope = parseEnumWithFallback_(
      sheet.getRange('B7').getDisplayValue(),
      ['ALL', 'CANNABIS_ONLY'],
      COMPLIANCE_DEFAULTS.productTypeScope
    );

    cfg.aliases = readAliasMap_(sheet);
    cfg.processedStatusAllowlist = readColumnList_(sheet, 10, COMPLIANCE_DEFAULTS.processedStatusAllowlist);
    cfg.excludedLocations = readColumnList_(sheet, 11, COMPLIANCE_DEFAULTS.excludedLocations);
    cfg.cannabisProductTypes = readColumnList_(sheet, 12, COMPLIANCE_DEFAULTS.cannabisProductTypes);

    const missingTokenValues = readColumnList_(sheet, 13, COMPLIANCE_DEFAULTS.missingTokens);
    if (missingTokenValues.indexOf('') < 0) {
      missingTokenValues.unshift('');
    }
    cfg.missingTokens = missingTokenValues;
  }

  cfg.processedStatusSet = new Set(cfg.processedStatusAllowlist.map(normalizeToken_));
  cfg.excludedLocationTokens = cfg.excludedLocations.map(normalizeHeader_);
  cfg.cannabisTypeSet = new Set(cfg.cannabisProductTypes.map(normalizeToken_));
  cfg.missingTokenSet = new Set(cfg.missingTokens.map(normalizeHeader_));
  return cfg;
}

function readAliasMap_(sheet) {
  const aliasMap = {};
  const foundMap = {};
  for (let i = 0; i < COMPLIANCE_DEFAULTS.canonicalFields.length; i++) {
    const canonical = COMPLIANCE_DEFAULTS.canonicalFields[i];
    aliasMap[canonical] = (COMPLIANCE_DEFAULTS.aliases[canonical] || []).slice();
    foundMap[canonical] = [];
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return aliasMap;

  const rows = sheet.getRange(2, 6, lastRow - 1, 2).getDisplayValues();
  for (let i = 0; i < rows.length; i++) {
    const canonical = String(rows[i][0] || '').trim().toLowerCase();
    const alias = String(rows[i][1] || '').trim();
    if (!canonical || !alias) continue;
    if (!foundMap.hasOwnProperty(canonical)) continue;
    foundMap[canonical].push(alias);
  }

  for (let i = 0; i < COMPLIANCE_DEFAULTS.canonicalFields.length; i++) {
    const canonical = COMPLIANCE_DEFAULTS.canonicalFields[i];
    if (foundMap[canonical].length > 0) {
      aliasMap[canonical] = foundMap[canonical];
    }
  }
  return aliasMap;
}

function readColumnList_(sheet, col, fallbackValues) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return fallbackValues.slice();

  const values = sheet.getRange(2, col, lastRow - 1, 1).getDisplayValues()
    .map(r => String(r[0] || '').trim())
    .filter(v => v !== '');
  return values.length > 0 ? values : fallbackValues.slice();
}

function resolveComplianceColumns_(headers, aliases, warnings) {
  const columns = {
    product_name: -1,
    brand_vendor: -1,
    sku_item_id: -1,
    batch_lot: -1,
    status: -1,
    location: -1,
    qty_on_hand: -1,
    product_type: -1,
    expiration: -1,
    thc: []
  };

  columns.product_name = findFirstHeaderIndex_(headers, aliases.product_name || []);
  columns.brand_vendor = findFirstHeaderIndex_(headers, aliases.brand_vendor || []);
  columns.sku_item_id = findFirstHeaderIndex_(headers, aliases.sku_item_id || []);
  columns.batch_lot = findFirstHeaderIndex_(headers, aliases.batch_lot || []);
  columns.status = findFirstHeaderIndex_(headers, aliases.status || []);
  columns.location = findFirstHeaderIndex_(headers, aliases.location || []);
  columns.qty_on_hand = findFirstHeaderIndex_(headers, aliases.qty_on_hand || []);
  columns.product_type = findFirstHeaderIndex_(headers, aliases.product_type || []);
  columns.expiration = findFirstHeaderIndex_(headers, aliases.expiration || []);
  columns.thc = findHeaderIndexes_(headers, aliases.thc || []);

  if (columns.product_name < 0) addWarning_(warnings, 'Product Name column was not resolved.');
  if (columns.location < 0 && columns.status < 0) addWarning_(warnings, 'Neither Location nor Status column was resolved.');
  if (columns.qty_on_hand < 0) addWarning_(warnings, 'Qty On Hand column was not resolved.');
  if (columns.product_type < 0) addWarning_(warnings, 'Product Type column was not resolved.');

  return columns;
}

function findFirstHeaderIndex_(headers, aliases) {
  const matches = findHeaderIndexes_(headers, aliases);
  return matches.length > 0 ? matches[0] : -1;
}

function findHeaderIndexes_(headers, aliases) {
  const normalizedHeaders = headers.map(normalizeHeader_);
  const normalizedAliases = aliases.map(normalizeHeader_).filter(v => v !== '');
  const found = {};
  const output = [];

  for (let i = 0; i < normalizedAliases.length; i++) {
    const alias = normalizedAliases[i];
    for (let j = 0; j < normalizedHeaders.length; j++) {
      if (normalizedHeaders[j] === alias && !found[j]) {
        found[j] = true;
        output.push(j);
      }
    }
  }

  if (output.length > 0) return output;

  for (let i = 0; i < normalizedAliases.length; i++) {
    const alias = normalizedAliases[i];
    if (alias.length < 4) continue;
    for (let j = 0; j < normalizedHeaders.length; j++) {
      const header = normalizedHeaders[j];
      if (!header) continue;
      if ((header.indexOf(alias) >= 0 || alias.indexOf(header) >= 0) && !found[j]) {
        found[j] = true;
        output.push(j);
      }
    }
  }

  return output;
}

function collectComplianceColumnIndexes_(columns) {
  const values = [
    columns.product_name,
    columns.brand_vendor,
    columns.sku_item_id,
    columns.batch_lot,
    columns.status,
    columns.location,
    columns.qty_on_hand,
    columns.product_type,
    columns.expiration
  ];
  for (let i = 0; i < columns.thc.length; i++) {
    values.push(columns.thc[i]);
  }

  const unique = {};
  const output = [];
  for (let i = 0; i < values.length; i++) {
    const idx = values[i];
    if (typeof idx !== 'number' || idx < 0 || unique[idx]) continue;
    unique[idx] = true;
    output.push(idx);
  }
  output.sort((a, b) => a - b);
  return output;
}

function readComplianceColumnData_(sheet, startRow, rowCount, indexes) {
  const data = {};
  if (!sheet || rowCount < 1 || !indexes || indexes.length === 0) {
    return data;
  }

  const sorted = indexes.slice().sort((a, b) => a - b);
  const segments = [];
  let segStart = sorted[0];
  let segEnd = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const idx = sorted[i];
    if (idx === segEnd + 1) {
      segEnd = idx;
    } else {
      segments.push([segStart, segEnd]);
      segStart = idx;
      segEnd = idx;
    }
  }
  segments.push([segStart, segEnd]);

  const minIdx = sorted[0];
  const maxIdx = sorted[sorted.length - 1];
  const spanWidth = maxIdx - minIdx + 1;
  const useSingleBlockRead = segments.length > 2 && spanWidth <= 80;
  let apiReadCalls = 0;

  if (useSingleBlockRead) {
    const range = sheet.getRange(startRow, minIdx + 1, rowCount, spanWidth);
    const values = range.getValues();
    const displays = range.getDisplayValues();
    apiReadCalls += 2;
    for (let i = 0; i < sorted.length; i++) {
      const colIdx = sorted[i];
      const offset = colIdx - minIdx;
      const colValues = new Array(rowCount);
      const colDisplays = new Array(rowCount);
      for (let r = 0; r < rowCount; r++) {
        colValues[r] = values[r][offset];
        colDisplays[r] = displays[r][offset];
      }
      data[colIdx] = {
        values: colValues,
        displays: colDisplays
      };
    }
  } else {
    for (let i = 0; i < segments.length; i++) {
      const startIdx = segments[i][0];
      const endIdx = segments[i][1];
      const width = endIdx - startIdx + 1;
      const range = sheet.getRange(startRow, startIdx + 1, rowCount, width);
      const values = range.getValues();
      const displays = range.getDisplayValues();
      apiReadCalls += 2;

      for (let offset = 0; offset < width; offset++) {
        const colIdx = startIdx + offset;
        const colValues = new Array(rowCount);
        const colDisplays = new Array(rowCount);
        for (let r = 0; r < rowCount; r++) {
          colValues[r] = values[r][offset];
          colDisplays[r] = displays[r][offset];
        }
        data[colIdx] = {
          values: colValues,
          displays: colDisplays
        };
      }
    }
  }

  data.__meta = {
    strategy: useSingleBlockRead ? 'single_block' : 'segmented',
    segmentCount: segments.length,
    spanWidth: spanWidth,
    apiReadCalls: apiReadCalls
  };
  return data;
}

function getRawByColumnData_(columnData, rowIndex, index) {
  if (index < 0) return '';
  const col = columnData[index];
  if (!col || rowIndex < 0 || rowIndex >= col.values.length) return '';
  return col.values[rowIndex];
}

function getDisplayByColumnData_(columnData, rowIndex, index) {
  if (index < 0) return '';
  const col = columnData[index];
  if (!col || rowIndex < 0 || rowIndex >= col.displays.length) return '';
  return String(col.displays[rowIndex] || '').trim();
}

function isRowEmptyByIndexes_(columnData, rowIndex, indexes) {
  if (!indexes || indexes.length === 0) return true;
  for (let i = 0; i < indexes.length; i++) {
    const value = getRawByColumnData_(columnData, rowIndex, indexes[i]);
    if (value !== '' && value !== null) {
      return false;
    }
  }
  return true;
}

function isProcessedRow_(mode, hasStatusColumn, hasLocationColumn, statusMatch, locationMatch) {
  if (mode === 'STATUS') {
    if (hasStatusColumn) return statusMatch;
    return hasLocationColumn ? locationMatch : false;
  }
  if (mode === 'LOCATION') {
    if (hasLocationColumn) return locationMatch;
    return hasStatusColumn ? statusMatch : false;
  }
  if (hasStatusColumn && hasLocationColumn) {
    return statusMatch || locationMatch;
  }
  if (hasStatusColumn) return statusMatch;
  if (hasLocationColumn) return locationMatch;
  return false;
}

function isExcludedLocation_(location, excludedTokens) {
  const token = normalizeHeader_(location);
  if (!token) return false;
  for (let i = 0; i < excludedTokens.length; i++) {
    const excluded = excludedTokens[i];
    if (!excluded) continue;
    if (token === excluded || token.indexOf(excluded) >= 0) {
      return true;
    }
  }
  return false;
}

function isMeaningfulThc_(rawValue, displayValue, missingTokenSet) {
  if (isMissingValue_(rawValue, displayValue, missingTokenSet)) {
    return false;
  }
  const numeric = parseNumeric_(rawValue, displayValue);
  if (!isNaN(numeric)) {
    return Math.abs(numeric) > 0;
  }
  return true;
}

function isValidExpiration_(rawValue, displayValue, missingTokenSet) {
  if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
    return true;
  }
  if (isMissingValue_(rawValue, displayValue, missingTokenSet)) {
    return false;
  }

  const text = String(displayValue !== '' ? displayValue : rawValue).trim();
  if (!text) return false;

  const direct = new Date(text);
  if (!isNaN(direct.getTime())) {
    return true;
  }

  const slashMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!slashMatch) return false;

  const month = parseInt(slashMatch[1], 10);
  const day = parseInt(slashMatch[2], 10);
  let year = parseInt(slashMatch[3], 10);
  if (year < 100) year += 2000;
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function isMissingValue_(rawValue, displayValue, missingTokenSet) {
  if (rawValue === '' || rawValue === null || typeof rawValue === 'undefined') return true;
  if (rawValue instanceof Date) return false;

  const text = String(displayValue !== '' ? displayValue : rawValue).trim();
  if (text === '') return true;
  return missingTokenSet.has(normalizeHeader_(text));
}

function buildThcValuesStringFromColumnData_(headers, columnData, rowIndex, thcIndexes) {
  const chunks = [];
  for (let i = 0; i < thcIndexes.length; i++) {
    const idx = thcIndexes[i];
    const header = String(headers[idx] || '').trim();
    const value = getDisplayByColumnData_(columnData, rowIndex, idx);
    if (!value) continue;
    chunks.push(header + ': ' + value);
  }
  return chunks.join(' | ');
}

function parseNumeric_(rawValue, displayValue) {
  if (typeof rawValue === 'number' && !isNaN(rawValue)) {
    return rawValue;
  }
  const source = String(displayValue !== '' ? displayValue : rawValue || '').trim();
  if (!source) return NaN;
  const cleaned = source.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return NaN;
  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : num;
}

function normalizeHeader_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeToken_(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function addWarning_(warnings, message) {
  if (!message) return;
  if (warnings.indexOf(message) < 0) {
    warnings.push(message);
  }
}

function parseIntWithFallback_(value, fallback) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num <= 0) return fallback;
  return num;
}

function parseBooleanWithFallback_(value, fallback) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'TRUE' || normalized === 'YES' || normalized === 'Y' || normalized === '1') return true;
  if (normalized === 'FALSE' || normalized === 'NO' || normalized === 'N' || normalized === '0') return false;
  return fallback;
}

function parseEnumWithFallback_(value, allowedValues, fallback) {
  const normalized = String(value || '').trim().toUpperCase();
  return allowedValues.indexOf(normalized) >= 0 ? normalized : fallback;
}

