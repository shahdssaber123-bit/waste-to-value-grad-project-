import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function OperationsTable({ operations = [], onRefresh, onCancel }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Operation</th><th className="px-4 py-3">Material</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
        <tbody>
          {operations.slice(0, 5).map((item) => (
            <tr key={item.id} className="border-t"><td className="px-4 py-3">Pickup #{item.id}</td><td className="px-4 py-3">{item.contract?.commodity?.title || item.material_type || 'Material'}</td><td className="px-4 py-3"><Badge variant="outline">{item.status}</Badge></td><td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => onCancel?.(item.id)}>Cancel</Button></td></tr>
          ))}
          {operations.length === 0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">No DB operations loaded.</td></tr>}
        </tbody>
      </table>
      <div className="border-t p-3 text-right"><Button size="sm" variant="outline" onClick={onRefresh}>Refresh from API</Button></div>
    </div>
  );
}
