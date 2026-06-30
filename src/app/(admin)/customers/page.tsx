import { CustomerTable } from "@/components/customers/customerTable";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <p className="text-sm text-slate-500">
          Search, filter, and manage customer records.
        </p>
      </div>
      <CustomerTable />
    </div>
  );
}
