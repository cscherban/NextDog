/**
 * Shared column-definition types for the Logs and Requests grids.
 *
 * Previously each view (and the column picker) declared its own `ColumnDef`,
 * and they had drifted: some made `attrKey` required, others optional and added
 * a `core` flag. That drift produced "two unrelated types named ColumnDef"
 * errors once the ui package gained a real typecheck. These are the single
 * source of truth.
 */

/**
 * A column in a grid. Covers both the always-present core columns (which have
 * no `attrKey`) and user-added custom columns (which always have one). Used for
 * column lists that mix the two.
 */
export interface ColumnDef {
  id: string;
  label: string;
  /** True for a built-in column that is always present. */
  core?: boolean;
  /** Span/log attribute key this column pulls its value from. Present on custom columns. */
  attrKey?: string;
}

/**
 * A user-added column. Always carries the attribute key it renders, so callers
 * that only ever deal with custom columns (the column picker, the per-view
 * custom-column state) can rely on `attrKey` without narrowing.
 */
export interface CustomColumn {
  id: string;
  label: string;
  attrKey: string;
}
