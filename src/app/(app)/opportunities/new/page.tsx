import { addManualJob } from "@/app/actions";
import { Card, PageHeader, Input, Label, Textarea, Select, Button } from "@/components/ui";

export default function NewVacancy() {
  return (
    <>
      <PageHeader eyebrow="Live Opportunities" title="Add a vacancy you found" subtitle="Paste the details from the original posting. LEXHUNT classifies it, scores it against your profile and deduplicates it against existing listings. Tick 'official' only if the URL is the employer's own careers page or ATS." />
      <Card className="max-w-3xl p-6">
        <form action={addManualJob} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Exact advertised title *</Label>
            <Input id="title" name="title" required />
          </div>
          <div>
            <Label htmlFor="employer">Employer *</Label>
            <Input id="employer" name="employer" required />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue="Riyadh" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="url">Source / application URL *</Label>
            <Input id="url" name="url" type="url" required placeholder="https://" />
          </div>
          <div>
            <Label htmlFor="workMode">Working arrangement</Label>
            <Select id="workMode" name="workMode" defaultValue="unknown">
              <option value="unknown">Not stated</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="deadline">Verified closing date</Label>
            <Input id="deadline" name="deadline" type="date" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Job description (paste full text for best matching)</Label>
            <Textarea id="description" name="description" rows={10} />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="official" className="accent-[var(--gold)]" /> This URL is the employer&apos;s official posting and it is currently open
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Add and score</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
