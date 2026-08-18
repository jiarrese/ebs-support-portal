-- tickets.updated_at no se actualizaba al cargar horas (manual o por el timer),
-- porque time_entries es una tabla aparte y nada tocaba el ticket. Trigger que
-- bumpea updated_at del ticket en cada insert/update/delete de time_entries —
-- ya aplicado en Supabase vía MCP.

create or replace function public.touch_ticket_on_time_entry() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update tickets set updated_at = now() where id = old.ticket_id;
    return old;
  else
    update tickets set updated_at = now() where id = new.ticket_id;
    if tg_op = 'UPDATE' and old.ticket_id is distinct from new.ticket_id then
      update tickets set updated_at = now() where id = old.ticket_id;
    end if;
    return new;
  end if;
end;
$$;

create trigger time_entries_touch_ticket
  after insert or update or delete on time_entries
  for each row execute function public.touch_ticket_on_time_entry();
