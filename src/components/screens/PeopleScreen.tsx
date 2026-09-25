import { useState } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Check,
  Users,
} from 'lucide-react';
import type { Person, Role, Availability } from '../../types';
import {
  LevelBar,
  AvailabilityBadge,
  RoleBadge,
  SkillTag,
} from '../Badges';

interface PeopleScreenProps {
  people: Person[];
  onAdd: (person: Omit<Person, 'id'> & { id?: string }) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Person, 'id'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FormState {
  name: string;
  role: Role;
  level: number;
  availability: Availability;
  skills: string[];
}

const emptyForm: FormState = {
  name: '',
  role: 'employee',
  level: 3,
  availability: 'available',
  skills: [],
};

export default function PeopleScreen({
  people,
  onAdd,
  onUpdate,
  onDelete,
}: PeopleScreenProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  };

  const openEditForm = (person: Person) => {
    setForm({
      name: person.name,
      role: person.role,
      level: person.level,
      availability: person.availability,
      skills: [...person.skills],
    });
    setEditingId(person.id);
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSkillInput('');
    setError(null);
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      setForm({ ...form, skills: [...form.skills, skill] });
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await onUpdate(editingId, {
          name: form.name.trim(),
          role: form.role,
          level: form.level,
          availability: form.availability,
          skills: form.skills,
        });
      } else {
        await onAdd({
          name: form.name.trim(),
          role: form.role,
          level: form.level,
          availability: form.availability,
          skills: form.skills,
        });
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save person');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await onDelete(id);
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">People Directory</h2>
          <p className="mt-1 text-sm text-slate-400">
            Add, edit, and remove team members. People you add here are
            available for work item assignments.
          </p>
        </div>
        <button
          onClick={openAddForm}
          disabled={showForm}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-400 to-primary-600 px-4 py-2 text-sm font-medium text-ink-700 transition-all hover:from-primary-300 hover:to-primary-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50"
        >
          <UserPlus size={16} />
          Add Person
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-300">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">
              {editingId ? 'Edit Person' : 'Add New Person'}
            </h3>
            <button
              onClick={closeForm}
              aria-label="Close form"
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-ink-200 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-400">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jane Smith"
                className="mt-1 w-full rounded-lg border border-ink-200 bg-ink-500 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="mt-1 w-full rounded-lg border border-ink-200 bg-ink-500 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="employee">Employee</option>
                <option value="contractor">Contractor</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Skill Level (1-5)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  className="flex-1 accent-primary-500"
                />
                <LevelBar level={form.level} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Availability
              </label>
              <select
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value as Availability })}
                className="mt-1 w-full rounded-lg border border-ink-200 bg-ink-500 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="available">Available</option>
                <option value="partially">Partially Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-slate-400">
              Skills
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
                className="flex-1 rounded-lg border border-ink-200 bg-ink-500 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                onClick={addSkill}
                type="button"
                className="rounded-lg border border-ink-200 bg-ink-300 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-200"
              >
                Add
              </button>
            </div>
            {form.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.skills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => removeSkill(skill)}
                    type="button"
                    className="group inline-flex items-center gap-1"
                  >
                    <SkillTag skill={skill} />
                    <X
                      size={12}
                      className="text-slate-500 transition-colors group-hover:text-danger-400"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={closeForm}
              className="rounded-lg border border-ink-200 bg-ink-300 px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:bg-ink-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-ink-700 transition-all hover:bg-primary-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {editingId ? 'Save Changes' : 'Add Person'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {people.length === 0 && !showForm ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-200 bg-ink-300 shadow-md shadow-black/20">
            <Users size={32} className="text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-slate-200">
            No people yet
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Add your first team member to start assigning work items.
          </p>
          <button
            onClick={openAddForm}
            className="btn-primary mt-5"
          >
            <span className="flex items-center gap-2">
              <UserPlus size={16} />
              Add Person
            </span>
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((person) => {
            const isDeleting = deleteConfirm === person.id;
            return (
              <div
                key={person.id}
                className="card card-hover p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {person.name}
                      </span>
                      <RoleBadge role={person.role} />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <LevelBar level={person.level} />
                      <AvailabilityBadge status={person.availability} />
                    </div>
                    {person.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {person.skills.map((skill) => (
                          <SkillTag key={skill} skill={skill} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEditForm(person)}
                      disabled={isDeleting || saving}
                      title="Edit"
                      aria-label={`Edit ${person.name}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-ink-200 hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50"
                    >
                      <Pencil size={16} />
                    </button>
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(person.id)}
                          disabled={saving}
                          className="rounded-lg bg-danger-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-danger-700 disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            'Delete'
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          aria-label="Cancel delete"
                          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-ink-200 hover:text-slate-200"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(person.id)}
                        disabled={saving}
                        title="Delete"
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-ink-200 hover:text-danger-400 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
