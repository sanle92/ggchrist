import { createClient } from '@/lib/supabase/server';

export async function MinistryImpact() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('impact_metrics').select('meals,school_days,business_count,medical_helps,clothing_items').eq('id', true).maybeSingle();
  if (error || !data) return null;
  const metrics = [
    ['Meals provided', data.meals], ['School days supported', data.school_days],
    ['Businesses supported', data.business_count], ['Medical helps', data.medical_helps],
    ['Clothing items', data.clothing_items],
  ] as const;
  if (!metrics.some(([, value]) => Number(value) > 0)) return null;
  return <section className="ggc-shell pb-20" aria-labelledby="ministry-impact-title">
    <h2 id="ministry-impact-title" className="section-heading text-center">Our ministry impact</h2>
    <dl className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-5">
      {metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-surface p-5 text-center">
        <dt className="text-sm text-ink3">{label}</dt>
        <dd className="mt-3 text-3xl font-bold text-forest">{Number(value).toLocaleString('en')}</dd>
      </div>)}
    </dl>
  </section>;
}
