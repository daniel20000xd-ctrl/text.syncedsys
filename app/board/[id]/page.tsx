import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ embed?: string; token?: string }>
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { id } = await params
  const { embed, token } = await searchParams
  const isEmbed = embed === 'true' || embed === '1'

  const supabase = token
    ? createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          cookies: { getAll: () => [], setAll: () => {} },
        }
      )
    : await createClient()

  const { data: { user } } = await supabase.auth.getUser(token ?? undefined)

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1a1a1a] text-[#555] gap-1 text-sm">
        {isEmbed ? (
          <span>Not authenticated</span>
        ) : (
          <>
            <span>Please log in at</span>
            <span className="text-[#888]">syncedsys.com</span>
            <span>to access this board.</span>
          </>
        )}
      </div>
    )
  }

  const { data: board } = await supabase
    .from('boards')
    .select('id, name, content, updated_at, mode')
    .eq('id', id)
    .eq('mode', 'text')
    .single()

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] text-[#555] text-sm">
        Board not found
      </div>
    )
  }

  return (
    <EditorClient
      boardId={board.id}
      initialName={board.name ?? ''}
      initialContent={board.content ?? ''}
      initialUpdatedAt={board.updated_at ?? ''}
      isEmbed={isEmbed}
    />
  )
}
