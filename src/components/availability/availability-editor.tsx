"use client";

import { useState, useTransition } from "react";
import { saveWeeklyAvailabilityAction } from "@/actions/availability";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Select } from "@/components/ui/form";
import { minutesToLabel } from "@/lib/time";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const TIMES = Array.from({ length: 24 * 4 + 1 }, (_, i) => i * 15);

export type Rule = { weekday: number; startMinutes: number; endMinutes: number };
export type StaffOption = { id: string; name: string };

export function AvailabilityEditor({
  clinicId,
  staff,
  rulesByStaff,
}: {
  clinicId: string;
  staff: StaffOption[];
  /** key "" = clinic-wide */
  rulesByStaff: Record<string, Rule[]>;
}) {
  const [staffId, setStaffId] = useState("");
  const [rules, setRules] = useState<Rule[]>(rulesByStaff[""] ?? []);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function switchStaff(id: string) {
    setStaffId(id);
    setRules(rulesByStaff[id] ?? []);
    setMessage(null);
  }

  function add(weekday: number) {
    setRules([...rules, { weekday, startMinutes: 9 * 60, endMinutes: 17 * 60 }]);
  }
  function remove(index: number) {
    setRules(rules.filter((_, i) => i !== index));
  }
  function change(index: number, patch: Partial<Rule>) {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function copyWeekdays() {
    const monday = rules.filter((r) => r.weekday === 1);
    setRules([...rules.filter((r) => r.weekday === 0 || r.weekday === 6), ...[1, 2, 3, 4, 5].flatMap((d) => monday.map((r) => ({ ...r, weekday: d })))]);
  }

  function save() {
    setMessage(null);
    start(async () => {
      const r = await saveWeeklyAvailabilityAction(clinicId, { staffId: staffId || undefined, rules });
      setMessage(r.ok ? { ok: true, text: "Availability saved" } : { ok: false, text: r.error });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-72">
          <label htmlFor="staff" className="mb-1 block text-sm font-medium">
            Hours for
          </label>
          <Select id="staff" value={staffId} onChange={(e) => switchStaff(e.target.value)}>
            <option value="">Whole clinic (default)</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {staffId ? <p className="mt-1 text-xs text-muted">When a staff member has their own hours on a day, those replace the clinic hours for bookings assigned to them.</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyWeekdays}>
          Copy Monday to all weekdays
        </Button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {ORDER.map((weekday) => {
          const dayRules = rules.map((r, index) => ({ r, index })).filter((x) => x.r.weekday === weekday);
          return (
            <div key={weekday} className="grid gap-2 p-3 sm:grid-cols-[7rem_1fr]">
              <p className="pt-2 text-sm font-medium">{WEEKDAYS[ORDER.indexOf(weekday)]}</p>
              <div className="space-y-2">
                {dayRules.length === 0 ? <p className="pt-2 text-sm text-muted">Closed</p> : null}
                {dayRules.map(({ r, index }) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Select value={r.startMinutes} onChange={(e) => change(index, { startMinutes: Number(e.target.value) })} className="w-28">
                      {TIMES.map((t) => (
                        <option key={t} value={t}>
                          {minutesToLabel(t)}
                        </option>
                      ))}
                    </Select>
                    <span className="text-sm text-muted">to</span>
                    <Select value={r.endMinutes} onChange={(e) => change(index, { endMinutes: Number(e.target.value) })} className="w-28">
                      {TIMES.map((t) => (
                        <option key={t} value={t}>
                          {minutesToLabel(t)}
                        </option>
                      ))}
                    </Select>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => add(weekday)}>
                  + Add hours
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {message ? message.ok ? <FormSuccess message={message.text} /> : <FormError message={message.text} /> : null}
      <Button type="button" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save hours"}
      </Button>
    </div>
  );
}
