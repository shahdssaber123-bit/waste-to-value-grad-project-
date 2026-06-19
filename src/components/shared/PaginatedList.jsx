import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PaginatedList({ items = [], pageSize = 10, empty = null, children, className = 'space-y-3' }) {
  const safeItems = Array.isArray(items) ? items : [];
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(safeItems.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const visibleItems = useMemo(
    () => safeItems.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [safeItems, safePage, pageSize]
  );

  if (safeItems.length === 0) return empty;

  return (
    <>
      <div className={className}>{visibleItems.map(children)}</div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
        <span>Showing {safePage * pageSize + 1}-{Math.min((safePage + 1) * pageSize, safeItems.length)} of {safeItems.length}</span>
        <Button size="sm" variant="outline" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</Button>
      </div>
    </>
  );
}
