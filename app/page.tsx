import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1a1a1a] text-[#555] gap-1 text-sm">
        <span>Please log in at</span>
        <a href="https://syncedsys.com" className="text-[#888] hover:text-[#aaa] transition-colors">
          syncedsys.com
        </a>
      </div>
    )
  }

  const { data: boards } = await supabase
    .from('boards')
    .select('id, name, updated_at')
    .eq('mode', 'text')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return <DashboardClient initialBoards={boards ?? []} />
}
