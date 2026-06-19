import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { platformV1 } from '@/services/platformV1Service';

function Stat({ label, value, hint }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value ?? '—'}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ListCard({ title, items, renderItem, empty = 'No records yet.' }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {(!items || items.length === 0) && (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}

        {(items || []).slice(0, 8).map((item, index) => (
          <div
            key={item.id || item.name || item.title || index}
            className="rounded-xl border border-border/60 p-3 text-sm"
          >
            {renderItem(item, index)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function GraduationFeaturesPanel() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await platformV1.graduation.overview();

      const normalized =
        response?.data?.overview ||
        response?.overview ||
        response?.data ||
        response ||
        {};

      setOverview(normalized);
    } catch (err) {
      setError(err.message || 'Could not load platform overview.');
      toast.error(err.message || 'Could not load platform overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary =
    overview?.executive_summary ||
    overview?.summary ||
    {};

  const features = overview?.feature_checklist || [];

  const coreCount = useMemo(
    () => features.filter((f) => f.type === 'core').length,
    [features]
  );

  const creativeCount = useMemo(
    () => features.filter((f) => f.type === 'creative').length,
    [features]
  );

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              Platform Operations Intelligence
            </CardTitle>

            <Button
              size="sm"
              variant="outline"
              onClick={load}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This screen summarizes connected platform capabilities:
            AI support, operations, finance, environmental impact,
            smart matching, alerts, rankings, and operational readiness.
          </p>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Platform readiness</span>
              <span>{summary.platform_readiness || 0}%</span>
            </div>

            <Progress value={summary.platform_readiness || 0} />
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <Stat
          label="Recycled Waste"
          value={`${summary.recycled_kg || 0} kg`}
          hint="Accepted/baled material"
        />

        <Stat
          label="CO₂ Saved"
          value={`${summary.co2_saved_kg || 0} kg`}
          hint="Estimated sustainability impact"
        />

        <Stat
          label="Contracts"
          value={summary.active_contracts || 0}
          hint="Active business contracts"
        />

        <Stat
          label="Invoices"
          value={`${summary.invoice_total || 0} EGP`}
          hint={`${summary.paid_total || 0} EGP paid`}
        />

        <Stat
          label="Success Rate"
          value={`${summary.collection_success_rate || 0}%`}
          hint="Completed pickups"
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <ListCard
          title="AI Suggested Next Actions"
          items={overview?.next_actions}
          empty="No urgent actions now."
          renderItem={(item) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.reason}
                </p>
              </div>

              <Badge variant="outline">
                {item.priority}
              </Badge>
            </div>
          )}
        />

        <ListCard
          title="Live Alerts"
          items={overview?.alerts}
          empty="No alerts now."
          renderItem={(item) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>

              <Badge variant="outline">
                {item.severity}
              </Badge>
            </div>
          )}
        />

        <ListCard
          title="Top Material Value"
          items={overview?.material_analytics}
          renderItem={(item) => (
            <div>
              <p className="font-semibold">{item.title}</p>

              <p className="text-xs text-muted-foreground mt-1">
                Inventory: {item.inventory_kg} kg ·
                Value: {item.estimated_value} EGP
              </p>

              <p className="text-xs text-muted-foreground">
                Grade A/B/C:
                {' '}
                {item.grade_pricing?.A}/
                {item.grade_pricing?.B}/
                {item.grade_pricing?.C}
              </p>
            </div>
          )}
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <ListCard
          title="Hub Ranking"
          items={overview?.rankings?.hubs}
          renderItem={(item) => (
            <div>
              <p className="font-semibold">
                #{item.id} {item.name}
              </p>

              <p className="text-xs text-muted-foreground">
                {item.inventory_kg} kg · Score {item.score}%
              </p>
            </div>
          )}
        />

        <ListCard
          title="Driver Ranking"
          items={overview?.rankings?.drivers}
          renderItem={(item) => (
            <div>
              <p className="font-semibold">{item.name}</p>

              <p className="text-xs text-muted-foreground">
                {item.completed_pickups}/{item.total_pickups}
                {' '}
                completed · Score {item.score}%
              </p>
            </div>
          )}
        />

        <ListCard
          title="Supplier Performance"
          items={overview?.rankings?.suppliers}
          renderItem={(item) => (
            <div>
              <p className="font-semibold">{item.name}</p>

              <p className="text-xs text-muted-foreground">
                Delivered {item.delivered_kg} kg · Score {item.score}%
              </p>
            </div>
          )}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Platform Capability Checklist ({features.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Core: {coreCount}
            </Badge>

            <Badge variant="outline">
              Creative: {creativeCount}
            </Badge>

            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              Operational
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-xl border border-border/60 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">
                    {feature.label}
                  </p>

                  <Badge variant="outline">
                    {feature.type}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
