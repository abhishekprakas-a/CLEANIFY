import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/customerForm";
import { customerService } from "@/services";
import { ApiError } from "@/lib/apiError";
import { routes } from "@/constants";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  let customer;
  try {
    customer = await customerService.getById(params.id);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${routes.admin.customers}/${customer.id}`}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← Back to customer
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">
          Edit {customer.customerName}
        </h1>
      </div>
      <CustomerForm customer={customer} />
    </div>
  );
}
