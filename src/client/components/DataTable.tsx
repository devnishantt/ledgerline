import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Empty } from "./ui";
export function DataTable<T>({
  rows,
  columns,
  search = true,
}: {
  rows: T[];
  columns: ColumnDef<T, any>[];
  search?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]),
    [filter, setFilter] = useState("");
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  return (
    <section className="table-section">
      {search && (
        <label className="table-search">
          <Search size={16} />
          <input
            aria-label="Filter displayed rows"
            placeholder="Filter these rows…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span>{table.getFilteredRowModel().rows.length} records</span>
        </label>
      )}
      {!rows.length ? (
        <Empty />
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id}>
                        <button
                          className="table-sort"
                          disabled={!header.column.getCanSort()}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getCanSort() && (
                            <ArrowDownUp size={12} />
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="table-footer">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())}
            </span>
            <nav aria-label="Table pages">
              <button
                className="icon-button"
                aria-label="Previous page"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Next page"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          </footer>
        </>
      )}
    </section>
  );
}
