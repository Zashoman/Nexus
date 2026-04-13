'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Loader2, Globe } from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';
import EmptyState from '@/components/outreach/ui/EmptyState';

interface Writer {
  id: string;
  name: string;
  pen_name?: string;
  website?: string;
  primary_verticals: string[];
  bio?: string;
  writing_style?: string;
  active: boolean;
  publication_count: number;
  publications: string[];
}

export default function PersonasPage() {
  const [writers, setWriters] = useState<Writer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWriters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outreach/writers');
      const data = await res.json();
      setWriters(data.writers || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWriters(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-bt-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Writer Network"
        subtitle={`${writers.length} writers with publication relationships`}
        action={
          <Button variant="secondary" size="sm" onClick={fetchWriters} icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Button>
        }
      />

      {writers.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-8 h-8" />}
          title="No writers loaded"
          description="Run the v3 SQL migration to seed the writer network."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {writers.map((w) => (
            <Card key={w.id} hover>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bt-primary-light to-bt-teal flex items-center justify-center text-sm font-bold text-white">
                      {w.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-bt-text">{w.name}</h3>
                      {w.website && (
                        <a href={`https://${w.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-bt-primary hover:underline flex items-center gap-1">
                          <Globe className="w-3 h-3" />{w.website}
                        </a>
                      )}
                    </div>
                  </div>
                  <Badge variant={w.active ? 'success' : 'default'} size="sm">{w.active ? 'Active' : 'Inactive'}</Badge>
                </div>

                {w.bio && <p className="text-xs text-bt-text-secondary leading-relaxed mb-3 line-clamp-3">{w.bio}</p>}

                <div className="flex flex-wrap gap-1 mb-3">
                  {(w.primary_verticals || []).map((v) => <Badge key={v} variant="info" size="sm">{v}</Badge>)}
                </div>

                <div className="pt-3 border-t border-bt-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-bt-text-tertiary uppercase tracking-wider">Publications ({w.publication_count})</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {w.publications.slice(0, 5).map((p) => <Badge key={p} variant="default" size="sm">{p}</Badge>)}
                    {w.publications.length > 5 && <Badge variant="default" size="sm">+{w.publications.length - 5}</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
