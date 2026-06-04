'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, FileText } from 'lucide-react'

interface Board {
  id: string
  name: string | null
  updated_at: string | null
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function DashboardClient({ initialBoards }: { initialBoards: Board[] }) {
  const [boards] = useState(initialBoards)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const createBoard = useCallback(async () => {
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    const { data } = await supabase
      .from('boards')
      .insert({ name: 'Untitled', mode: 'text', user_id: user.id, color: '#0079bf', tab_position: 0 })
      .select('id')
      .single()

    setCreating(false)
    if (data?.id) router.push(`/board/${data.id}`)
  }, [router])

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#ccc]">
      <header className="flex items-center justify-between px-10 py-5 border-b border-[#242424]">
        <span className="text-[#444] text-xs tracking-widest uppercase">text</span>
        <button
          onClick={createBoard}
          disabled={creating}
          className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#aaa] transition-colors disabled:opacity-40"
        >
          <Plus size={13} />
          New document
        </button>
      </header>

      <main className="px-10 py-8">
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-[#2a2a2a]">
            <FileText size={36} strokeWidth={1} />
            <span className="text-sm text-[#3a3a3a]">No documents yet</span>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
          >
            {boards.map(board => (
              <button
                key={board.id}
                onClick={() => router.push(`/board/${board.id}`)}
                className="text-left px-4 py-3 rounded border border-[#242424] hover:border-[#2e2e2e] hover:bg-[#1e1e1e] transition-colors"
              >
                <div className="text-sm text-[#bbb] truncate mb-1.5">
                  {board.name || 'Untitled'}
                </div>
                <div className="text-[10px] text-[#3a3a3a]">
                  {relativeTime(board.updated_at)}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
