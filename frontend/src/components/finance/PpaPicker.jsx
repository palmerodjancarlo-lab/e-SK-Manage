// Program → Project → Activity picker for an expense. The PPA an expense is linked to
// is what Budget Utilization rolls the spending up into (only the program is required
// for that; project and activity make the breakdown more precise).
import { useQuery } from '@tanstack/react-query';
import { FolderKanban } from 'lucide-react';
import api from '../../lib/api';
import { Select } from '../ui';
import { EMPTY_PPA } from '../../lib/finance';

export default function PpaPicker({ value = EMPTY_PPA, onChange, hint = true }) {
  const { program = '', project = '', activity = '' } = value;
  const programsQ = useQuery({ queryKey: ['ppa-programs'], queryFn: async () => (await api.get('/programs')).data.programs || [] });
  const projectsQ = useQuery({
    queryKey: ['ppa-projects', program], enabled: !!program,
    queryFn: async () => (await api.get(`/programs/${program}/projects`)).data.projects || [],
  });
  const activitiesQ = useQuery({
    queryKey: ['ppa-activities', project], enabled: !!project,
    queryFn: async () => (await api.get(`/programs/projects/${project}/activities`)).data.activities || [],
  });
  const programs = (programsQ.data || []).filter((p) => p.status !== 'cancelled' || p._id === program);

  return (
    <fieldset className="rounded-xl border border-border p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-medium text-muted">
        <FolderKanban aria-hidden="true" className="h-4 w-4 text-primary" /> Spent on which PPA?
      </legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Program" value={program} onChange={(e) => onChange({ program: e.target.value, project: '', activity: '' })}>
          <option value="">{programsQ.isLoading ? 'Loading…' : '— Not for a PPA —'}</option>
          {programs.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
        </Select>
        <Select label="Project (optional)" value={project} disabled={!program} onChange={(e) => onChange({ program, project: e.target.value, activity: '' })}>
          <option value="">{program ? '— Whole program —' : 'Choose a program'}</option>
          {(projectsQ.data || []).map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
        </Select>
        <Select label="Activity (optional)" value={activity} disabled={!project} onChange={(e) => onChange({ program, project, activity: e.target.value })}>
          <option value="">{project ? '— Whole project —' : 'Choose a project'}</option>
          {(activitiesQ.data || []).map((a) => <option key={a._id} value={a._id}>{a.title}</option>)}
        </Select>
      </div>
      {hint && <p className="mt-2 text-xs text-subtle">Linking the expense to its PPA is what makes it show in Budget Utilization once approved.</p>}
    </fieldset>
  );
}
