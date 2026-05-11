import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const N = '#0F3460';
const TEAL = '#00D4AA';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getPost(slug: string) {
  const { data } = await getSupabase()
    .from('blog_drafts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Keywise`,
    description: post.meta_description || post.title,
    alternates: { canonical: `https://keywise.app/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | Keywise`,
      description: post.meta_description || post.title,
      url: `https://keywise.app/blog/${post.slug}`,
      siteName: 'Keywise',
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 628 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Keywise`,
      description: post.meta_description || post.title,
    },
    robots: { index: true, follow: true },
  };
}

export default async function DynamicBlogPost(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: INK, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: N, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
              <circle cx="13" cy="16" r="2" fill={TEAL} />
              <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: N, letterSpacing: '-0.3px' }}>keywise</span>
        </Link>
        <Link href="/blog" style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}>← All articles</Link>
      </nav>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', lineHeight: 1.7 }}>
        {post.target_keyword && (
          <div style={{ fontSize: 12, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            {post.target_keyword}{publishedDate ? ` · ${publishedDate}` : ''}
          </div>
        )}
        <h1 style={{ fontSize: 38, fontWeight: 800, color: N, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
          {post.title}
        </h1>
        {post.meta_description && (
          <p style={{ fontSize: 18, color: INK_MID, marginBottom: 32 }}>
            {post.meta_description}
          </p>
        )}

        <div className="blog-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => <h2 style={{ fontSize: 24, fontWeight: 700, color: N, marginTop: 40, marginBottom: 12 }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: 18, fontWeight: 700, color: N, marginTop: 24, marginBottom: 8 }}>{children}</h3>,
              p: ({ children }) => <p style={{ fontSize: 16, color: INK_MID, marginBottom: 16 }}>{children}</p>,
              ul: ({ children }) => <ul style={{ fontSize: 16, color: INK_MID, paddingLeft: 24, marginBottom: 20 }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ fontSize: 16, color: INK_MID, paddingLeft: 24, marginBottom: 20 }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 8 }}>{children}</li>,
              strong: ({ children }) => <strong>{children}</strong>,
              a: ({ href, children }) => <a href={href} style={{ color: '#00A886', fontWeight: 600, textDecoration: 'none' }}>{children}</a>,
              blockquote: ({ children }) => (
                <blockquote style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 16, margin: '16px 0', color: INK_MID, fontStyle: 'italic' }}>{children}</blockquote>
              ),
              code: ({ children }) => (
                <code style={{ background: '#F0F4FF', padding: '2px 6px', borderRadius: 4, fontSize: 14 }}>{children}</code>
              ),
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>{children}</table>
                </div>
              ),
              th: ({ children }) => <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `2px solid ${BORDER}`, fontWeight: 700, color: N }}>{children}</th>,
              td: ({ children }) => <td style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, color: INK_MID }}>{children}</td>,
            }}
          >
            {post.markdown}
          </ReactMarkdown>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 60, padding: 32, background: N, borderRadius: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Manage your rentals smarter</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            Keywise automates lease tracking, rent collection, and tenant communications. Free for up to 2 units.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: TEAL, color: N, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Try Keywise free →
          </Link>
        </div>
      </article>
    </div>
  );
}
