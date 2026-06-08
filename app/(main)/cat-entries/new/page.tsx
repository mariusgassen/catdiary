import { CatEntryForm } from "@/components/CatEntryForm";

export default function NewCatEntryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Log a cat</h1>
      <CatEntryForm />
    </div>
  );
}
