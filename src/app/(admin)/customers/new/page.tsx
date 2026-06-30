import Link from "next/link";
import { CustomerForm } from "@/components/customers/customerForm";
import { routes } from "@/constants";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={routes.admin.customers}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← Back to customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">New customer</h1>
      </div>
      <CustomerForm />
    </div>
  );
}
