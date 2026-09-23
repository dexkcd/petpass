import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateServiceAction } from "@/actions/services";
import { ServiceForm } from "@/components/clinics/service-form";
import { Card, PageHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { categoryOptions, requireProviderClinic } from "@/lib/provider";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const { membership } = await requireProviderClinic(`/provider/services/${serviceId}/edit`);
  const service = await db.service.findFirst({ where: { id: serviceId, clinicId: membership.clinicId } });
  if (!service) notFound();
  const categories = await categoryOptions();
  return (
    <>
      <PageHeader title={`Edit ${service.name}`} />
      <Card>
        <ServiceForm action={updateServiceAction.bind(null, service.id)} categories={categories} initial={service} submitLabel="Save changes" />
      </Card>
    </>
  );
}
