import {
  deleteConditionAction,
  deleteDocumentAction,
  deleteMedicationAction,
  deleteVaccinationAction,
  deleteVisitNoteAction,
  resolveConditionAction,
  toggleMedicationAction,
} from "@/actions/records";
import {
  ConditionForm,
  DocumentForm,
  MedicationForm,
  VaccinationForm,
  VisitNoteForm,
} from "@/components/records/record-forms";
import { Badge, Card, CardTitle, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type Viewer = { id: string; canWrite: boolean; isOwner: boolean; clinicId?: string };

export async function loadPetRecords(petId: string) {
  const [vaccinations, medications, conditions, visitNotes, documents] = await Promise.all([
    db.vaccination.findMany({ where: { petId }, orderBy: { administeredAt: "desc" }, include: { clinic: { select: { name: true } } } }),
    db.medication.findMany({ where: { petId }, orderBy: [{ active: "desc" }, { startDate: "desc" }], include: { clinic: { select: { name: true } } } }),
    db.condition.findMany({ where: { petId }, orderBy: [{ resolvedAt: "asc" }, { createdAt: "desc" }], include: { clinic: { select: { name: true } } } }),
    db.visitNote.findMany({
      where: { petId },
      orderBy: { visitedAt: "desc" },
      include: { clinic: { select: { name: true } }, author: { select: { name: true } } },
    }),
    db.document.findMany({ where: { petId }, orderBy: { createdAt: "desc" }, include: { clinic: { select: { name: true } } } }),
  ]);
  const now = Date.now();
  return { vaccinations, medications, conditions, visitNotes, documents, now, soon: now + 30 * 24 * 3600 * 1000 };
}

export type PetRecords = Awaited<ReturnType<typeof loadPetRecords>>;

function canDelete(viewer: Viewer, createdById: string | null) {
  return viewer.canWrite && (viewer.isOwner || createdById === viewer.id);
}

function Source({ clinicName }: { clinicName?: string | null }) {
  if (!clinicName) return null;
  return <span className="text-xs text-muted"> · added by {clinicName}</span>;
}

export function RecordsPanel({
  petId,
  records,
  viewer,
  ownerClinics,
}: {
  petId: string;
  records: PetRecords;
  viewer: Viewer;
  /** Clinics the owner can attribute a visit note to (from their bookings). */
  ownerClinics?: Array<{ id: string; name: string }>;
}) {
  const { now, soon } = records;
  return (
    <div className="space-y-6">
      {/* Vaccinations */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Vaccinations</CardTitle>
          <span className="text-xs text-muted">{records.vaccinations.length} on file</span>
        </div>
        {records.vaccinations.length === 0 ? (
          <p className="text-sm text-muted">No vaccinations recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {records.vaccinations.map((v) => {
              const exp = v.expiresAt?.getTime();
              const tone = exp ? (exp < now ? "danger" : exp < soon ? "warning" : "success") : "neutral";
              return (
                <li key={v.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium">
                      {v.name}
                      <Source clinicName={v.clinic?.name} />
                    </p>
                    <p className="text-muted">
                      Given {formatDate(v.administeredAt)}
                      {v.administeredBy ? ` by ${v.administeredBy}` : ""}
                      {v.lotNumber ? ` · lot ${v.lotNumber}` : ""}
                    </p>
                    {v.notes ? <p className="mt-1 whitespace-pre-line text-muted">{v.notes}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {v.expiresAt ? (
                      <Badge tone={tone}>{exp! < now ? "Expired" : "Due"} {formatDate(v.expiresAt)}</Badge>
                    ) : null}
                    {canDelete(viewer, v.createdById) ? (
                      <ConfirmButton action={deleteVaccinationAction.bind(null, petId, v.id)} confirm="Remove this vaccination?">
                        Remove
                      </ConfirmButton>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {viewer.canWrite ? <div className="mt-3"><VaccinationForm petId={petId} /></div> : null}
      </Card>

      {/* Medications */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Medications</CardTitle>
          <span className="text-xs text-muted">{records.medications.filter((m) => m.active).length} active</span>
        </div>
        {records.medications.length === 0 ? (
          <p className="text-sm text-muted">No medications recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {records.medications.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                <div className="text-sm">
                  <p className="font-medium">
                    {m.name} <span className="font-normal text-muted">· {m.dosage}, {m.frequency}</span>
                    <Source clinicName={m.clinic?.name} />
                  </p>
                  <p className="text-muted">
                    From {formatDate(m.startDate)}
                    {m.endDate ? ` to ${formatDate(m.endDate)}` : ""}
                    {m.prescribedBy ? ` · prescribed by ${m.prescribedBy}` : ""}
                  </p>
                  {m.notes ? <p className="mt-1 whitespace-pre-line text-muted">{m.notes}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={m.active ? "success" : "neutral"}>{m.active ? "Active" : "Finished"}</Badge>
                  {viewer.canWrite ? (
                    <ConfirmButton action={toggleMedicationAction.bind(null, petId, m.id)}>
                      {m.active ? "Mark finished" : "Reactivate"}
                    </ConfirmButton>
                  ) : null}
                  {canDelete(viewer, m.createdById) ? (
                    <ConfirmButton action={deleteMedicationAction.bind(null, petId, m.id)} confirm="Remove this medication?">
                      Remove
                    </ConfirmButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {viewer.canWrite ? <div className="mt-3"><MedicationForm petId={petId} /></div> : null}
      </Card>

      {/* Conditions */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Conditions & allergies</CardTitle>
          <span className="text-xs text-muted">{records.conditions.filter((c) => !c.resolvedAt).length} ongoing</span>
        </div>
        {records.conditions.length === 0 ? (
          <p className="text-sm text-muted">No conditions recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {records.conditions.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-2">
                <div className="text-sm">
                  <p className="font-medium">
                    {c.name}
                    {c.severity ? <span className="font-normal text-muted"> · {c.severity.toLowerCase()}</span> : null}
                    <Source clinicName={c.clinic?.name} />
                  </p>
                  <p className="text-muted">
                    {c.diagnosedAt ? `Diagnosed ${formatDate(c.diagnosedAt)}` : "Diagnosis date unknown"}
                    {c.resolvedAt ? ` · resolved ${formatDate(c.resolvedAt)}` : ""}
                  </p>
                  {c.notes ? <p className="mt-1 whitespace-pre-line text-muted">{c.notes}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={c.resolvedAt ? "neutral" : "warning"}>{c.resolvedAt ? "Resolved" : "Ongoing"}</Badge>
                  {viewer.canWrite ? (
                    <ConfirmButton action={resolveConditionAction.bind(null, petId, c.id)}>
                      {c.resolvedAt ? "Reopen" : "Mark resolved"}
                    </ConfirmButton>
                  ) : null}
                  {canDelete(viewer, c.createdById) ? (
                    <ConfirmButton action={deleteConditionAction.bind(null, petId, c.id)} confirm="Remove this condition?">
                      Remove
                    </ConfirmButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {viewer.canWrite ? <div className="mt-3"><ConditionForm petId={petId} /></div> : null}
      </Card>

      {/* Visit notes */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Visit history</CardTitle>
          <span className="text-xs text-muted">{records.visitNotes.length} visits</span>
        </div>
        {records.visitNotes.length === 0 ? (
          <p className="text-sm text-muted">No visit notes yet. Notes appear here after appointments, or you can add your own.</p>
        ) : (
          <ul className="space-y-3">
            {records.visitNotes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatDate(n.visitedAt)} · {n.clinic.name}
                    </p>
                    <p className="text-xs text-muted">Written by {n.author.name ?? "clinic staff"}</p>
                  </div>
                  {canDelete(viewer, n.authorId) ? (
                    <ConfirmButton action={deleteVisitNoteAction.bind(null, petId, n.id)} confirm="Remove this visit note?">
                      Remove
                    </ConfirmButton>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-line">{n.summary}</p>
                {n.diagnosis ? (
                  <p className="mt-2"><span className="font-medium">Diagnosis:</span> {n.diagnosis}</p>
                ) : null}
                {n.treatment ? (
                  <p className="mt-1"><span className="font-medium">Treatment:</span> {n.treatment}</p>
                ) : null}
                {n.followUpAt ? (
                  <p className="mt-1 text-muted">Follow-up {formatDate(n.followUpAt)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {viewer.canWrite ? (
          <div className="mt-3">
            <VisitNoteForm petId={petId} clinics={ownerClinics} fixedClinicId={viewer.isOwner ? undefined : viewer.clinicId} />
          </div>
        ) : null}
      </Card>

      {/* Documents */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Documents</CardTitle>
          <span className="text-xs text-muted">{records.documents.length} files</span>
        </div>
        {records.documents.length === 0 ? (
          <p className="text-sm text-muted">No documents uploaded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {records.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    {d.title}
                  </a>
                  <Source clinicName={d.clinic?.name} />
                  <p className="text-muted">
                    {d.mimeType.replace("application/", "").replace("image/", "").toUpperCase()} · {(d.sizeBytes / 1024).toFixed(0)} KB · {formatDate(d.createdAt)}
                  </p>
                </div>
                {canDelete(viewer, d.uploadedById) ? (
                  <ConfirmButton action={deleteDocumentAction.bind(null, petId, d.id)} confirm="Delete this document?">
                    Remove
                  </ConfirmButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {viewer.canWrite ? <div className="mt-3"><DocumentForm petId={petId} /></div> : null}
      </Card>
    </div>
  );
}

export function EmptyRecords() {
  return <EmptyState title="Nothing here yet" />;
}
