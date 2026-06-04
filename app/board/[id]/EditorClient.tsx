'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  boardId: string
  initialName: string
  initialContent: string
  initialUpdatedAt: string
  isEmbed: boolean
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export default function EditorClient({
  boardId,
  initialName,
  initialContent,
  initialUpdatedAt,
  isEmbed,
}: Props) {
  const [name, setName] = useState(initialName)
  const [content, setContent] = useState(initialContent)
  const [status, setStatus] = useState<SaveStatus>('saved')

  // Refs so event listeners always see current values without stale closures
  const nameRef = useRef(initialName)
  const contentRef = useRef(initialContent)
  const updatedAtRef = useRef(initialUpdatedAt)
  const hasUnsaved = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  nameRef.current = name
  contentRef.current = content

  const save = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    hasUnsaved.current = false
    setStatus('saving')

    const supabase = createClient()
    const { data } = await supabase
      .from('boards')
      .update({ name: nameRef.current, content: contentRef.current })
      .eq('id', boardId)
      .select('updated_at')
      .single()

    if (data?.updated_at) updatedAtRef.current = data.updated_at
    setStatus('saved')
  }, [boardId])

  const scheduleSave = useCallback(() => {
    hasUnsaved.current = true
    setStatus('unsaved')
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(save, 1500)
  }, [save])

  // Window blur → immediate save
  useEffect(() => {
    const onBlur = () => { if (hasUnsaved.current) save() }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [save])

  // beforeunload → best-effort save
  useEffect(() => {
    const onUnload = () => { if (hasUnsaved.current) save() }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [save])

  // Window focus → reconcile with remote
  useEffect(() => {
    const onFocus = async () => {
      if (hasUnsaved.current) {
        save()
        return
      }
      const supabase = createClient()
      const { data } = await supabase
        .from('boards')
        .select('content, name, updated_at')
        .eq('id', boardId)
        .single()

      if (!data) return
      if (data.updated_at > updatedAtRef.current) {
        updatedAtRef.current = data.updated_at
        setContent(data.content ?? '')
        setName(data.name ?? '')
        setStatus('saved')
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [boardId, save])

  // Embed mode: announce ready + respond to sync requests
  useEffect(() => {
    if (!isEmbed) return
    window.parent.postMessage({ type: 'satellite_ready', boardId }, '*')

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'request_sync') save()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [boardId, isEmbed, save])

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [])

  const statusColor =
    status === 'saved' ? 'text-[#333]' :
    status === 'saving' ? 'text-[#555]' :
    'text-[#666]'
  const statusLabel =
    status === 'saved' ? 'saved' :
    status === 'saving' ? 'saving…' :
    'unsaved'

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a]">
      {isEmbed ? (
        <div className="flex items-center justify-between px-3 py-1 border-b border-[#242424] shrink-0">
          <span className="text-[#555] text-xs truncate">{name}</span>
          <span className={`text-[10px] shrink-0 ml-2 ${statusColor}`}>{statusLabel}</span>
        </div>
      ) : (
        <header className="flex items-center justify-between px-8 py-3 border-b border-[#242424] shrink-0">
          <input
            value={name}
            onChange={e => { setName(e.target.value); scheduleSave() }}
            className="bg-transparent text-[#bbb] text-sm font-medium outline-none placeholder-[#3a3a3a] min-w-0 flex-1 mr-6"
            placeholder="Untitled"
          />
          <span className={`text-xs shrink-0 ${statusColor}`}>{statusLabel}</span>
        </header>
      )}
      <textarea
        value={content}
        onChange={e => { setContent(e.target.value); scheduleSave() }}
        className="flex-1 resize-none bg-transparent text-[#d4d4d4] text-sm leading-relaxed outline-none placeholder-[#333] font-mono"
        style={{ padding: isEmbed ? '1.25rem' : '2rem 2rem 2rem 2rem' }}
        placeholder="Start writing…"
        spellCheck={false}
        autoFocus
      />
    </div>
  )
}
