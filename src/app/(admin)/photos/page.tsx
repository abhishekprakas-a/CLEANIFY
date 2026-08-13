import { JobPhotoGallery } from "@/components/admin/jobPhotoGallery";

export default function JobPhotosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Job photos</h1>
        <p className="text-sm text-slate-500">
          Before &amp; after cleaning photos uploaded by technicians.
        </p>
      </div>
      <JobPhotoGallery />
    </div>
  );
}
