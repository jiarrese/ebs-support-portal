'use client'

import { useState } from 'react'
import TicketTimer from './TicketTimer'
import AddTimeEntry from './AddTimeEntry'

export default function TicketTimeSection({ ticketId }: { ticketId: string }) {
  const [prefillHours, setPrefillHours] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <TicketTimer ticketId={ticketId} onStop={setPrefillHours} />
      <AddTimeEntry
        ticketId={ticketId}
        prefillHours={prefillHours}
        onPrefillConsumed={() => setPrefillHours(null)}
      />
    </div>
  )
}
