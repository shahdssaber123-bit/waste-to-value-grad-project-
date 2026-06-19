import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, AlertTriangle, Search, Warehouse, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InventoryPanel({ inventory }) {
  const [search, setSearch] = useState('');
  const [filterMat, setFilterMat] = useState('all');

  const now = Date.now();
  const filtered = inventory.filter(item => {
    const matchSearch = !search || item.material.toLowerCase().includes(search.toLowerCase()) || item.batchId.toLowerCase().includes(search.toLowerCase());
    const matchMat = filterMat === 'all' || item.materialCode === filterMat;
    return matchSearch && matchMat;
  });

  const totalWeight = inventory.reduce((s, i) => s + i.weight, 0);
  const nearExpiry = inventory.filter(i => {
    const days = Math.floor((new Date(i.riskDate).getTime() - now) / 86400000);
    return days < 30 && days >= 0;
  });

  const materialCodes = [...new Set(inventory.map(i => i.materialCode))];

  return (
    <div className="space-y-6">
      {/* Inventory Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-xl font-bold">{inventory.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Weight</p>
              <p className="text-xl font-bold">{(totalWeight / 1000).toFixed(1)}t</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-xl font-bold">{inventory.filter(i => !i.reserved).length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Near Expiry</p>
              <p className="text-xl font-bold">{nearExpiry.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." className="pl-9 h-9 rounded-lg text-xs" />
        </div>
        <Select value={filterMat} onValueChange={setFilterMat}>
          <SelectTrigger className="h-9 w-40 rounded-lg text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {materialCodes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, i) => {
          const daysToRisk = Math.floor((new Date(item.riskDate).getTime() - now) / 86400000);
          const isNearExpiry = daysToRisk < 30 && daysToRisk >= 0;
          const daysOld = Math.floor((now - new Date(item.dateAdded).getTime()) / 86400000);

          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`overflow-hidden hover:shadow-lg transition-all ${isNearExpiry ? 'ring-1 ring-red-200' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-[10px] font-mono">{item.batchId}</Badge>
                    <div className="flex gap-1">
                      {item.reserved && <Badge className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">Reserved</Badge>}
                      {isNearExpiry && <Badge className="text-[10px] bg-red-50 text-red-600 border-red-200">Near Expiry</Badge>}
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{item.material}</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-xs text-muted-foreground mt-3">
                    <div>Weight: <span className="text-foreground font-medium">{item.weight}kg</span></div>
                    <div>Grade: <span className="text-foreground font-medium">{item.purityGrade}</span></div>
                    <div>Stage: <span className="text-foreground font-medium">{item.processingStage}</span></div>
                    <div>Condition: <span className="text-foreground font-medium">{item.condition}</span></div>
                    <div>Age: <span className="text-foreground font-medium">{daysOld}d</span></div>
                    <div>Risk in: <span className={`font-medium ${isNearExpiry ? 'text-red-500' : 'text-foreground'}`}>{daysToRisk}d</span></div>
                  </div>
                  {item.sourceOp && <p className="text-[10px] text-muted-foreground mt-2">Source: {item.sourceOp}</p>}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}