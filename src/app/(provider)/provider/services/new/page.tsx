import type { Metadata } from "next";
import { createServiceAction } from "@/actions/services";
import { ServiceForm } from "@/components/clinics/service-form";
import { Card, PageHeader } from "@/components/ui/card";
import { categoryOptions, requireProviderClinic } from "@/lib/provider";

export const metadata: Metadata = { title: "Add service" };

export default async function NewServicePage() {
  const { membership } = await requireProviderClinic("/provider/services/new");
  const categories = await categoryOptions();
  return (
    <>
      <PageHeader title="Add a service" />
      <Card>
        <ServiceForm action={createServiceAction.bind(null, membership.clinicId)} categories={categories} submitLabel="Add service" />
      </Card>
    </>
  );
}
