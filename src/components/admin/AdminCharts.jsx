import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#14B8A6', '#F59E0B', '#10B981', '#3B82F6', '#A855F7', '#EF4444', '#64748B', '#84CC16'];

const chartCard =
  'rounded-2xl border border-cyan-900/20 bg-white p-2 shadow-sm';

const titleClass = 'text-sm font-bold text-slate-900';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  fontSize: 12,
};

function compactMaterialName(name = '') {
  return String(name).length > 14 ? `${String(name).slice(0, 14)}...` : name;
}

export default function AdminCharts({ operations = [], inventory = [] }) {
  const matData = operations
    .reduce((acc, op) => {
      const name = op.material || 'Unknown';
      const value = Number(op.actualQty || op.estQty || 0);
      const existing = acc.find((a) => a.name === name);

      if (existing) existing.value += value;
      else acc.push({ name, value });

      return acc;
    }, [])
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const monthlyData = [
    { month: 'Jan', volume: 8200 },
    { month: 'Feb', volume: 9400 },
    { month: 'Mar', volume: 11200 },
    { month: 'Apr', volume: 12480 },
  ];

  const now = Date.now();

  const agingData = inventory
    .map((item) => {
      const daysOld = Math.max(
        0,
        Math.floor((now - new Date(item.dateAdded).getTime()) / 86400000),
      );

      const daysToRisk = Math.max(
        0,
        Math.floor((new Date(item.riskDate).getTime() - now) / 86400000),
      );

      return {
        name: compactMaterialName(item.material || 'Unknown'),
        daysOld,
        daysToRisk,
      };
    })
    .filter((item) => item.daysOld > 0 || item.daysToRisk > 0)
    .sort((a, b) => b.daysOld - a.daysOld)
    .slice(0, 8);

  const purityData = inventory
    .reduce((acc, item) => {
      const name = item.purityGrade || 'Unknown';
      const value = Number(item.weight || 0);
      const existing = acc.find((a) => a.name === name);

      if (existing) existing.value += value;
      else acc.push({ name, value });

      return acc;
    }, [])
    .filter((item) => item.value > 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className={chartCard}>
        <CardHeader className="pb-2">
          <CardTitle className={titleClass}>Monthly Volume (kg)</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="volume" fill="#14B8A6" radius={[8, 8, 0, 0]} barSize={52} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className={chartCard}>
        <CardHeader className="pb-2">
          <CardTitle className={titleClass}>Materials Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={matData}
                cx="50%"
                cy="48%"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={false}
              >
                {matData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="bottom"
                height={48}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-xs text-slate-700">
                    {compactMaterialName(value)}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className={chartCard}>
        <CardHeader className="pb-2">
          <CardTitle className={titleClass}>Purity Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={purityData}
                cx="50%"
                cy="47%"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                label={false}
              >
                {purityData.map((_, i) => (
                  <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" height={42} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className={chartCard}>
        <CardHeader className="pb-2">
          <CardTitle className={titleClass}>Inventory Aging (days)</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={agingData}
              layout="vertical"
              margin={{ top: 8, right: 30, left: 35, bottom: 8 }}
              barCategoryGap={10}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis
                dataKey="name"
                type="category"
                width={95}
                tick={{ fontSize: 11, fill: '#334155' }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" height={30} iconType="circle" />
              <Bar dataKey="daysOld" fill="#F59E0B" name="Days in Stock" radius={[0, 6, 6, 0]} />
              <Bar dataKey="daysToRisk" fill="#14B8A6" name="Days to Risk" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
